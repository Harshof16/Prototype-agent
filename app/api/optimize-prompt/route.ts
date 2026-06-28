import { NextRequest } from "next/server";
import { auth } from "@/auth";
import OpenAI from "openai";

const groq = new OpenAI({
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY!,
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { idea } = await req.json();
  if (!idea || typeof idea !== "string" || idea.trim().length < 5) {
    return Response.json({ error: "Idea too short" }, { status: 400 });
  }

  const res = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    temperature: 0.6,
    messages: [
      {
        role: "system",
        content: `You are a senior startup strategist and brand copywriter. A founder has typed a rough startup idea. Your job is to enrich it into a sharp, specific brief that will be used to auto-generate a brand identity, landing page, and marketing materials.

Enrich the idea by adding (where not already present):
- The specific target audience (not "everyone" — a real persona with demographics or job role)
- The core pain point being solved (concrete and relatable)
- The key differentiator or unfair advantage
- The business model (subscription, marketplace, one-time purchase, freemium, etc.)
- The emotional tone / brand personality (e.g. playful, trustworthy, premium, bold)

Rules:
- Output a single flowing paragraph of 60–120 words. No lists, no headers, no bullet points.
- Write in present tense as if describing a live, working product.
- Do NOT use hollow marketing words: "revolutionary", "cutting-edge", "disruptive", "game-changing", "innovative".
- Do NOT change the core concept — only make it more specific and vivid.
- Do NOT invent features the founder did not imply.
- If competitor URLs are mentioned, keep them in the output.
- End with ONE sentence describing the brand's tone or visual personality.`,
      },
      {
        role: "user",
        content: `Optimize this startup idea:\n\n"${idea.trim()}"`,
      },
    ],
  });

  const optimized = res.choices[0].message.content?.trim() ?? "";
  if (!optimized) {
    return Response.json({ error: "Model returned empty response" }, { status: 500 });
  }

  return Response.json({ optimized });
}
