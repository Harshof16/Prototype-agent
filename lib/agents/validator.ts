// Idea Validator Agent — Groq Llama 3.3 70B
// Stateless per-turn handler. The client maintains conversation history and
// calls /api/validate on each turn. The server returns the next question or,
// once all 5 topics are covered, the final report.

import OpenAI from "openai";

const MODEL = "llama-3.3-70b-versatile";

function getClient() {
  return new OpenAI({
    baseURL: "https://api.groq.com/openai/v1",
    apiKey: process.env.GROQ_API_KEY!,
  });
}

export interface ValidatorTurn {
  role: "assistant" | "user";
  content: string;
}

export interface ValidationScore {
  marketSize: number;    // 1-10
  competition: number;   // 1-10, 10 = low competition = good
  feasibility: number;   // 1-10
  uniqueness: number;    // 1-10
  monetisation: number;  // 1-10
  overall: number;       // 1-10
}

export interface ValidationReport {
  verdict: "strong" | "promising" | "needs-work" | "risky";
  summary: string;
  strengths: string[];
  risks: string[];
  suggestions: string[];
  scores: ValidationScore;
  competitorExamples: string[];
  targetMarket: string;
  estimatedMarketSize: string;
}

export type ValidatorResponse =
  | { type: "question"; content: string; questionIndex: number; totalQuestions: number }
  | { type: "report"; report: ValidationReport };

const TOPICS = [
  "market_size",
  "competition",
  "feasibility",
  "uniqueness",
  "monetisation",
] as const;

export const TOTAL_QUESTIONS = TOPICS.length;

const QUESTION_SYSTEM = (idea: string, topic: string) => `You are a seasoned startup advisor evaluating this idea: "${idea}".

Your current focus: ${topic.replace(/_/g, " ")}.

Ask ONE sharp, specific question on this topic. Bring in relevant context (real competitor names, market data, technical challenges) to make the question incisive. Be direct — 1-2 sentences maximum. Do not greet, do not preamble, do not answer the question yourself.`;

const REPORT_SYSTEM = (idea: string) => `You are a startup analyst. Based on the conversation that evaluated the idea "${idea}", produce a comprehensive JSON validation report.

Return ONLY a valid JSON object with this exact structure — no markdown, no explanation:
{
  "verdict": "strong" | "promising" | "needs-work" | "risky",
  "summary": "2-3 sentence executive summary of the idea's viability",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "risks": ["risk 1", "risk 2", "risk 3"],
  "suggestions": ["actionable suggestion 1", "actionable suggestion 2", "actionable suggestion 3"],
  "scores": {
    "marketSize": <integer 1-10>,
    "competition": <integer 1-10, where 10 means low competition — good for the founder>,
    "feasibility": <integer 1-10>,
    "uniqueness": <integer 1-10>,
    "monetisation": <integer 1-10>,
    "overall": <integer 1-10>
  },
  "competitorExamples": ["real competitor 1", "real competitor 2", "real competitor 3"],
  "targetMarket": "Concise primary customer description",
  "estimatedMarketSize": "e.g. $2.4B TAM, growing 18% YoY"
}`;

export async function runValidatorTurn(
  idea: string,
  history: ValidatorTurn[]
): Promise<ValidatorResponse> {
  // history alternates assistant (question) / user (answer).
  // Number of complete Q&A pairs = Math.floor(history.length / 2)
  const completedPairs = Math.floor(history.length / 2);

  if (completedPairs < TOPICS.length) {
    // Generate the next question
    const topic = TOPICS[completedPairs];
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: QUESTION_SYSTEM(idea, topic) },
      ...history.map((t) => ({ role: t.role, content: t.content })),
    ];

    const res = await getClient().chat.completions.create({
      model: MODEL,
      temperature: 0.65,
      messages,
    });

    return {
      type: "question",
      content: res.choices[0].message.content?.trim() ?? "Could you tell me more about that?",
      questionIndex: completedPairs,
      totalQuestions: TOPICS.length,
    };
  }

  // All questions answered — generate the final report
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: REPORT_SYSTEM(idea) },
    ...history.map((t) => ({ role: t.role, content: t.content })),
  ];

  const res = await getClient().chat.completions.create({
    model: MODEL,
    temperature: 0.4,
    response_format: { type: "json_object" },
    messages,
  });

  const raw = res.choices[0].message.content ?? "{}";
  const report = JSON.parse(raw) as ValidationReport;

  return { type: "report", report };
}
