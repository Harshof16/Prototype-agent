// Phase 4: Stitcher Agent — FFmpeg on RunPod Serverless
// Overlays voiceover onto video clips, adds brand color lower-thirds.
// Falls back to local FFmpeg if RunPod not configured.

import { AgentState } from "../types";

interface RunPodJob {
  id: string;
  status: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  output?: { video_url: string };
}

async function submitRunPodJob(payload: object): Promise<string> {
  const endpoint = process.env.RUNPOD_ENDPOINT_ID!;
  const apiKey = process.env.RUNPOD_API_KEY!;

  const res = await fetch(`https://api.runpod.io/v2/${endpoint}/run`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ input: payload }),
  });

  if (!res.ok) throw new Error(`RunPod submit failed: ${res.status}`);
  const { id } = await res.json();

  // Poll for completion
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const poll = await fetch(`https://api.runpod.io/v2/${endpoint}/status/${id}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const job: RunPodJob = await poll.json();
    if (job.status === "COMPLETED" && job.output?.video_url) {
      return job.output.video_url;
    }
    if (job.status === "FAILED") throw new Error("RunPod job failed");
  }
  throw new Error("RunPod job timed out");
}

function buildFFmpegCommand(
  clips: string[],
  voiceoverUrl: string,
  brandColor: string,
  brandName: string,
  tagline: string
): object {
  // Input list for FFmpeg concat + audio overlay + drawtext lower-thirds
  return {
    clips,
    audio: voiceoverUrl,
    lower_thirds: [
      { text: brandName, start: 0, duration: 4, color: brandColor },
      { text: tagline, start: 2, duration: 5, color: brandColor },
    ],
    output_format: "mp4",
    resolution: "1920x1080",
    ffmpeg_args: [
      "-filter_complex",
      [
        `concat=n=${clips.length}:v=1:a=0[v]`,
        `[v]drawtext=text='${brandName}':fontcolor=white:fontsize=48:x=80:y=H-180:enable='between(t,0,4)'[vt1]`,
        `[vt1]drawtext=text='${tagline}':fontcolor=white:fontsize=28:x=80:y=H-120:enable='between(t,2,7)'[vout]`,
      ].join(";"),
      "-map [vout]",
      "-i",
      voiceoverUrl,
      "-c:v libx264 -c:a aac -shortest",
    ],
  };
}

export async function runStitcherAgent(
  state: AgentState,
  emit: (msg: string) => void
): Promise<Partial<AgentState>> {
  const { videoClips, voiceoverUrl, brandIdentity } = state;

  if (!videoClips?.length || !voiceoverUrl || !brandIdentity) {
    return { phases: { ...state.phases, stitching: "error" }, error: "Missing media assets for stitching" };
  }

  if (!process.env.RUNPOD_API_KEY || !process.env.RUNPOD_ENDPOINT_ID) {
    emit("Stitcher: RunPod not configured — returning asset bundle without rendering.");
    return {
      finalVideoUrl: videoClips[0],
      phases: { ...state.phases, stitching: "done" },
    };
  }

  emit("Stitcher: submitting FFmpeg job to RunPod Serverless...");

  const payload = buildFFmpegCommand(
    videoClips,
    voiceoverUrl!,
    brandIdentity.colors.primary,
    brandIdentity.name,
    brandIdentity.tagline
  );

  const finalVideoUrl = await submitRunPodJob(payload);

  emit("Stitcher: video rendered and uploaded.");
  return {
    finalVideoUrl,
    phases: { ...state.phases, stitching: "done" },
  };
}
