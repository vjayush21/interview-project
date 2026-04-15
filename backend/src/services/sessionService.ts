import { Session, Question } from "../db/models/index.js";
import { generateInterviewQuestions } from "../openrouter/client.js";
import { getDecryptedKey } from "./openrouterCredentialService.js";

export async function createSessionAndQuestions(
  userId: number,
  role: string,
  difficulty: "easy" | "medium" | "hard",
  topics: string[],
  questionTargetCount: number
) {
  // 1. Get user's active OpenRouter key
  const apiKey = await getDecryptedKey(userId);
  if (!apiKey) {
    throw new Error("Missing or invalid OpenRouter API key. Please connect your key.");
  }

  // 2. Create the session in DB
  const session = await Session.create({
    userId,
    role,
    difficulty,
    topicsJson: topics,
    questionTargetCount,
  });

  // 3. Create initial "pending" questions
  const pendingQuestions = await Promise.all(
    Array.from({ length: questionTargetCount }).map(() =>
      Question.create({
        sessionId: session.id,
        status: "pending",
        promptText: `Generate ${questionTargetCount} questions for ${role} at ${difficulty} level on topics: ${topics.join(", ")}`, 
        model: "google/gemini-2.5-flash-pro-preview",
      })
    )
  );

  // 4. Generate questions via OpenRouter
  const generation = await generateInterviewQuestions(apiKey, role, difficulty, topics, questionTargetCount);

  if (generation.error || !generation.questions || generation.questions.length === 0) {
    // Mark questions as failed
    await Promise.all(
      pendingQuestions.map((q) =>
        q.update({
          status: "failed",
          openrouterRawResponseJson: generation.rawResponse,
          model: generation.model || "google/gemini-2.5-flash-pro-preview",
        })
      )
    );
    
    // Add context to the error so the user knows it's an upstream OpenRouter issue
    const errorMessage = generation.error 
      ? `OpenRouter Free Tier Error: ${generation.error}` 
      : "Failed to generate questions due to upstream provider error.";
      
    throw new Error(errorMessage);
  }

  // 5. Update questions with generated data
  const readyQuestions = await Promise.all(
    pendingQuestions.map(async (q, i) => {
      const generated = generation.questions![i];
      
      // If the model gave us fewer questions than we asked for, delete the extra "pending" rows
      if (!generated) {
        await q.destroy(); // Soft delete the extra question
        return null;
      }

      return q.update({
        status: "ready",
        questionText: generated.questionText,
        topic: generated.topic,
        difficulty: generated.difficulty,
        expectedPointsJson: generated.expectedPoints || [],
        timeboxSeconds: generated.timeboxSeconds,
        openrouterRawResponseJson: i === 0 ? generation.rawResponse : null, // store raw response only on the first question to save space
        model: generation.model,
      });
    })
  );

  // Filter out the nulls (the ones we deleted)
  const validQuestions = readyQuestions.filter(q => q !== null);

  // Update the session's target count so the dashboard "X / Y answered" progress bar still works correctly
  if (validQuestions.length < questionTargetCount) {
    await session.update({ questionTargetCount: validQuestions.length });
  }

  return { session: session.toJSON(), questions: validQuestions.map(q => q.toJSON()) };
}

export async function getSession(sessionId: number, userId: number) {
  const session = await Session.findOne({
    where: { id: sessionId, userId },
  });
  if (!session) return null;

  const questions = await Question.findAll({
    where: { sessionId: session.id },
    order: [["id", "ASC"]],
  });

  return { session, questions };
}
