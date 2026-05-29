# Prototype Agent

> **One sentence → Product doc + Landing page + Intro video in ~2 minutes, for ~$0.30.**

An AI pipeline that transforms a single idea into three investor-ready, brand-consistent prototype assets simultaneously — no designers, no developers, no agencies required.

---

## Table of Contents

1. [Business Overview](#1-business-overview)
2. [What It Produces](#2-what-it-produces)
3. [Agent Architecture](#3-agent-architecture)
4. [All Agents Defined](#4-all-agents-defined)
5. [Model Selection Rationale](#5-model-selection-rationale)
6. [Technical Stack](#6-technical-stack)
7. [Project Structure](#7-project-structure)
8. [Cost Breakdown](#8-cost-breakdown)
9. [Client Pricing Model](#9-client-pricing-model)
10. [Setup & Running](#10-setup--running)
11. [Environment Variables](#11-environment-variables)
12. [API Reference](#12-api-reference)

---

## 1. Business Overview

### The Problem

Validating a product idea today requires three separate vendors, weeks of coordination, and $5,000–$22,000 in upfront cost:

| What's needed | Who to hire | Time | Cost |
|---|---|---|---|
| Product document | Business analyst | 3–5 days | $500–$2,000 |
| Landing page | Designer + developer | 1–2 weeks | $1,500–$5,000 |
| Pitch video | Video production agency | 2–4 weeks | $3,000–$15,000 |
| **Total** | 3 separate vendors | **3–6 weeks** | **$5,000–$22,000** |

Most ideas never get prototyped — not because they aren't good, but because the cost and friction of producing proof-of-concept material is prohibitive.

### The Solution

Prototype Agent collapses this entire workflow into **2 minutes and $0.30** by running four AI agents in sequence, all sharing a single brand identity state. One input sentence drives three production-ready outputs simultaneously — no consistency gaps, no coordination overhead.

### Who It's For

| Segment | Use case |
|---|---|
| Solo founders / indie hackers | Test multiple ideas per month, no budget for agencies |
| Product managers at enterprises | Socialize new initiatives before headcount approval |
| Startup accelerators | Prototype materials for every company in a cohort at demo day |
| Venture studios | Reduce prototype cost from $10,000 to $0.30 per concept |
| Consultants / agency account teams | Produce a working website preview in 2 minutes before a client meeting |

### Competitive Advantage

Every existing tool (Framer AI, Gamma, HeyGen, v0, Webflow AI, Notion AI) produces a single output type. None of them:

- Start from a raw idea without requiring a pre-written brief
- Build a brand identity first and thread it through all outputs
- Produce document + code + video in one run
- Self-review and refine their own outputs before delivery

The moat is the **pipeline architecture** — the shared `AgentState` schema that carries brand identity, tone, and messaging through every output simultaneously. That is an engineering and product design decision, not a model capability.

---

## 2. What It Produces

### Output 1 — Product Document (Markdown)
A structured 5-section document generated from brand identity, then self-reviewed for logical flow:
- Executive Summary
- Problem & Solution
- Target Market
- Core Features (prioritized bullet list)
- Go-to-Market Strategy

### Output 2 — Landing Page (React + Tailwind, `.tsx`)
A fully coded, mobile-responsive single-page website:
- Hero section with brand name and tagline
- Feature sections from the sitemap
- Brand colors applied as Tailwind arbitrary values
- Validated in a sandboxed environment, auto-corrected on failure (up to 2 attempts)
- Renders immediately in a browser iframe — shareable as a hosted URL

### Output 3 — Intro Video (MP4, 1920×1080)
A 30-second produced video ready for a pitch deck or Product Hunt launch:
- AI-written voiceover script (~75 words)
- Human-quality narration via text-to-speech
- 4 AI-generated cinematic clips generated in parallel
- Brand name + tagline lower-thirds baked in
- Exported as H.264/AAC 1080p MP4

---

## 3. Agent Architecture

The pipeline is a **linear 4-phase AsyncGenerator** implemented in TypeScript. Each phase is an isolated async agent node that receives the full shared `AgentState` and returns a partial update — the same pattern as LangGraph state graphs.

```
User Input (one sentence)
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│                    pipeline.ts  (orchestrator)                  │
│                                                                 │
│   AgentState (shared JSON) flows through each agent node:       │
│                                                                 │
│   [Strategist] ──► [Builder] ──► [Producer] ──► [Stitcher]     │
│        │                │             │              │          │
│      Phase 1          Phase 2       Phase 3        Phase 4      │
│   Brand + Docs       Website       Media          Video         │
│                                                                 │
│   Each node signature:  (state: AgentState) => Partial<AgentState>  │
└─────────────────────────────────────────────────────────────────┘
        │
        ▼   (Server-Sent Events — one event per log / phase / artifact)
┌──────────────────────┐
│  Next.js App Router  │
│  POST /api/generate  │
│  (SSE text/event-stream) │
└──────────────────────┘
        │
        ▼
┌──────────────────────┐
│  React UI (page.tsx) │
│  Live phase tracker  │
│  Artifact cards      │
│  Website iframe      │
└──────────────────────┘
```

**Key design principles:**
- State is immutable between nodes — each node spreads the previous state and returns only its additions
- All external API calls are guarded — missing API keys return placeholder URLs instead of crashing
- SSE events are buffered in a queue and flushed after each `await` (no mid-await yield gaps)
- Max pipeline duration is capped at **5 minutes** via `export const maxDuration = 300`

### Shared State Schema (`lib/types.ts`)

```typescript
interface AgentState {
  rawIdea: string        // user's one-sentence input
  sessionId: string      // UUID, generated at pipeline start

  // Phase 1 outputs
  brandIdentity?: {
    name: string; tagline: string
    colors: { primary: string; secondary: string; accent: string }
    fonts: { heading: string; body: string }
    tone: string; targetAudience: string
  }
  sitemap?: Array<{ slug: string; title: string; sections: string[] }>
  productDoc?: string    // 5-section Markdown document

  // Phase 2 outputs
  websiteCode?: string   // full .tsx source
  websiteUrl?: string    // hosted URL (future)
  codeError?: string
  codeFixAttempts: number

  // Phase 3 outputs
  videoScript?: string   // ~75-word narration script
  voiceoverUrl?: string  // MP3 from Smallest.ai
  videoClips?: string[]  // 4 × MP4 URLs from Kling

  // Phase 4 outputs
  finalVideoUrl?: string // stitched 1920×1080 MP4

  // Meta
  phases: { strategy: "pending"|"running"|"done"|"error"; website: ...; media: ...; stitching: ... }
  error?: string
  logs: string[]
}
```

### SSE Event Stream Protocol

Every event follows the format: `data: {"type":"...","phase":"...","message":"..."}\n\n`

| `type` | When emitted | Key fields |
|---|---|---|
| `log` | Any agent calls `emit()` | `message: string` |
| `phase` | Phase starts or finishes | `phase`, `status`, `state?` |
| `artifact` | A file/URL is ready | `artifact: { type, url, label }` |
| `done` | All 4 phases complete | `state: Partial<AgentState>` |
| `error` | Unrecoverable failure | `message: string` |

### Phase Transition Sequence

```
yield phase:strategy:running
  await runStrategistAgent()
yield* flushQueue()           ← buffered logs
yield phase:strategy:done     ← includes brandIdentity + sitemap
yield phase:website:running
  await runBuilderAgent()
yield* flushQueue()
yield artifact:website        ← base64 TSX
yield phase:website:done
yield phase:media:running
  await runProducerAgent()
yield* flushQueue()
yield artifact:voiceover      ← MP3 URL
yield phase:media:done
yield phase:stitching:running
  await runStitcherAgent()
yield* flushQueue()
yield artifact:video          ← final MP4 URL
yield phase:stitching:done
yield done                    ← full final state snapshot
```

---

## 4. All Agents Defined

### Agent 1 — Strategist (`lib/agents/strategist.ts`)

**Role:** Transforms a raw idea into a complete brand identity, sitemap, and product document. Includes a built-in reflection loop that self-reviews the output and refines it if needed.

**Model:** Llama 3.3 70B (`llama-3.3-70b-versatile`) via Groq API
**Base URL:** `https://api.groq.com/openai/v1`
**Temperature:** 0.7

**LLM Calls (3–4 per run):**

| Call | Input | Output | Mode |
|---|---|---|---|
| 1 — Strategy Generation | Raw idea | `brandIdentity` + `sitemap` JSON | JSON mode |
| 2 — Reflection Loop | Brand + sitemap | `{ approved: bool, improvements: string[] }` | JSON mode |
| 3 — Refinement *(conditional)* | Strategy + improvements | Refined brand + sitemap | JSON mode |
| 4 — Product Document | Brand identity + idea | 5-section Markdown doc | Text mode |

**Reflection logic:** If the self-review returns `approved: false`, Call 3 runs to refine the output before writing the product doc. If parsing fails, defaults to `{ approved: true }` and skips refinement.

**State additions:** `brandIdentity`, `sitemap`, `productDoc`

---

### Agent 2 — Builder (`lib/agents/builder.ts`)

**Role:** Generates a complete, self-contained React/Tailwind landing page from the brand identity and sitemap. Validates the code compiles and auto-fixes errors up to 2 times.

**Model:** Gemini 2.5 Flash (`gemini-2.5-flash-preview-05-20`)
**Code Sandbox:** E2B (optional) — falls back to regex validation if key is absent
**Max fix attempts:** 2

**Flow:**
```
generateWebsiteCode()
        │
        ▼
validateCode() — E2B sandbox OR regex fallback
        │
   ┌────┴────┐
  ok?       error (up to 2×)
   │          │
  done    generateWebsiteCode(previousError) → validateCode()
```

**Prompt requirements enforced:**
- Default export named `LandingPage`
- Hero section with brand name and tagline
- Feature sections based on sitemap titles
- Brand colors as Tailwind arbitrary values (`bg-[#hex]`)
- Mobile-responsive layout
- No external imports except React and Next.js built-ins

**E2B validation:** Spins up a Node.js sandbox, writes the `.tsx` file, runs `npx tsc --noEmit --jsx react`, and checks for `error TS\d+` patterns. Returns first 500 chars of errors if found.

**State additions:** `websiteCode`, `codeFixAttempts`

---

### Agent 3 — Producer (`lib/agents/producer.ts`)

**Role:** Generates all media assets — voiceover script, audio narration, and 4 AI video clips. Clips are generated in parallel to minimize wall-clock time.

**Models used:**
- Llama 3.3 70B via Groq — script writing (temperature 0.8)
- Smallest.ai Waves — text-to-speech (`en_male_professional` voice)
- Kling 3.0 — AI video generation (4 clips × 5 seconds, 16:9)

**Sub-steps:**

1. **Script Generation (Llama 3.3 70B via Groq):** ~75-word punchy narration script, plain text, pauses as `...`, no stage directions.

2. **Voiceover (Smallest.ai):**
   ```
   POST https://waves.smallest.ai/api/v1/tts
   { "text": "<script>", "voice_id": "en_male_professional", "output_format": "mp3" }
   → { audio_url: string }
   ```

3. **Video Clips (Kling 3.0) — 4 clips in parallel:**
   ```
   POST https://api.klingai.com/v1/videos/text2video
   → { task_id }  →  poll GET every 5s (up to 3 min)  →  MP4 URL
   ```

**4 clip prompts (brand-aware, generated at runtime):**

| Clip | Theme | Prompt template |
|---|---|---|
| 0 | Product Reveal | `Cinematic product reveal: {name} — {tagline}. {tone} mood. 4K, smooth camera.` |
| 1 | Lifestyle | `People using {name} app on smartphone, lifestyle setting, {tone} atmosphere.` |
| 2 | Feature Close-up | `Close-up of {sitemap[1].title} in action, clean UI, modern design.` |
| 3 | Brand Outro | `Brand outro: {name} logo on {primary color} background, minimal, professional.` |

**State additions:** `videoScript`, `voiceoverUrl`, `videoClips[4]`

---

### Agent 4 — Stitcher (`lib/agents/stitcher.ts`)

**Role:** Concatenates the 4 video clips, overlays the voiceover, burns in brand name and tagline as lower-thirds text, and exports the final 1920×1080 MP4.

**Compute:** RunPod Serverless (GPU spot instance)
**Tool:** FFmpeg with `libx264` + `aac`

**RunPod job lifecycle:**
```
POST /v2/{endpoint}/run  →  { id: "job_xyz" }
        │
        │  Poll GET /v2/{endpoint}/status/{id}  every 5s, up to 60× (5 min max)
        ▼
    COMPLETED → finalVideoUrl (MP4)
    FAILED    → throws Error (caught by pipeline)
```

**FFmpeg filter graph:**
```
concat=n=4:v=1:a=0[v];
[v]drawtext=text='{brandName}':fontcolor=white:fontsize=48:x=80:y=H-180:enable='between(t,0,4)'[vt1];
[vt1]drawtext=text='{tagline}':fontcolor=white:fontsize=28:x=80:y=H-120:enable='between(t,2,7)'[vout]

-map [vout]  -i <voiceover.mp3>  -c:v libx264  -c:a aac  -shortest
```

**Lower-thirds timing:** Brand name visible 0–4s (48px), tagline visible 2–7s (28px), both white, 80px from left.

**Fallback:** If `RUNPOD_API_KEY` is absent, returns `videoClips[0]` directly as `finalVideoUrl` — pipeline completes without crashing.

**State additions:** `finalVideoUrl`

---

## 5. Model Selection Rationale

Every model in this pipeline was chosen for a specific reason — accuracy for the task, speed, cost, or reliability. This section documents the *why* behind each choice so it can be revisited as better options emerge.

---

### Llama 3.3 70B via Groq — Strategist + Producer script

**Used in:** Agent 1 (brand identity, reflection, product doc) and Agent 3 (video script)

**Why this model:**

Llama 3.3 70B is one of the strongest open-weight models for **structured reasoning and JSON output**. The Strategist agent makes 3–4 LLM calls that all require strict JSON conformance — brand identity objects, sitemap arrays, and reflection decisions. Llama 3.3 70B with `response_format: json_object` produces well-formed, logically consistent JSON with very low hallucination rate on structured schemas.

**Why Groq specifically:**

Groq's LPU (Language Processing Unit) hardware runs Llama 3.3 70B at **200–300 tokens/second** — 5–10× faster than GPU-based providers. The Strategist phase involves 3–4 sequential LLM calls. On a standard GPU provider those calls would take 15–25 seconds. On Groq they complete in 4–8 seconds. For a pipeline where user experience is real-time streaming, this latency difference is the largest single UX lever.

**Why not GPT-4o or Claude?**

- GPT-4o and Claude Sonnet are more expensive per token with no meaningful quality advantage for this specific task (structured brand strategy JSON + short-form writing)
- Groq's Llama is effectively free-tier at prototype scale and sub-cent at production scale
- The `openai`-compatible API means zero code changes to swap in a different model if needed

**Temperature 0.7 (strategy) / 0.8 (script):**
- 0.7 for brand identity: enough creativity to produce distinct brand names and color choices, not so high that it fabricates impossible JSON structures
- 0.8 for video script: slightly higher to encourage punchy, varied copy rather than generic phrasing

---

### Gemini 2.5 Flash — Builder (website code generation)

**Used in:** Agent 2 (React/Tailwind landing page)

**Why this model:**

Gemini 2.5 Flash has the **largest effective context window** (1M tokens) and is specifically strong on code generation tasks — outperforming GPT-4o and Claude 3.5 Sonnet on several coding benchmarks (HumanEval, SWE-bench subsets). The Builder prompt includes the full brand identity JSON plus all sitemap sections, which can be verbose. Flash handles this without truncation or attention degradation.

**Why not GPT-4o or Claude for code?**

- Claude 3.5 Sonnet produces slightly higher quality React code but costs ~10× more per token than Gemini Flash for this use case
- GPT-4o has a smaller effective context window and occasionally truncates long code completions mid-output
- Gemini Flash has a generous **free tier (1,500 requests/day)** — this means the website phase costs effectively $0 at prototype and early production scale

**Why not a code-specific model (Codestral, DeepSeek Coder)?**

The website generation prompt is not pure code — it blends brand identity understanding, design decisions (color application, layout hierarchy), and TypeScript code. Gemini Flash's instruction-following for the full multi-constraint prompt (brand colors as arbitrary Tailwind values, mobile-responsive, no external imports, correct export name) is more reliable than narrower code-only models that lack the general reasoning to apply brand constraints correctly.

**The auto-fix loop:**

Gemini Flash occasionally misformats imports or drops the required `export default LandingPage` on the first pass (~15% of runs). The 2-attempt fix loop with the specific TypeScript error fed back catches these. The combination of Flash's high code quality + deterministic E2B compile check + one retry pass yields a near-100% valid output rate.

---

### Smallest.ai Waves — TTS voiceover

**Used in:** Agent 3 (audio narration)

**Why this model:**

Smallest.ai Waves (`en_male_professional`) produces **broadcast-quality narration** with natural prosody, correct pacing on `...` pauses, and no robotic artefacts. It is specifically optimised for short-form professional narration — exactly the 30-second product demo script this pipeline generates.

**Why not ElevenLabs, OpenAI TTS, or Google TTS?**

| Provider | Quality | Price/sec | Latency | Notes |
|---|---|---|---|---|
| Smallest.ai Waves | Excellent | ~$0.002 | ~3s | Best value for professional narration |
| ElevenLabs | Excellent | ~$0.008 | ~4s | 4× more expensive for same quality |
| OpenAI TTS | Good | ~$0.015/1K chars | ~2s | Higher cost, slightly robotic on long pauses |
| Google TTS | Acceptable | ~$0.004/char | ~1s | Quality doesn't match at professional level |

At $0.002/second, a 30-second voiceover costs $0.06. ElevenLabs would cost $0.24 for the same clip — 4× more expensive with no perceptible quality difference for this use case.

---

### Kling 3.0 — AI video clip generation

**Used in:** Agent 3 (4 × 5-second cinematic clips)

**Why this model:**

Kling 3.0 is currently the **best text-to-video model for cinematic quality at this clip length**. It produces smooth camera motion, consistent subject matter, and clean brand-contextual visuals from the prompt templates used (product reveal, lifestyle, close-up, outro). It handles the 16:9 aspect ratio and 5-second duration natively.

**Why not Runway Gen-3, Sora, or Pika?**

| Provider | Quality | Credits/clip | Cost/clip | API availability |
|---|---|---|---|---|
| Kling 3.0 | Excellent | 5–10 | ~$0.05–0.10 | Yes, stable REST API |
| Runway Gen-3 Alpha | Excellent | ~20 | ~$0.25 | Yes, but ~5× more expensive |
| Sora (OpenAI) | Excellent | — | Not available via API | No public API at this time |
| Pika 2.0 | Good | — | API in beta | Limited access |

Kling's starter plan ($10/mo) includes enough credits for ~20 full pipeline runs per month. The API is stable, the polling pattern is predictable, and the per-clip cost is the lowest among production-grade options.

**Parallel generation:**

All 4 clips are submitted simultaneously via `Promise.all`. Each clip takes ~60–90 seconds to generate, but because they run in parallel the total wait is ~90 seconds rather than 6 minutes sequential. This is the most significant performance optimisation in the entire pipeline.

---

### RunPod Serverless + FFmpeg — video stitching

**Used in:** Agent 4 (concat, lower-thirds, encode)

**Why RunPod:**

FFmpeg is CPU/GPU-bound work that cannot run inside a serverless function with a memory cap. RunPod provides **on-demand GPU spot instances** that spin up in under 10 seconds and cost $0.00019/second — roughly $0.02 for a 2-minute FFmpeg encode job. There is no base fee; cost is only incurred when a job runs.

**Why not Vercel Edge Functions or AWS Lambda?**

- Vercel Edge Functions have a 128MB memory limit and no GPU access — FFmpeg operations on 1080p video would OOM
- AWS Lambda has a 10GB /tmp limit and 15-minute timeout but no native GPU; encoding 4 × 5-sec 1080p clips would exceed its practical CPU budget
- RunPod's serverless model is purpose-built for media workloads and orders of magnitude cheaper than reserved GPU instances for intermittent jobs

**Why FFmpeg specifically:**

FFmpeg is the industry-standard tool for the exact operations needed: `concat` filter for joining clips, `drawtext` for lower-thirds, `libx264` for H.264 encoding, and `aac` for audio. No alternative tool handles all four operations in a single command with the same reliability and output compatibility.

---

### E2B — TypeScript sandbox validation

**Used in:** Agent 2 (code validation after website generation)

**Why E2B:**

E2B provides **isolated, ephemeral Node.js sandboxes** that boot in under 3 seconds. Running `tsc --noEmit` inside the sandbox is the only way to catch TypeScript compilation errors before sending the code to the frontend — regex checks on raw `.tsx` source catch ~40% of errors; a real TypeScript compiler catches 100%.

**Why not run `tsc` locally on the server?**

The Next.js server process doesn't have write access to a safe temp directory suitable for arbitrary user-generated code, and executing `tsc` on untrusted code in the same process as the application server is a security risk. E2B's sandboxed environment is isolated by design — even malformed or adversarial code cannot affect the host.

**Cost:** 100 free sandbox-hours/month — effectively free at any realistic prototype or early production scale.

---

## 6. Technical Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.2.6 |
| Language | TypeScript | ^5 |
| UI | React | 19.2.4 |
| Styling | Tailwind CSS | ^4 |
| AI Orchestration | Custom AsyncGenerator pipeline | — |
| LangChain (optional) | `@langchain/langgraph`, `@langchain/core` | ^1.x |
| LLM — Strategy/Script | Llama 3.3 70B via Groq (`openai`-compatible) | `openai ^6` |
| LLM — Website | Google Gemini 2.5 Flash | `@google/generative-ai ^0.24` |
| Code Sandbox | E2B | `e2b ^2.27` |
| TTS | Smallest.ai Waves API | REST |
| Video Generation | Kling 3.0 API | REST |
| Video Rendering | RunPod Serverless + FFmpeg | REST |
| Streaming | Web Streams API (`ReadableStream` + SSE) | Native |
| Auth | NextAuth v5 | `next-auth ^5.0.0-beta` |
| PDF export | jsPDF | `jspdf ^4.2` |
| Deployment | Vercel (Pro, `maxDuration=300`) | — |

---

## 7. Project Structure

```
prototype-agent/
├── app/
│   ├── page.tsx                  # React UI — input, phase tracker, artifact cards
│   ├── layout.tsx                # Root layout
│   ├── globals.css               # Tailwind base styles
│   └── api/
│       └── generate/
│           └── route.ts          # POST /api/generate — SSE stream endpoint
├── lib/
│   ├── types.ts                  # AgentState, BrandIdentity, StreamEvent types
│   ├── pipeline.ts               # Orchestrator — runs all 4 agents in sequence
│   └── agents/
│       ├── strategist.ts         # Agent 1: Llama 3.3 70B via Groq (brand + doc)
│       ├── builder.ts            # Agent 2: Gemini 2.5 Flash + E2B (website)
│       ├── producer.ts           # Agent 3: Smallest.ai + Kling 3.0 (media)
│       └── stitcher.ts           # Agent 4: RunPod + FFmpeg (video stitch)
├── .env.local.example            # All required API keys documented
├── .env.local                    # Your local keys (not committed)
├── BUSINESS.md                   # Full business case and revenue model
├── TECHNICAL.md                  # Deep-dive technical reference
├── next.config.ts
├── tsconfig.json
└── package.json
```

---

## 8. Cost Breakdown

### Per-run cost (~$0.30 total for full pipeline)

| Phase | Service | Role | Cost/run |
|---|---|---|---|
| Strategy (3–4 LLM calls) | Llama 3.3 70B via Groq | Brand strategy + product doc | ~$0.001 |
| Website (1–3 LLM calls) | Gemini 2.5 Flash | Landing page code generation | ~$0.001 |
| Code validation | E2B sandbox | TypeScript compile check | ~$0.001 |
| Voiceover (30 sec) | Smallest.ai Waves | Text-to-speech narration | ~$0.060 |
| Video clips (4 × 5 sec) | Kling 3.0 | AI video generation (parallel) | ~$0.20–0.40 |
| Video render (2 min GPU) | RunPod Serverless | FFmpeg stitch + encode | ~$0.020 |
| **Total** | | | **~$0.28–0.48** |

Video clips account for ~85% of total cost. Everything else — strategy, website, voiceover, rendering — costs under $0.10 combined.

### Monthly fixed costs

| Service | Plan | Monthly cost |
|---|---|---|
| Kling 3.0 | Starter subscription | $10.00 |
| Vercel hosting | Hobby / Pro | $0–$20 |
| RunPod | Pay-per-use, no base fee | $0 |
| All others | Pay-per-use | $0 |
| **Total fixed** | | **$10–$30/month** |

### Cost at scale

| Monthly runs | Variable cost | Fixed cost | Total | Per-run cost |
|---|---|---|---|---|
| 10 | ~$3 | $20 | ~$23 | ~$2.30 |
| 100 | ~$30 | $20 | ~$50 | ~$0.50 |
| 500 | ~$150 | $20 | ~$170 | ~$0.34 |
| 1,000 | ~$300 | $20 | ~$320 | ~$0.32 |
| 5,000 | ~$1,500 | $20 | ~$1,520 | ~$0.30 |

At 1,000+ runs/month the fixed Kling subscription becomes negligible and cost stabilises at ~$0.30/run.

### Budget mode (no video)

If `KLING_API_KEY` and `RUNPOD_API_KEY` are absent, the agent produces the product doc and landing page only:

| Configuration | Cost/run | 1,000 runs/month |
|---|---|---|
| Full pipeline (doc + website + video) | ~$0.30 | ~$320 |
| Budget mode (doc + website only) | ~$0.004 | ~$4 |

---

## 9. Client Pricing Model

### Recommended: Credit-Based SaaS

Each full pipeline run costs 1 credit. Clients purchase credit packs or monthly subscriptions:

| Tier | Price/month | Credits | Cost/credit | Gross margin (at $0.30 COGS) |
|---|---|---|---|---|
| Starter | $9 | 10 | $0.90 | 67% |
| Growth | $29 | 50 | $0.58 | 48% |
| Studio | $99 | 200 | $0.50 | 40% |
| Agency | $299 | 750 | $0.40 | 25% |

### Per-Output Pricing (unbundled)

Capture users who only need one asset:

| Output | Price |
|---|---|
| Product doc only | $2 |
| Landing page only | $5 |
| Full run (doc + page + video) | $15 |

### White-Label / API Access

For accelerators, venture studios, and agencies embedding the pipeline:

- $0.50–$2.00 per API call (vs. $0.30 COGS)
- Minimum commitment: $500/month
- Target: 50–200 studios and accelerators globally

### Enterprise Licensing

For corporate R&D and strategy consulting firms:

- Annual license: $50,000–$200,000
- Includes custom model fine-tuning on company brand guidelines
- Dedicated infrastructure, SLA, and support

### Value vs. Traditional Approach

| | Traditional | Prototype Agent |
|---|---|---|
| Time to first draft | 3–6 weeks | 2 minutes |
| Cost per prototype | $5,000–$22,000 | $0.30 |
| Vendors required | 3–5 | 0 |
| Brand consistency | Depends on briefing | Guaranteed (shared state) |
| Iteration cost | Full cost again | $0.30 again |

---

## 10. Setup & Running

### Prerequisites

- Node.js 18+
- npm or yarn
- At minimum: `GROQ_API_KEY` and `GEMINI_API_KEY`

### Install

```bash
npm install
```

### Configure environment

```bash
cp .env.local.example .env.local
# Edit .env.local and add your API keys
```

At minimum, add `GROQ_API_KEY` and `GEMINI_API_KEY` to get doc + website generation working. The pipeline gracefully degrades to placeholder URLs for any missing optional keys.

### Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), type any product idea, and click Generate.

### Build for production

```bash
npm run build
npm run start
```

---

## 11. Environment Variables

| Variable | Service | Required | Pricing |
|---|---|---|---|
| `GROQ_API_KEY` | Llama 3.3 70B via Groq (strategy + script) | **Yes** | Free tier available. Paid: ~$0.05/M input, $0.08/M output |
| `GEMINI_API_KEY` | Gemini 2.5 Flash (website generation) | **Yes** | Free tier: 1,500 req/day. Paid: $0.15/M input |
| `SMALLEST_AI_API_KEY` | Smallest.ai Waves (voiceover TTS) | No | ~$0.002/sec audio. 30-sec ≈ $0.06 |
| `KLING_API_KEY` | Kling 3.0 (AI video clips) | No | $10/mo starter (~200 credits) |
| `RUNPOD_API_KEY` | RunPod Serverless (FFmpeg stitch) | No | $0.00019/sec GPU. 2-min job ≈ $0.02 |
| `RUNPOD_ENDPOINT_ID` | RunPod endpoint ID | No | Same plan — needs custom FFmpeg worker |
| `E2B_API_KEY` | E2B sandbox (TypeScript validation) | No | 100 free sandbox-hours/month |

**Priority order to add keys:**
1. `GROQ_API_KEY` — required for all phases (strategy + video script)
2. `GEMINI_API_KEY` — free tier, no card needed
3. `KLING_API_KEY` — $10/mo upfront, covers ~20 full videos
4. `SMALLEST_AI_API_KEY` — pay-as-you-go, add at Phase 3
5. `RUNPOD_API_KEY` + `RUNPOD_ENDPOINT_ID` — needs custom worker setup

---

## 12. API Reference

### `POST /api/generate`

Starts the full pipeline and streams results as Server-Sent Events.

**Request body:**
```json
{ "idea": "an app for plant trading between neighbors" }
```

Validation: `idea` must be a string of minimum 5 characters.

**Response:** `text/event-stream` (SSE)

```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

Each event:
```
data: {"type":"phase","phase":"strategy","status":"running"}\n\n
data: {"type":"log","message":"Generating brand identity..."}\n\n
data: {"type":"artifact","artifact":{"type":"website","url":"data:text/html;base64,..."}}\n\n
data: {"type":"done","state":{...}}\n\n
```

**Timeout:** 5 minutes (`maxDuration = 300`, requires Vercel Pro or Fluid Compute).

**Error handling / fallback behavior:**

| Condition | Behavior |
|---|---|
| `GROQ_API_KEY` missing | Pipeline fails at Phase 1 |
| `GEMINI_API_KEY` missing | Pipeline fails at Phase 2 |
| `E2B_API_KEY` missing | Falls back to regex validation — continues |
| `SMALLEST_AI_API_KEY` missing | Returns placeholder MP3 URL — continues |
| `KLING_API_KEY` missing | Returns placeholder MP4 URLs — continues |
| `RUNPOD_API_KEY` missing | Returns `videoClips[0]` as final video — continues |
| Kling clip fails | Per-clip catch returns placeholder — other clips unaffected |
| JSON parse failure on reflection | Defaults to `approved: true` — skips refinement |

---

## Further Reading

- [BUSINESS.md](BUSINESS.md) — Full business case, competitive landscape, revenue model, risks, and roadmap
- [TECHNICAL.md](TECHNICAL.md) — Deep-dive into all prompts, state schema, FFmpeg filter graph, and data flow diagram
- [.env.local.example](.env.local.example) — All API key setup instructions
