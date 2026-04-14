import { Router } from "express";
import { z } from "zod";
import { authRequired } from "../middleware/authRequired";
import { respondError } from "../utils/respondError";
import { createSessionAndQuestions, getSession } from "../../services/sessionService";
import { evaluateAnswer } from "../../services/evaluationService";
import { Session, Question } from "../../db/models";

export const sessionRoutes = Router();

const createSessionSchema = z.object({
  role: z.string().min(2).max(120),
  difficulty: z.enum(["easy", "medium", "hard"]),
  topics: z.array(z.string()).min(1).max(10),
  questionCount: z.number().int().min(1).max(10).default(5),
});

sessionRoutes.post("/sessions", authRequired, async (req, res) => {
  const userId = req.auth?.userId;
  if (!userId) {
    respondError(res, "UNAUTHORIZED", "Unauthorized", 401);
    return;
  }

  try {
    const data = createSessionSchema.parse(req.body);
    const result = await createSessionAndQuestions(
      userId,
      data.role,
      data.difficulty,
      data.topics,
      data.questionCount
    );

    res.status(201).json(result);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      respondError(res, "VALIDATION_ERROR", "Invalid input", 400);
      return;
    }
    respondError(res, "INTERNAL_ERROR", err.message || "Internal server error", 500);
  }
});

sessionRoutes.get("/sessions", authRequired, async (req, res) => {
  const userId = req.auth?.userId;
  if (!userId) {
    respondError(res, "UNAUTHORIZED", "Unauthorized", 401);
    return;
  }

  try {
    const sessions = await Session.findAll({
      where: { userId },
      order: [["createdAt", "DESC"]],
    });
    
    // We also need to fetch questions for these sessions to calculate the score
    const sessionIds = sessions.map(s => s.id);
    const questions = await Question.findAll({
      where: { sessionId: sessionIds, status: "evaluated" }
    });

    const questionsBySessionId = questions.reduce((acc: Record<number, any[]>, q: any) => {
      if (!acc[q.sessionId]) acc[q.sessionId] = [];
      acc[q.sessionId].push(q);
      return acc;
    }, {});

    const sessionsWithStats = sessions.map(session => {
      const sessionQuestions = questionsBySessionId[session.id] || [];
      const evaluatedCount = sessionQuestions.length;
      let averageScore = null;
      
      if (evaluatedCount > 0) {
        const totalScore = sessionQuestions.reduce((sum: number, q: any) => {
          return sum + (q.evaluationJson?.score || 0);
        }, 0);
        averageScore = Math.round((totalScore / evaluatedCount) * 10) / 10;
      }

      return {
        ...session.toJSON(),
        evaluatedCount,
        averageScore
      };
    });

    res.status(200).json({ sessions: sessionsWithStats });
  } catch (err: any) {
    respondError(res, "INTERNAL_ERROR", err.message || "Internal server error", 500);
  }
});

sessionRoutes.get("/sessions/:id", authRequired, async (req, res) => {
  const userId = req.auth?.userId;
  if (!userId) {
    respondError(res, "UNAUTHORIZED", "Unauthorized", 401);
    return;
  }

  try {
    const sessionId = parseInt(req.params.id as string, 10);
    if (isNaN(sessionId)) {
      respondError(res, "VALIDATION_ERROR", "Invalid session ID", 400);
      return;
    }

    const result = await getSession(sessionId, userId);
    if (!result) {
      respondError(res, "NOT_FOUND", "Session not found", 404);
      return;
    }

    res.status(200).json(result);
  } catch (err: any) {
    respondError(res, "INTERNAL_ERROR", err.message || "Internal server error", 500);
  }
});

sessionRoutes.delete("/sessions/:id", authRequired, async (req, res) => {
  const userId = req.auth?.userId;
  if (!userId) {
    respondError(res, "UNAUTHORIZED", "Unauthorized", 401);
    return;
  }

  try {
    const sessionId = parseInt(req.params.id as string, 10);
    if (isNaN(sessionId)) {
      respondError(res, "VALIDATION_ERROR", "Invalid session ID", 400);
      return;
    }

    const session = await Session.findOne({ where: { id: sessionId, userId } });
    if (!session) {
      respondError(res, "NOT_FOUND", "Session not found", 404);
      return;
    }

    // Delete associated questions first (this is now a soft delete)
    await Question.destroy({ where: { sessionId: session.id } });
    // Delete session (this is now a soft delete)
    await session.destroy();

    res.status(200).json({ success: true });
  } catch (err: any) {
    respondError(res, "INTERNAL_ERROR", err.message || "Internal server error", 500);
  }
});

const submitAnswerSchema = z.object({
  answerText: z.string().min(5, "Answer is too short"),
});

sessionRoutes.post("/questions/:id/answer", authRequired, async (req, res) => {
  const userId = req.auth?.userId;
  if (!userId) {
    respondError(res, "UNAUTHORIZED", "Unauthorized", 401);
    return;
  }

  try {
    const questionId = parseInt(req.params.id as string, 10);
    if (isNaN(questionId)) {
      respondError(res, "VALIDATION_ERROR", "Invalid question ID", 400);
      return;
    }

    const data = submitAnswerSchema.parse(req.body);
    const result = await evaluateAnswer(userId, questionId, data.answerText);

    res.status(200).json(result);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      respondError(res, "VALIDATION_ERROR", "Invalid input", 400);
      return;
    }
    respondError(res, "INTERNAL_ERROR", err.message || "Internal server error", 500);
  }
});
