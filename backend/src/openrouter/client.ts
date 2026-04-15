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
  let lastError = "Generation failed with all available free models.";
  let lastRawResponse: any = null;
  let lastModel = FREE_MODELS[0];
  let lastQuestions: GeneratedQuestion[] | null = null;

  for (let attempt = 0; attempt < FREE_MODELS.length; attempt++) {
    // Select the next free model via round-robin
    const model = FREE_MODELS[currentModelIndex];
    currentModelIndex = (currentModelIndex + 1) % FREE_MODELS.length;
    lastModel = model;
    
    const systemPrompt = `You are an expert technical interviewer. Generate exactly ${count} interview questions for a ${role} position at ${difficulty} difficulty.
The questions should cover these topics: ${topics.join(", ")}.
Return the result strictly as a JSON array of exactly ${count} objects. Do not include markdown formatting or backticks around the JSON.
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
        { role: "user", content: `Generate exactly ${count} questions now.` }
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
          "HTTP-Referer": "http://localhost:5173", // Required by OR
          "X-Title": "InterviewAI" // Required by OR
        },
        body: JSON.stringify(payload)
      });
    } catch (networkErr: any) {
      lastError = `Network error calling OpenRouter: ${networkErr.message}`;
      console.warn(`Model ${model} failed:`, lastError);
      
      // If we are on the LAST attempt, return whatever we successfully salvaged earlier (if anything)
      if (attempt === FREE_MODELS.length - 1 && lastQuestions && lastQuestions.length > 0) {
        return { questions: lastQuestions, rawResponse: lastRawResponse, model: lastModel };
      }
      continue;
    }

    const curlCommand = `curl -X POST ${url.toString()} \\
    -H "Authorization: Bearer REDACTED" \\
    -H "Content-Type: application/json" \\
    -H "HTTP-Referer: http://localhost:5173" \\
    -H "X-Title: InterviewAI" \\
    -d '${JSON.stringify(payload).replace(/'/g, "'\\''")}'`;
    
    const textResponse = await res.text();
    let rawResponse;
    
    try {
      rawResponse = JSON.parse(textResponse);
    } catch (e) {
      // If it's not JSON, log it so we can see what the API actually returned
      console.error(`OpenRouter Non-JSON response from ${model}:`, textResponse);
      rawResponse = textResponse;
    }
    lastRawResponse = rawResponse;

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
      lastError = rawResponse?.error?.message || `OpenRouter API error from ${model}`;
      console.warn(lastError);
      
      // If we are on the LAST attempt, return whatever we successfully salvaged earlier (if anything)
      if (attempt === FREE_MODELS.length - 1 && lastQuestions && lastQuestions.length > 0) {
        return { questions: lastQuestions, rawResponse: lastRawResponse, model: lastModel };
      }
      continue;
    }

    if (typeof rawResponse === "string") {
      lastError = `OpenRouter returned an invalid HTML/text response. They might be overloaded. Model: ${model}`;
      console.warn(lastError);
      
      // If we are on the LAST attempt, return whatever we successfully salvaged earlier (if anything)
      if (attempt === FREE_MODELS.length - 1 && lastQuestions && lastQuestions.length > 0) {
        return { questions: lastQuestions, rawResponse: lastRawResponse, model: lastModel };
      }
      continue;
    }

    try {
      const content = rawResponse.choices?.[0]?.message?.content;
      if (!content) {
          lastError = `OpenRouter returned an empty response. Model: ${model}`;
          console.warn(lastError);
          continue;
      }
      let questions: any;
      
      // Clean markdown if the model ignored the instruction
      let cleanContent = content.trim();
      if (cleanContent.startsWith("\`\`\`json")) cleanContent = cleanContent.slice(7);
      if (cleanContent.startsWith("\`\`\`")) cleanContent = cleanContent.slice(3);
      if (cleanContent.endsWith("\`\`\`")) cleanContent = cleanContent.slice(0, -3);
      
      // Fix: Nemotron often adds a trailing comma before the closing brace/bracket which makes JSON.parse fail
      cleanContent = cleanContent.replace(/,\s*([}\]])/g, '$1');

      // Fix: Sometimes models (like Nemotron) return consecutive objects separated by a comma
      // but forget to wrap them in an outer array bracket [ ... ]
      if (cleanContent.trim().startsWith('{') && cleanContent.trim().endsWith('}') && cleanContent.includes('},{')) {
        // It might be formatted as { ... } , { ... } instead of [ { ... } , { ... } ]
        cleanContent = `[${cleanContent}]`;
      }

      try {
        questions = JSON.parse(cleanContent);
      } catch (e: any) {
        // Instead of strict parsing which fails on partial text, 
        // try to extract ALL objects matching our schema using regex
        const matches = cleanContent.match(/\{[\s\S]*?\}/g);
        if (matches && matches.length > 0) {
          questions = matches.map((m: string) => {
            try {
              return JSON.parse(m);
            } catch {
              return null;
            }
          }).filter((q: any) => q !== null && q.questionText && q.expectedPoints);
          
          if (questions.length === 0) throw e;
        } else {
          throw e;
        }
      }
      
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

      // VITAL CHECK: Did the model actually generate enough questions?
      if (questions.length < count) {
         lastError = `Model ${model} only returned ${questions.length} questions instead of ${count}.`;
         console.warn(lastError);
         
         // Keep the best attempt so far (the one with the most questions)
         if (!lastQuestions || questions.length > lastQuestions.length) {
            lastQuestions = questions as GeneratedQuestion[];
         }
         
         // If we still have models to try, continue loop
         if (attempt < FREE_MODELS.length - 1) {
             continue; // try next model
         } else {
             // If we are on the LAST attempt and it still didn't generate enough,
             // just accept what it gave us so the user doesn't get a completely broken page
             if (lastQuestions && lastQuestions.length > 0) {
               return { questions: lastQuestions, rawResponse, model };
             }
         }
      }
      
      // Ensure we slice if the model generated too many
      return { questions: (questions as GeneratedQuestion[]).slice(0, count), rawResponse, model };
    } catch (err: any) {
      lastError = `Failed to parse JSON response from ${model}: ${err.message}`;
      console.warn(lastError);
      
      // If we are on the LAST attempt, return whatever we successfully salvaged earlier (if anything)
      if (attempt === FREE_MODELS.length - 1 && lastQuestions && lastQuestions.length > 0) {
        return { questions: lastQuestions, rawResponse: lastRawResponse, model: lastModel };
      }
      
      continue;
    }
  }

  // If we get here, it means we exhausted all free models and they ALL failed.
  // However, if we managed to generate at least SOME questions from the last attempt,
  // we should return those instead of crashing entirely.
  if (lastQuestions && lastQuestions.length > 0) {
    return { questions: lastQuestions, rawResponse: lastRawResponse, model: lastModel };
  }

  return { rawResponse: lastRawResponse, model: lastModel, error: lastError };
}

