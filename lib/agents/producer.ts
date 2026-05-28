// Phase 3: Producer Agent — Smallest.ai (voiceover) + Kling 3.0 (video clips)
// DeepSeek writes the 30-second script, then triggers media APIs in parallel.

import OpenAI from "openai";
import { AgentState } from "../types";

const deepseek = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: process.env.DEEPSEEK_API_KEY!,
});

// ── Script generation ──────────────────────────────────────────────────────

async function generateVideoScript(state: AgentState): Promise<string> {
  const res = await deepseek.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      {
        role: "system",
        content: `You are a video scriptwriter. Write a punchy 30-second product demo script (approx 75 words).
Format as plain text with natural pauses indicated by "..." — no stage directions, no scene headings.`,
      },
      {
        role: "user",
        content: `Brand: ${JSON.stringify(state.brandIdentity)}\nProduct doc summary: ${state.productDoc?.slice(0, 600)}`,
      },
    ],
    temperature: 0.8,
  });
  return res.choices[0].message.content ?? "";
}

// ── Voiceover: Smallest.ai Waves API ──────────────────────────────────────

async function generateVoiceover(script: string): Promise<string> {
  if (!process.env.SMALLEST_AI_API_KEY) {
    return "https://placeholder.audio/voiceover.mp3";
  }

  const res = await fetch("https://waves.smallest.ai/api/v1/tts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SMALLEST_AI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: script,
      voice_id: "en_male_professional",
      output_format: "mp3",
      speed: 1.0,
    }),
  });

  if (!res.ok) {
    throw new Error(`Smallest.ai TTS failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  // API returns { audio_url: string } or { url: string }
  return data.audio_url ?? data.url;
}

// ── Video clips: Kling 3.0 API ────────────────────────────────────────────

async function generateVideoClip(prompt: string, index: number): Promise<string> {
  if (!process.env.KLING_API_KEY) {
    return `https://placeholder.video/clip${index}.mp4`;
  }

  // Kling v1 text-to-video endpoint
  const createRes = await fetch("https://api.klingai.com/v1/videos/text2video", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.KLING_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "kling-v1",
      prompt,
      aspect_ratio: "16:9",
      duration: "5",
    }),
  });

  if (!createRes.ok) {
    throw new Error(`Kling create failed: ${createRes.status}`);
  }

  const { task_id } = await createRes.json();

  // Poll until complete (up to 3 minutes)
  for (let i = 0; i < 36; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const pollRes = await fetch(`https://api.klingai.com/v1/videos/text2video/${task_id}`, {
      headers: { Authorization: `Bearer ${process.env.KLING_API_KEY}` },
    });
    const pollData = await pollRes.json();
    if (pollData.status === "succeed") {
      return pollData.works?.[0]?.resource?.resource ?? pollData.video_url;
    }
    if (pollData.status === "failed") {
      throw new Error(`Kling generation failed for clip ${index}`);
    }
  }
  throw new Error(`Kling timed out for clip ${index}`);
}

function buildClipPrompts(state: AgentState): string[] {
  const brand = state.brandIdentity!;
  const sitemap = state.sitemap ?? [];
  return [
    `Cinematic product reveal: ${brand.name} — ${brand.tagline}. ${brand.tone} mood. 4K, smooth camera.`,
    `People using ${brand.name} app on smartphone, lifestyle setting, ${brand.tone} atmosphere.`,
    `Close-up of ${sitemap[1]?.title ?? "key feature"} in action, clean UI, modern design.`,
    `Brand outro: ${brand.name} logo on ${brand.colors.primary} background, minimal, professional.`,
  ];
}

export async function runProducerAgent(
  state: AgentState,
  emit: (msg: string) => void
): Promise<Partial<AgentState>> {
  emit("Producer: writing 30-second video script...");
  const videoScript = await generateVideoScript(state);

  emit("Producer: generating voiceover with Smallest.ai...");
  const voiceoverUrl = await generateVoiceover(videoScript);

  emit("Producer: generating video clips with Kling 3.0 (this takes ~2 minutes)...");
  const clipPrompts = buildClipPrompts(state);

  // Generate all clips in parallel
  const videoClips = await Promise.all(
    clipPrompts.map((prompt, i) => generateVideoClip(prompt, i).catch(() => `https://placeholder.video/clip${i}.mp4`))
  );

  emit("Producer: done.");
  return {
    videoScript,
    voiceoverUrl,
    videoClips,
    phases: { ...state.phases, media: "done" },
  };
}
