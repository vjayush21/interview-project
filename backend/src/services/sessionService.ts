import { Session, Question } from "../db/models";
import { generateInterviewQuestions } from "../openrouter/client";
import { getDecryptedKey } from "./openrouterCredentialService";

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

  if (generation.error || !generation.questions) {
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
    throw new Error(generation.error || "Failed to generate questions");
  }

  // 5. Update questions with generated data
  const readyQuestions = await Promise.all(
    pendingQuestions.map(async (q, i) => {
      const generated = generation.questions![i];
      if (!generated) return q.update({ status: "failed" }); // if less questions generated

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

  return { session: session.toJSON(), questions: readyQuestions.map(q => q.toJSON()) };
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
