# Prototype Agent — Technical Reference

> One sentence → Product doc + Landing page + Intro video in ~2 minutes.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Project Structure](#2-project-structure)
3. [Shared State Schema](#3-shared-state-schema)
4. [Streaming Protocol (SSE)](#4-streaming-protocol-sse)
5. [Phase 1 — Strategist Agent](#5-phase-1--strategist-agent)
6. [Phase 2 — Builder Agent](#6-phase-2--builder-agent)
7. [Phase 3 — Producer Agent](#7-phase-3--producer-agent)
8. [Phase 4 — Stitcher Agent](#8-phase-4--stitcher-agent)
9. [Pipeline Orchestrator](#9-pipeline-orchestrator)
10. [API Route](#10-api-route)
11. [Frontend](#11-frontend)
12. [Error Handling & Fallbacks](#12-error-handling--fallbacks)
13. [Data Flow Diagram](#13-data-flow-diagram)

---

## 1. Architecture Overview

The agent is a **linear 4-phase pipeline** implemented as a TypeScript `AsyncGenerator`. Each phase is an isolated async function (agent node) that receives the full shared state and returns a partial update to it — the same pattern as LangGraph state graphs, without requiring the LangGraph package.

```
User Input (raw idea)
        │
        ▼
┌───────────────────────────────────────────────────────────┐
│                    pipeline.ts (orchestrator)             │
│                                                           │
│  AgentState (shared JSON) flows through each node:        │
│                                                           │
│  [Strategist] → [Builder] → [Producer] → [Stitcher]      │
│                                                           │
│  Each node: (state) => Partial<AgentState>                │
└───────────────────────────────────────────────────────────┘
        │
        ▼  (Server-Sent Events, one event per log/phase/artifact)
┌───────────────────────┐
│   Next.js App Router  │
│   POST /api/generate  │
│   (SSE stream)        │
└───────────────────────┘
        │
        ▼
┌───────────────────────┐
│   React UI (page.tsx) │
│   Live phase tracker  │
│   Artifact cards      │
│   Website iframe      │
└───────────────────────┘
```

**Key design principles:**
- State is immutable between nodes — each node spreads the previous state and returns only its additions
- All external API calls are guarded — missing API keys return placeholder URLs instead of crashing
- SSE events are buffered in a queue inside the generator and flushed after each `await`
- Max pipeline duration is capped at **5 minutes** via Next.js `maxDuration = 300`

---

## 2. Project Structure

```
prototype-agent/
├── app/
│   ├── page.tsx                  # React UI — input, phase tracker, artifacts
│   ├── layout.tsx                # Root layout
│   ├── globals.css               # Tailwind base styles
│   └── api/
│       └── generate/
│           └── route.ts          # POST endpoint — SSE stream
├── lib/
│   ├── types.ts                  # AgentState, BrandIdentity, StreamEvent types
│   ├── pipeline.ts               # Orchestrator — runs all 4 phases in sequence
│   └── agents/
│       ├── strategist.ts         # Phase 1: DeepSeek V4 Pro
│       ├── builder.ts            # Phase 2: Gemini 2.5 Flash + E2B
│       ├── producer.ts           # Phase 3: Smallest.ai + Kling 3.0
│       └── stitcher.ts           # Phase 4: RunPod + FFmpeg
├── .env.local.example            # All required API keys documented
├── next.config.ts
├── tsconfig.json
└── package.json
```

---

## 3. Shared State Schema

Defined in `lib/types.ts`. One `AgentState` object is created at pipeline start and mutated by spreading partial updates from each agent node.

```typescript
interface AgentState {
  // ── Input ──────────────────────────────────────────────
  rawIdea: string        // user's one-sentence input
  sessionId: string      // UUID, generated at pipeline start

  // ── Phase 1 outputs ────────────────────────────────────
  brandIdentity?: {
    name: string
    tagline: string
    colors: { primary: string; secondary: string; accent: string }
    fonts:  { heading: string; body: string }
    tone: string
    targetAudience: string
  }
  sitemap?: Array<{
    slug: string
    title: string
    sections: string[]
  }>
  productDoc?: string    // 5-section Markdown document

  // ── Phase 2 outputs ────────────────────────────────────
  websiteCode?: string   // full .tsx source code
  websiteUrl?: string    // hosted URL (future)
  codeError?: string     // last validation error
  codeFixAttempts: number

  // ── Phase 3 outputs ────────────────────────────────────
  videoScript?: string   // 30-second narration script (~75 words)
  voiceoverUrl?: string  // MP3 from Smallest.ai
  videoClips?: string[]  // 4 × MP4 URLs from Kling

  // ── Phase 4 outputs ────────────────────────────────────
  finalVideoUrl?: string // stitched 1920×1080 MP4
  pdfUrl?: string        // product doc PDF (future)

  // ── Meta ───────────────────────────────────────────────
  phases: {
    strategy:  "pending" | "running" | "done" | "error"
    website:   "pending" | "running" | "done" | "error"
    media:     "pending" | "running" | "done" | "error"
    stitching: "pending" | "running" | "done" | "error"
  }
  error?: string
  logs: string[]
}
```

---

## 4. Streaming Protocol (SSE)

The API route (`POST /api/generate`) returns a `text/event-stream` response. Every significant event in the pipeline is serialized as:

```
data: {"type":"...","phase":"...","message":"..."}\n\n
```

### Event types

| `type` | When emitted | Key fields |
|--------|-------------|------------|
| `log` | Any agent calls `emit()` | `message: string` |
| `phase` | Phase starts or finishes | `phase`, `status`, `state?` |
| `artifact` | A file/URL is ready | `artifact: { type, url, label }` |
| `done` | All 4 phases complete | `state: Partial<AgentState>` |
| `error` | Unrecoverable failure | `message: string` |

### Artifact types

| `artifact.type` | Contents |
|----------------|----------|
| `website` | `data:text/html;base64,...` — full TSX source base64-encoded |
| `voiceover` | HTTPS URL to MP3 file |
| `video` | HTTPS URL to final MP4 |
| `pdf` | HTTPS URL to product doc PDF |

The frontend decodes the website artifact client-side and renders it in a sandboxed `<iframe>`.

---

## 5. Phase 1 — Strategist Agent

**File:** `lib/agents/strategist.ts`  
**Model:** DeepSeek V4 Pro (`deepseek-chat`) via OpenAI-compatible API  
**Base URL:** `https://api.deepseek.com`  
**Temperature:** 0.7

### LLM calls (3 total)

#### Call 1 — Strategy Generation (JSON mode)
Generates the brand identity and sitemap in a single structured JSON response.

```
System: You are a product strategist. Given a raw idea, return a JSON object with:
        - brandIdentity: { name, tagline, colors, fonts, tone, targetAudience }
        - sitemap: array of { slug, title, sections[] } (4-6 pages)

User:   Raw idea: "<user input>"
```

#### Call 2 — Reflection Loop (text mode)
The agent reviews its own output for logical flow, completeness, and market fit.

```
System: You are a critical product reviewer. Review this brand strategy and sitemap
        for logical flow, completeness, and market fit.
        Return JSON: { approved: boolean, improvements: string[] }

User:   Brand: <brandIdentity JSON>
        Sitemap: <sitemap JSON>
```

If `approved: false`, proceeds to Call 3. Otherwise skips it.

#### Call 3 — Refinement (JSON mode, conditional)
Only runs if the reflection loop rejected the strategy.

```
System: You are a product strategist. Refine the brand strategy based on the feedback.
        Return JSON with brandIdentity and sitemap keys.

User:   Original: <strategy JSON>
        Improvements: <comma-separated list>
```

#### Call 4 — Product Document (text mode)
Generates a 5-section Markdown document using the finalized brand identity.

```
System: You are a technical writer. Write a concise 5-section product document in Markdown:
        1. Executive Summary
        2. Problem & Solution
        3. Target Market
        4. Core Features (bullet list)
        5. Go-to-Market Strategy
        Keep each section 2-3 paragraphs.

User:   Brand: <brandIdentity JSON>
        Idea: <raw idea>
```

### Output added to state
`brandIdentity`, `sitemap`, `productDoc`

---

## 6. Phase 2 — Builder Agent

**File:** `lib/agents/builder.ts`  
**Model:** Gemini 2.5 Flash (`gemini-2.5-flash-preview-05-20`)  
**Sandbox:** E2B (optional) or static regex fallback  
**Max fix attempts:** 2

### Flow

```
generateWebsiteCode()
        │
        ▼
validateCodeWithE2B()
        │
   ┌────┴────┐
  ok?        no (up to 2×)
   │          │
   ▼          ▼
  done    generateWebsiteCode(previousError)
               │
               ▼
          validateCodeWithE2B()
```

### Gemini prompt (website generation)

```
Generate a complete, self-contained single-file React component as a Next.js page (TypeScript, .tsx).
Use Tailwind CSS for all styling. No external imports except React and Next.js built-ins.

Brand: <brandIdentity JSON>
Sitemap sections: <page titles>

Requirements:
- Default export named "LandingPage"
- Hero section with brand name and tagline
- Feature sections based on the sitemap
- Use brand colors as Tailwind arbitrary values
- Mobile-responsive layout
- Return ONLY the TypeScript code, no markdown fences.

[If retrying]: Previous attempt failed with this error — fix it: <error>
```

### E2B validation
When `E2B_API_KEY` is set:
1. Spins up an E2B sandbox (30-second timeout)
2. Writes the `.tsx` file to `/app/page.tsx`
3. Runs `npx tsc --noEmit --jsx react` inside the sandbox
4. Checks output for `error TS\d+` pattern
5. Returns first 500 chars of errors if found

When key is absent, falls back to regex:
- Checks for `export default` keyword
- Checks for JSX structure (`<[A-Z]` or `return (`)

### Output added to state
`websiteCode`, `codeFixAttempts`

---

## 7. Phase 3 — Producer Agent

**File:** `lib/agents/producer.ts`  
**Models:** DeepSeek V4 Pro (script) + Smallest.ai Waves (TTS) + Kling 3.0 (video)

### Sub-step 1 — Script Generation (DeepSeek)

```
System: You are a video scriptwriter. Write a punchy 30-second product demo script
        (approx 75 words). Plain text, pauses as "...", no stage directions.

User:   Brand: <brandIdentity JSON>
        Product doc summary: <first 600 chars of productDoc>
```

Temperature: 0.8 (higher — more creative for copy)

### Sub-step 2 — Voiceover (Smallest.ai Waves API)

**Endpoint:** `POST https://waves.smallest.ai/api/v1/tts`

```json
{
  "text": "<script>",
  "voice_id": "en_male_professional",
  "output_format": "mp3",
  "speed": 1.0
}
```

Returns `{ audio_url: string }` — a direct MP3 download URL.

### Sub-step 3 — Video Clips (Kling 3.0 API)

4 clips are generated in **parallel** (`Promise.all`) to save time. Each clip is 5 seconds at 16:9.

**Create endpoint:** `POST https://api.klingai.com/v1/videos/text2video`

```json
{
  "model": "kling-v1",
  "prompt": "<clip-specific prompt>",
  "aspect_ratio": "16:9",
  "duration": "5"
}
```

Returns `{ task_id }`. Then polls every 5 seconds for up to 3 minutes:

**Poll endpoint:** `GET https://api.klingai.com/v1/videos/text2video/{task_id}`

Success when `status === "succeed"` → extracts `works[0].resource.resource` as the MP4 URL.

### 4 clip prompts (brand-aware, generated at runtime)

| Clip | Prompt template |
|------|----------------|
| 0 — Reveal | `Cinematic product reveal: {name} — {tagline}. {tone} mood. 4K, smooth camera.` |
| 1 — Lifestyle | `People using {name} app on smartphone, lifestyle setting, {tone} atmosphere.` |
| 2 — Feature | `Close-up of {sitemap[1].title} in action, clean UI, modern design.` |
| 3 — Outro | `Brand outro: {name} logo on {primary color} background, minimal, professional.` |

### Output added to state
`videoScript`, `voiceoverUrl`, `videoClips` (array of 4 URLs)

---

## 8. Phase 4 — Stitcher Agent

**File:** `lib/agents/stitcher.ts`  
**Compute:** RunPod Serverless (GPU spot instance)  
**Tool:** FFmpeg with `libx264` + `aac`

### RunPod job lifecycle

```
submitRunPodJob(payload)
        │  POST /v2/{endpoint}/run
        ▼
    { id: "job_xyz" }
        │
        │  Poll every 5s, up to 60× (5 minutes max)
        ▼
    GET /v2/{endpoint}/status/{id}
        │
   ┌────┴────────┐
COMPLETED      FAILED
   │               │
   ▼               ▼
video_url      throw Error
```

### FFmpeg filter graph (sent as payload to RunPod worker)

```
concat=n=4:v=1:a=0[v];
[v]drawtext=text='{brandName}':fontcolor=white:fontsize=48:x=80:y=H-180:enable='between(t,0,4)'[vt1];
[vt1]drawtext=text='{tagline}':fontcolor=white:fontsize=28:x=80:y=H-120:enable='between(t,2,7)'[vout]

-map [vout]
-i <voiceover.mp3>
-c:v libx264 -c:a aac -shortest
```

**Lower-thirds timing:**
- Brand name: visible 0–4 seconds, 48px, white
- Tagline: visible 2–7 seconds, 28px, white
- Both positioned 80px from left edge, above bottom

**Output:** 1920×1080 MP4, H.264 + AAC

### Fallback (no RunPod keys)
Returns `videoClips[0]` directly as `finalVideoUrl` without rendering — pipeline completes without crashing.

### Output added to state
`finalVideoUrl`

---

## 9. Pipeline Orchestrator

**File:** `lib/pipeline.ts`  
**Pattern:** `async function*` (AsyncGenerator)

### State update pattern

Each agent call follows this pattern — state is never mutated in place:

```typescript
const update = await runStrategistAgent(state, log);
state = { ...state, ...update };  // immutable spread
```

### Event queue

Agent `emit()` calls during `await` cannot be yielded mid-function. They are buffered in `eventQueue[]` and flushed to the SSE stream via `flushQueue()` after each `await` completes:

```typescript
function log(message: string) {
  state.logs.push(message);
  eventQueue.push({ type: "log", message });
}

async function* flushQueue(): AsyncGenerator<StreamEvent> {
  while (eventQueue.length > 0) yield eventQueue.shift()!;
}

// After each await:
const update = await runBuilderAgent(state, log);
state = { ...state, ...update };
yield* flushQueue();             // flush buffered logs
yield { type: "phase", ... };   // then the phase event
```

### Phase transition sequence

```
yield phase:strategy:running
  await runStrategistAgent()
yield* flushQueue()              ← buffered logs
yield phase:strategy:done        ← includes brandIdentity + sitemap in state
yield phase:website:running
  await runBuilderAgent()
yield* flushQueue()
yield artifact:website           ← base64-encoded TSX
yield phase:website:done
yield phase:media:running
  await runProducerAgent()
yield* flushQueue()
yield artifact:voiceover         ← MP3 URL
yield phase:media:done
yield phase:stitching:running
  await runStitcherAgent()
yield* flushQueue()
yield artifact:video             ← final MP4 URL
yield phase:stitching:done
yield done                       ← full final state snapshot
```

Any uncaught exception in a phase yields `{ type: "error" }` and `return`s — stopping the generator cleanly.

---

## 10. API Route

**File:** `app/api/generate/route.ts`  
**Method:** POST  
**Path:** `/api/generate`

### Request

```json
{ "idea": "an app for plant trading between neighbors" }
```

Validation: string, minimum 5 characters.

### Response headers

```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

### Configuration

```typescript
export const dynamic = "force-dynamic";  // never cache
export const maxDuration = 300;          // 5-minute timeout (Vercel Pro+)
```

### Stream mechanics

Uses the Web Streams API (`ReadableStream` + `TextEncoder`) — compatible with both Vercel Edge and Node.js runtimes:

```typescript
const stream = new ReadableStream({
  async start(controller) {
    for await (const event of runPipeline(idea)) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
    }
    controller.close();
  }
});
```

---

## 11. Frontend

**File:** `app/page.tsx`  
**Framework:** React (Next.js App Router, client component)

### State managed by the UI

| State var | Type | Purpose |
|-----------|------|---------|
| `phases` | `AgentState["phases"]` | Drives 4 phase indicator cards |
| `logs` | `string[]` | Live log panel |
| `artifacts` | `StreamEvent["artifact"][]` | Downloadable output cards |
| `brand` | `BrandIdentity` | Brand identity display card |
| `websiteCode` | `string` | Decoded TSX, rendered in iframe |
| `running` | `boolean` | Disables input during pipeline |
| `done` / `error` | `boolean` / `string` | Terminal state banners |

### SSE consumption

Reads the stream via `ReadableStream.getReader()`. Splits on `\n\n` boundary, parses `data: ` prefix, routes each event type:

```typescript
if (event.type === "phase")    → setPhases(...)
if (event.type === "log")      → setLogs(...)
if (event.type === "artifact") → setArtifacts(...)
if (event.type === "done")     → setDone(true)
if (event.type === "error")    → setError(...)
```

### Website preview

The website artifact arrives as `data:text/html;base64,...`. The UI:
1. Decodes base64 with `atob()`
2. Creates a `Blob` URL
3. Renders it in `<iframe sandbox="allow-scripts">`

---

## 12. Error Handling & Fallbacks

| Condition | Behaviour |
|-----------|-----------|
| `DEEPSEEK_API_KEY` missing | Throws on first LLM call — pipeline fails at Phase 1 |
| `GEMINI_API_KEY` missing | Throws on first website gen call — pipeline fails at Phase 2 |
| `E2B_API_KEY` missing | Falls back to regex validation — pipeline continues |
| `SMALLEST_AI_API_KEY` missing | Returns `https://placeholder.audio/voiceover.mp3` — pipeline continues |
| `KLING_API_KEY` missing | Returns `https://placeholder.video/clipN.mp4` per clip — pipeline continues |
| `RUNPOD_API_KEY` missing | Returns `videoClips[0]` as finalVideoUrl — pipeline continues |
| Kling clip generation fails | Per-clip `catch()` returns placeholder — other clips unaffected |
| E2B sandbox throws | Returns `{ ok: true }` — skips validation silently |
| Kling polling timeout (3 min) | Throws — caught by pipeline, emits error event |
| RunPod polling timeout (5 min) | Throws — caught by pipeline, emits error event |
| JSON.parse failure on reflection | Defaults to `{ approved: true, improvements: [] }` — skips refinement |

---

## 13. Data Flow Diagram

```
User types idea
      │
      ▼
POST /api/generate
      │
      ▼
createInitialState(rawIdea)
      │   sessionId = uuid()
      │   all phases = "pending"
      │
      ▼
─────────────────────────────────────────────────────
PHASE 1: STRATEGIST (DeepSeek V4 Pro)
─────────────────────────────────────────────────────
      │
      ├─► [LLM Call 1] rawIdea → brandIdentity + sitemap (JSON)
      │
      ├─► [LLM Call 2] brandIdentity + sitemap → reflection { approved, improvements }
      │
      ├─► (if !approved) [LLM Call 3] strategy + improvements → refined strategy
      │
      └─► [LLM Call 4] brandIdentity → productDoc (Markdown)
      │
      │   State gains: brandIdentity, sitemap, productDoc
      │   SSE: phase:strategy:done (with brandIdentity snapshot)
      │
      ▼
─────────────────────────────────────────────────────
PHASE 2: BUILDER (Gemini 2.5 Flash + E2B)
─────────────────────────────────────────────────────
      │
      ├─► [Gemini] brandIdentity + sitemap → websiteCode (TSX)
      │
      ├─► [E2B / regex] validate websiteCode
      │       │
      │  (if error, up to 2×)
      │       └─► [Gemini] websiteCode + error → fixed websiteCode
      │
      │   State gains: websiteCode, codeFixAttempts
      │   SSE: artifact:website (base64 TSX)
      │
      ▼
─────────────────────────────────────────────────────
PHASE 3: PRODUCER (DeepSeek + Smallest.ai + Kling)
─────────────────────────────────────────────────────
      │
      ├─► [DeepSeek] brandIdentity + productDoc → videoScript (75 words)
      │
      ├─► [Smallest.ai] videoScript → voiceoverUrl (MP3)
      │
      └─► [Kling × 4, parallel] brand-aware prompts → videoClips[] (MP4 URLs)
               Each clip: POST create → poll every 5s → resolve URL
      │
      │   State gains: videoScript, voiceoverUrl, videoClips[4]
      │   SSE: artifact:voiceover
      │
      ▼
─────────────────────────────────────────────────────
PHASE 4: STITCHER (RunPod + FFmpeg)
─────────────────────────────────────────────────────
      │
      ├─► [RunPod] POST job: {clips, audio, lower_thirds, ffmpeg_args}
      │
      ├─► Poll every 5s → COMPLETED → finalVideoUrl (MP4, 1920×1080)
      │
      │   FFmpeg pipeline:
      │   concat(4 clips) → drawtext(brandName, t=0–4s)
      │                   → drawtext(tagline, t=2–7s)
      │                   → overlay(voiceover MP3)
      │                   → encode H.264/AAC
      │
      │   State gains: finalVideoUrl
      │   SSE: artifact:video, phase:stitching:done, done (full state)
      │
      ▼
Client receives done event
Renders: brand card, website iframe, artifact download links
```
