import { Question } from "../db/models";
import { getDecryptedKey } from "./openrouterCredentialService";
import { env } from "../config/env";
import { Sitelog } from "../db/models";

const FREE_MODELS = [
  "mistralai/mistral-7b-instruct:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
];
let currentModelIndex = 0;

export async function evaluateAnswer(userId: number, questionId: number, answerText: string) {
  const question = await Question.findByPk(questionId);
  if (!question) throw new Error("Question not found");

  if (question.status === "evaluated") {
    throw new Error("Question already evaluated");
  }

  // Save the answer and update status
  await question.update({ answerText, status: "answered" });

  const apiKey = await getDecryptedKey(userId);
  if (!apiKey) {
    throw new Error("Missing or invalid OpenRouter API key. Please connect your key.");
  }

  const systemPrompt = `You are an expert technical interviewer evaluating a candidate's answer.
Question: ${question.questionText}
Topic: ${question.topic || 'General'}
Difficulty: ${question.difficulty || 'Medium'}
Expected Points to Cover:
${question.expectedPointsJson ? question.expectedPointsJson.map(p => '- ' + p).join('\n') : '- N/A'}

Candidate's Answer:
${answerText}

Evaluate the candidate's answer based on the expected points. Be constructive and concise.
Return the result strictly as a JSON object matching this schema (do not include markdown formatting):
{
  "score": number, // out of 10
  "feedback": "string", // General feedback on the answer
  "improvement": "string" // What they could have done better or missed
}`;

  const url = new URL("chat/completions", env.OPENROUTER_BASE_URL + (env.OPENROUTER_BASE_URL.endsWith('/') ? '' : '/'));
  
  let lastError = "Evaluation failed with all available free models.";

  for (let attempt = 0; attempt < FREE_MODELS.length; attempt++) {
    const model = FREE_MODELS[currentModelIndex];
    currentModelIndex = (currentModelIndex + 1) % FREE_MODELS.length;

    const payload = {
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Evaluate the answer now." }
      ],
      response_format: { type: "json_object" }
    };

    let res;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:5173",
          "X-Title": "InterviewAI"
        },
        body: JSON.stringify(payload)
      });
    } catch (networkErr: any) {
      lastError = `Network error calling OpenRouter: ${networkErr.message}`;
      console.warn(`Model ${model} failed:`, lastError);
      continue;
    }

    const textResponse = await res.text();
    let rawResponse;
    
    try {
      rawResponse = JSON.parse(textResponse);
    } catch (e) {
      rawResponse = textResponse;
    }

    // Save sitelog async
    Sitelog.create({
      type_id: "openrouter",
      type: "api_call",
      function_name: "evaluateAnswer",
      created_by_id: userId.toString(),
      reference_id: `question_${question.id}`,
      metadata: JSON.stringify({ request: payload }),
      remarks: typeof rawResponse === "string" ? rawResponse : JSON.stringify(rawResponse),
    }).catch((e) => console.error("Failed to save sitelog:", e));

    if (!res.ok) {
      lastError = rawResponse?.error?.message || `OpenRouter API error during evaluation with model ${model}`;
      console.warn(`Model ${model} returned non-OK:`, lastError);
      continue;
    }

    if (typeof rawResponse === "string") {
      lastError = `OpenRouter returned an invalid HTML/text response. Model: ${model}`;
      console.warn(lastError);
      continue;
    }

    try {
      const content = rawResponse.choices?.[0]?.message?.content;
      if (!content) {
          lastError = `OpenRouter returned an empty response. Model: ${model}`;
          console.warn(lastError);
          continue;
      }
      
      let cleanContent = content.trim();
      if (cleanContent.startsWith("\`\`\`json")) cleanContent = cleanContent.slice(7);
      if (cleanContent.startsWith("\`\`\`")) cleanContent = cleanContent.slice(3);
      if (cleanContent.endsWith("\`\`\`")) cleanContent = cleanContent.slice(0, -3);
      cleanContent = cleanContent.replace(/,\s*([}\]])/g, '$1');

      const evaluationJson = JSON.parse(cleanContent);
      
      await question.update({
        evaluationJson,
        status: "evaluated"
      });

      return question.toJSON();
    } catch (err: any) {
      lastError = `Failed to parse evaluation JSON response from ${model}: ${err.message}`;
      console.warn(lastError);
      continue;
    }
  }

  // If we exhaust the loop, throw the last recorded error
  throw new Error(lastError);
}
