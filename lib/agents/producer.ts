// Phase 3: Producer Agent — Smallest.ai (voiceover) + Kling 3.0 (video clips)
// Llama 3.3 via Groq writes the 30-second script, then triggers media APIs in parallel.

import OpenAI from "openai";
import { AgentState } from "../types";

const groq = new OpenAI({
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY!,
});

// ── Script generation ──────────────────────────────────────────────────────

async function generateVideoScript(state: AgentState): Promise<string> {
  const res = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content: `You are a video scriptwriter. Write a punchy 15-second product demo script (approx 30 words, strictly under 280 characters total).
Format as plain text with natural pauses indicated by "..." — no stage directions, no scene headings. Output ONLY the script text, nothing else.`,
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

  const res = await fetch("https://waves-api.smallest.ai/api/v1/lightning/get_speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SMALLEST_AI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: script.length > 280 ? script.slice(0, 280).replace(/\s\S*$/, "") : script,
      voice_id: "emily",
      sample_rate: 24000,
      speed: 1.0,
      add_wav_header: true,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Smallest.ai TTS failed: ${res.status} ${errText}`);
  }

  const contentType = res.headers.get("content-type") ?? "";

  // JSON response: extract URL field
  if (contentType.includes("application/json")) {
    const data = await res.json();
    return data.audio_url ?? data.url;
  }

  // Lightning endpoint returns raw audio bytes — encode as data URI for the stitcher
  const audioBuffer = await res.arrayBuffer();
  const audioBase64 = Buffer.from(audioBuffer).toString("base64");
  return `data:audio/wav;base64,${audioBase64}`;
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

  emit(`Producer: script ready — "${videoScript}"`);
  emit("Producer: generating voiceover with Smallest.ai...");
  let voiceoverUrl: string | undefined;
  try {
    voiceoverUrl = await generateVoiceover(videoScript);
    emit("Producer: voiceover generated.");
  } catch (e: unknown) {
    emit(`Producer: voiceover failed — ${(e as Error).message}`);
  }

  emit("Producer: generating video clips with Kling 3.0 (this takes ~2 minutes)...");
  const clipPrompts = buildClipPrompts(state);

  // Generate all clips in parallel; collect results and surface per-clip failures
  const clipResults = await Promise.allSettled(
    clipPrompts.map((prompt, i) => generateVideoClip(prompt, i))
  );

  const videoClips: string[] = [];
  for (let i = 0; i < clipResults.length; i++) {
    const result = clipResults[i];
    if (result.status === "fulfilled") {
      videoClips.push(result.value);
    } else {
      emit(`Producer: clip ${i + 1} failed — ${result.reason?.message ?? result.reason}`);
    }
  }

  if (!voiceoverUrl && videoClips.length === 0) {
    throw new Error("Both voiceover and all Kling video clips failed — no media generated");
  }

  const clipsOk = videoClips.length > 0;
  if (!clipsOk) {
    emit("Producer: no video clips — stitching will be skipped.");
  }

  emit(`Producer: done (voiceover: ${voiceoverUrl ? "ok" : "failed"}, clips: ${videoClips.length}/${clipPrompts.length}).`);
  return {
    videoScript,
    voiceoverUrl,
    videoClips,
    phases: { ...state.phases, media: clipsOk ? "done" : "error" },
  };
}
