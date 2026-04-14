import { env } from "../config/env.js";
import { Sitelog } from "../db/models/index.js";

export async function verifyOpenRouterApiKey(apiKey: string) {
  const url = new URL("models", env.OPENROUTER_BASE_URL + (env.OPENROUTER_BASE_URL.endsWith('/') ? '' : '/'));
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`
    }
  });

  if (!res.ok) {
    return { valid: false as const, status: res.status };
  }

  return { valid: true as const };
}

export interface GeneratedQuestion {
  questionText: string;
  topic: string;
  difficulty: "easy" | "medium" | "hard";
  expectedPoints: string[];
  timeboxSeconds: number;
}

let currentModelIndex = 0;
const FREE_MODELS = [
  "nvidia/nemotron-3-super-120b-a12b:free",
  "mistralai/mistral-7b-instruct:free",
  "meta-llama/llama-3.3-70b-instruct:free",
];

export async function generateInterviewQuestions(
  apiKey: string,
  role: string,
  difficulty: string,
  topics: string[],
  count: number
): Promise<{ questions?: GeneratedQuestion[]; rawResponse: any; model: string; error?: string }> {
  // Select the next free model via round-robin
  const model = FREE_MODELS[currentModelIndex];
  currentModelIndex = (currentModelIndex + 1) % FREE_MODELS.length;
  
  const systemPrompt = `You are an expert technical interviewer. Generate exactly ${count} interview questions for a ${role} position at ${difficulty} difficulty.
The questions should cover these topics: ${topics.join(", ")}.
Return the result strictly as a JSON array of objects. Do not include markdown formatting or backticks around the JSON.
Each object must match this schema:
{
  "questionText": "The actual question",
  "topic": "The primary topic this tests",
  "difficulty": "easy" | "medium" | "hard",
  "expectedPoints": ["point 1 to look for in answer", "point 2"],
  "timeboxSeconds": 120 // Suggested time to answer (e.g. 60, 120, 180)
}`;

  const url = new URL("chat/completions", env.OPENROUTER_BASE_URL + (env.OPENROUTER_BASE_URL.endsWith('/') ? '' : '/'));
  
  const payload = {
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Generate ${count} questions now.` }
    ],
    response_format: { type: "json_object" }
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:5173", // Required by OR
      "X-Title": "InterviewAI" // Required by OR
    },
    body: JSON.stringify(payload)
  });

  const curlCommand = `curl -X POST ${url.toString()} \\
  -H "Authorization: Bearer REDACTED" \\
  -H "Content-Type: application/json" \\
  -H "HTTP-Referer: http://localhost:5173" \\
  -H "X-Title: InterviewAI" \\
  -d '${JSON.stringify(payload).replace(/'/g, "'\\''")}'`;

  console.log("OpenRouter Request:", payload);
  
  const textResponse = await res.text();
  let rawResponse;
  
  try {
    rawResponse = JSON.parse(textResponse);
  } catch (e) {
    // If it's not JSON, log it so we can see what the API actually returned
    console.error("OpenRouter Non-JSON response:", textResponse);
    rawResponse = textResponse;
  }

  // Save sitelog async
  Sitelog.create({
    type_id: "openrouter",
    type: "api_call",
    function_name: "generateInterviewQuestions",
    created_by_id: "system", // Or pass userId down if you want to track it
    reference_id: "session_generation",
    metadata: JSON.stringify({
      request: payload,
      curl: curlCommand,
    }),
    remarks: typeof rawResponse === "string" ? rawResponse : JSON.stringify(rawResponse),
  }).catch((e) => console.error("Failed to save sitelog:", e));

  if (!res.ok) {
    return { rawResponse, model, error: rawResponse?.error?.message || "OpenRouter API error" };
  }

  if (typeof rawResponse === "string") {
    return { rawResponse, model, error: `OpenRouter returned an invalid HTML/text response. They might be overloaded. Model: ${model}` };
  }

  try {
    const content = rawResponse.choices?.[0]?.message?.content;
    if (!content) {
        return { rawResponse, model, error: "OpenRouter returned an empty response. Try again." };
    }
    let questions: any;
    
    // Clean markdown if the model ignored the instruction
    let cleanContent = content.trim();
    if (cleanContent.startsWith("\`\`\`json")) cleanContent = cleanContent.slice(7);
    if (cleanContent.startsWith("\`\`\`")) cleanContent = cleanContent.slice(3);
    if (cleanContent.endsWith("\`\`\`")) cleanContent = cleanContent.slice(0, -3);
    
    // Fix: Nemotron often adds a trailing comma before the closing brace/bracket which makes JSON.parse fail
    cleanContent = cleanContent.replace(/,\s*([}\]])/g, '$1');

    questions = JSON.parse(cleanContent);
    
    // Fix: Sometimes models (like Nemotron) return an object with the array under a specific key, 
    // or return a single object instead of an array if they misunderstood the prompt.
    if (!Array.isArray(questions)) {
       // First check if the object itself is a single question
       if (questions.questionText && questions.expectedPoints) {
           questions = [questions];
       } else {
           // Look for any array of objects inside the parsed object
           const possibleArrays = Object.values(questions).filter(v => Array.isArray(v) && v.length > 0 && typeof v[0] === 'object');
           if (possibleArrays.length > 0) {
               questions = possibleArrays[0];
           } else {
               throw new Error("Result is not an array of questions");
           }
       }
    }
    
    // Ensure we slice if the model generated too many
    return { questions: (questions as GeneratedQuestion[]).slice(0, count), rawResponse, model };
  } catch (err: any) {
    return { rawResponse, model, error: "Failed to parse JSON response: " + err.message };
  }
}

