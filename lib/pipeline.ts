// LangGraph-style pipeline orchestrator
// Manages shared AgentState and routes between phases.
// Each node is a pure async function that receives state and returns a partial update.

import { AgentState, StreamEvent } from "./types";
import { runStrategistAgent } from "./agents/strategist";
import { runBuilderAgent } from "./agents/builder";
import { runProducerAgent } from "./agents/producer";
import { runStitcherAgent } from "./agents/stitcher";
import { randomUUID } from "crypto";

export function createInitialState(rawIdea: string): AgentState {
  return {
    rawIdea,
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

export async function* runPipeline(rawIdea: string): AsyncGenerator<StreamEvent> {
  let state = createInitialState(rawIdea);

  function emit(message: string): void {
    state.logs.push(message);
  }

  // Emit helper that also yields the event
  // We buffer events and flush them as the generator advances
  const eventQueue: StreamEvent[] = [];

  function log(message: string) {
    emit(message);
    eventQueue.push({ type: "log", message });
  }

  async function* flushQueue(): AsyncGenerator<StreamEvent> {
    while (eventQueue.length > 0) {
      yield eventQueue.shift()!;
    }
  }

  // ── Phase 1: Strategy ────────────────────────────────────────────────────
  state.phases.strategy = "running";
  yield { type: "phase", phase: "strategy", status: "running", message: "Starting strategy phase..." };

  try {
    const strategyUpdate = await runStrategistAgent(state, log);
    state = { ...state, ...strategyUpdate };
    yield* flushQueue();
    yield { type: "phase", phase: "strategy", status: "done", state: { brandIdentity: state.brandIdentity, sitemap: state.sitemap } };
  } catch (e: unknown) {
    yield* flushQueue();
    yield { type: "error", message: `Strategy failed: ${(e as Error).message}` };
    return;
  }

  // ── Phase 2: Website ─────────────────────────────────────────────────────
  state.phases.website = "running";
  yield { type: "phase", phase: "website", status: "running", message: "Building website..." };

  try {
    const builderUpdate = await runBuilderAgent(state, log);
    state = { ...state, ...builderUpdate };
    yield* flushQueue();
    yield {
      type: "artifact",
      artifact: { type: "website", url: "data:text/html;base64," + Buffer.from(state.websiteCode ?? "").toString("base64"), label: "Generated Website Code" },
    };
    yield { type: "phase", phase: "website", status: "done" };
  } catch (e: unknown) {
    yield* flushQueue();
    yield { type: "error", message: `Website build failed: ${(e as Error).message}` };
    return;
  }

  // ── Phase 3: Media ───────────────────────────────────────────────────────
  state.phases.media = "running";
  yield { type: "phase", phase: "media", status: "running", message: "Generating media assets..." };

  try {
    const producerUpdate = await runProducerAgent(state, log);
    state = { ...state, ...producerUpdate };
    yield* flushQueue();
    if (state.voiceoverUrl) {
      yield { type: "artifact", artifact: { type: "voiceover", url: state.voiceoverUrl, label: "Voiceover Audio" } };
    }
    yield { type: "phase", phase: "media", status: "done" };
  } catch (e: unknown) {
    yield* flushQueue();
    yield { type: "error", message: `Media generation failed: ${(e as Error).message}` };
    return;
  }

  // ── Phase 4: Stitching ───────────────────────────────────────────────────
  state.phases.stitching = "running";
  yield { type: "phase", phase: "stitching", status: "running", message: "Stitching final video..." };

  try {
    const stitcherUpdate = await runStitcherAgent(state, log);
    state = { ...state, ...stitcherUpdate };
    yield* flushQueue();
    if (state.finalVideoUrl) {
      yield { type: "artifact", artifact: { type: "video", url: state.finalVideoUrl, label: "Final Video" } };
    }
    yield { type: "phase", phase: "stitching", status: "done" };
  } catch (e: unknown) {
    yield* flushQueue();
    yield { type: "error", message: `Stitching failed: ${(e as Error).message}` };
    return;
  }

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
