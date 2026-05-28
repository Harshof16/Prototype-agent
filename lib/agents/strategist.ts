// Phase 1: Strategist Agent — DeepSeek V4 Pro via OpenAI-compatible API
// Generates Brand Identity, Sitemap, and Product Doc, then self-reflects.

import OpenAI from "openai";
import { AgentState, BrandIdentity, SitemapPage } from "../types";

const client = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: process.env.DEEPSEEK_API_KEY!,
});

const MODEL = "deepseek-chat"; // DeepSeek V4 Pro

async function chat(messages: OpenAI.Chat.ChatCompletionMessageParam[], jsonMode = false) {
  const res = await client.chat.completions.create({
    model: MODEL,
    messages,
    response_format: jsonMode ? { type: "json_object" } : { type: "text" },
    temperature: 0.7,
  });
  return res.choices[0].message.content ?? "";
}

export async function runStrategistAgent(
  state: AgentState,
  emit: (msg: string) => void
): Promise<Partial<AgentState>> {
  emit("Strategist: analyzing idea and building brand identity...");

  // Step 1: Generate Brand Identity + Sitemap
  const strategyRaw = await chat(
    [
      {
        role: "system",
        content: `You are a product strategist. Given a raw idea, return a JSON object with:
- brandIdentity: { name, tagline, colors: {primary, secondary, accent}, fonts: {heading, body}, tone, targetAudience }
- sitemap: array of { slug, title, sections: string[] } (4-6 pages)
Return only valid JSON.`,
      },
      {
        role: "user",
        content: `Raw idea: "${state.rawIdea}"`,
      },
    ],
    true
  );

  const strategy = JSON.parse(strategyRaw) as {
    brandIdentity: BrandIdentity;
    sitemap: SitemapPage[];
  };

  emit("Strategist: brand identity created, running reflection loop...");

  // Step 2: Reflection loop — agent reviews its own output
  const reflectionRaw = await chat([
    {
      role: "system",
      content: `You are a critical product reviewer. Review this brand strategy and sitemap for logical flow, completeness, and market fit. Return a JSON object: { approved: boolean, improvements: string[] }`,
    },
    {
      role: "user",
      content: `Brand: ${JSON.stringify(strategy.brandIdentity)}\nSitemap: ${JSON.stringify(strategy.sitemap)}`,
    },
  ]);

  let reflection: { approved: boolean; improvements: string[] };
  try {
    reflection = JSON.parse(reflectionRaw);
  } catch {
    reflection = { approved: true, improvements: [] };
  }

  // Step 3: If not approved, refine once
  let finalStrategy = strategy;
  if (!reflection.approved && reflection.improvements.length > 0) {
    emit(`Strategist: refining based on ${reflection.improvements.length} suggestions...`);
    const refinedRaw = await chat(
      [
        {
          role: "system",
          content: `You are a product strategist. Refine the brand strategy based on the feedback. Return a JSON object with brandIdentity and sitemap keys. Return only valid JSON.`,
        },
        {
          role: "user",
          content: `Original: ${JSON.stringify(strategy)}\nImprovements: ${reflection.improvements.join(", ")}`,
        },
      ],
      true
    );
    finalStrategy = JSON.parse(refinedRaw);
  }

  // Step 4: Generate 5-page Product Doc
  emit("Strategist: generating product document...");
  const productDoc = await chat([
    {
      role: "system",
      content: `You are a technical writer. Write a concise 5-section product document in Markdown:
1. Executive Summary
2. Problem & Solution
3. Target Market
4. Core Features (bullet list)
5. Go-to-Market Strategy
Keep each section 2-3 paragraphs.`,
    },
    {
      role: "user",
      content: `Brand: ${JSON.stringify(finalStrategy.brandIdentity)}\nIdea: ${state.rawIdea}`,
    },
  ]);

  emit("Strategist: done.");
  return {
    brandIdentity: finalStrategy.brandIdentity,
    sitemap: finalStrategy.sitemap,
    productDoc,
    phases: { ...state.phases, strategy: "done" },
  };
}
