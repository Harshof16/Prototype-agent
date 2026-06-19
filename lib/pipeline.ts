// LangGraph-style pipeline orchestrator
// Manages shared AgentState and routes between phases.
// Each node is a pure async function that receives state and returns a partial update.

import { AgentState, PhaseStatus, StreamEvent } from "./types";
import { runStrategistAgent } from "./agents/strategist";
import { runBuilderAgent } from "./agents/builder";
import { runProducerAgent } from "./agents/producer";
import { runStitcherAgent } from "./agents/stitcher";
import { randomUUID } from "crypto";

export function createInitialState(rawIdea: string, theme?: string): AgentState {
  return {
    rawIdea,
    theme,
    sessionId: randomUUID(),
    codeFixAttempts: 0,
    phases: {
      strategy: "pending",
      website: "pending",
      media: "pending",
      stitching: "pending",
    },
    logs: [],
  };
}

export async function* runPipeline(rawIdea: string, tier: string = "FREE", theme?: string): AsyncGenerator<StreamEvent> {
  let state = createInitialState(rawIdea, theme);

  function emit(message: string): void {
    state.logs.push(message);
  }

  // Emit helper that also yields the event
  // We buffer events and flush them as the generator advances
  const eventQueue: StreamEvent[] = [];

  let currentPhase: keyof AgentState["phases"] = "strategy";

  function log(message: string) {
    emit(message);
    eventQueue.push({ type: "log", phase: currentPhase, message });
  }

  async function* flushQueue(): AsyncGenerator<StreamEvent> {
    while (eventQueue.length > 0) {
      yield eventQueue.shift()!;
    }
  }

  // ── Phase 1: Strategy ────────────────────────────────────────────────────
  currentPhase = "strategy";
  state.phases.strategy = "running";
  yield { type: "phase", phase: "strategy", status: "running", message: "Starting strategy phase..." };

  try {
    const strategyUpdate = await runStrategistAgent(state, log);
    state = { ...state, ...strategyUpdate };
    yield* flushQueue();
    // Emit brand draft immediately so UI can display it without waiting for later phases
    yield { type: "phase", phase: "strategy", status: "done", state: { brandIdentity: state.brandIdentity, sitemap: state.sitemap, productDoc: state.productDoc } };
  } catch (e: unknown) {
    yield* flushQueue();
    // Strategy is required — nothing to show without it
    yield { type: "error", message: `Strategy failed: ${(e as Error).message}` };
    return;
  }

  // ── Phase 2: Website ─────────────────────────────────────────────────────
  currentPhase = "website";
  state.phases.website = "running";
  yield { type: "phase", phase: "website", status: "running", message: "Building website..." };

  let websiteFailed = false;
  try {
    const builderUpdate = await runBuilderAgent(state, log);
    state = { ...state, ...builderUpdate };
    yield* flushQueue();
    // Stream website artifact immediately — don't wait for media/video
    yield {
      type: "artifact",
      artifact: { type: "website", url: "data:text/html;base64," + Buffer.from(state.websiteCode ?? "").toString("base64"), label: "Generated Website Code" },
    };
    yield { type: "phase", phase: "website", status: "done" };
  } catch (e: unknown) {
    yield* flushQueue();
    websiteFailed = true;
    yield { type: "phase", phase: "website", status: "error" as PhaseStatus };
    yield { type: "log", phase: "website", message: `Website build failed: ${(e as Error).message}` };
  }

  // ── Phases 3 & 4: Media + Stitching (paid plans only) ───────────────────
  if (tier === "FREE") {
    yield { type: "log", phase: "media", message: "Media and video generation is available on paid plans. Upgrade to unlock voiceover and promo video." };
    yield { type: "phase", phase: "media", status: "pending" };
    yield { type: "phase", phase: "stitching", status: "pending" };
  } else {
    currentPhase = "media";
    state.phases.media = "running";
    yield { type: "phase", phase: "media", status: "running", message: "Generating media assets..." };

    let mediaFailed = false;
    try {
      const producerUpdate = await runProducerAgent(state, log);
      state = { ...state, ...producerUpdate };
      yield* flushQueue();
      if (state.videoScript) {
        yield { type: "artifact", artifact: { type: "script", url: "data:text/plain;charset=utf-8," + encodeURIComponent(state.videoScript), label: "Video Script" } };
      }
      if (state.voiceoverUrl) {
        yield { type: "artifact", artifact: { type: "voiceover", url: state.voiceoverUrl, label: "Voiceover Audio" } };
      }
      const noClips = !state.videoClips?.length;
      if (noClips) mediaFailed = true;
      yield { type: "phase", phase: "media", status: noClips ? "error" as PhaseStatus : "done" };
    } catch (e: unknown) {
      yield* flushQueue();
      mediaFailed = true;
      yield { type: "phase", phase: "media", status: "error" as PhaseStatus };
      yield { type: "log", phase: "media", message: `Media generation failed: ${(e as Error).message}` };
    }

    currentPhase = "stitching";
    state.phases.stitching = "running";
    yield { type: "phase", phase: "stitching", status: "running", message: "Stitching final video..." };

    try {
      if (mediaFailed) throw new Error("Skipped: media phase did not complete");
      const stitcherUpdate = await runStitcherAgent(state, log);
      state = { ...state, ...stitcherUpdate };
      yield* flushQueue();
      if (state.finalVideoUrl) {
        yield { type: "artifact", artifact: { type: "video", url: state.finalVideoUrl, label: "Final Stitched Video" } };
      } else if (state.videoClips?.length) {
        for (let i = 0; i < state.videoClips.length; i++) {
          const label = state.videoClipLabels?.[i] ?? `Video Clip ${i + 1}`;
          yield { type: "artifact", artifact: { type: "video", url: state.videoClips[i], label } };
        }
      }
      yield { type: "phase", phase: "stitching", status: state.finalVideoUrl || state.videoClips?.length ? "done" : "error" as PhaseStatus };
    } catch (e: unknown) {
      yield* flushQueue();
      yield { type: "phase", phase: "stitching", status: "error" as PhaseStatus };
      yield { type: "log", phase: "stitching", message: `Stitching failed: ${(e as Error).message}` };
      if (state.videoClips?.length) {
        for (let i = 0; i < state.videoClips.length; i++) {
          const label = state.videoClipLabels?.[i] ?? `Video Clip ${i + 1}`;
          yield { type: "artifact", artifact: { type: "video", url: state.videoClips[i], label } };
        }
      }
    }
  }

  // Suppress unused variable warnings — these track whether we got partial results
  void websiteFailed;

  yield {
    type: "done",
    message: "Pipeline complete!",
    state: {
      brandIdentity: state.brandIdentity,
      sitemap: state.sitemap,
      productDoc: state.productDoc,
      websiteCode: state.websiteCode,
      videoScript: state.videoScript,
      voiceoverUrl: state.voiceoverUrl,
      videoClips: state.videoClips,
      finalVideoUrl: state.finalVideoUrl,
    },
  };
}
