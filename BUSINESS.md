# Prototype Agent — Business Overview

> From idea to investor-ready prototype in 2 minutes, for $0.30.

---

## Table of Contents

1. [The Problem](#1-the-problem)
2. [The Solution](#2-the-solution)
3. [Who It's For](#3-who-its-for)
4. [What It Produces](#4-what-it-produces)
5. [How It Works — Business View](#5-how-it-works--business-view)
6. [Cost Structure](#6-cost-structure)
7. [Value vs. Traditional Approach](#7-value-vs-traditional-approach)
8. [Competitive Landscape](#8-competitive-landscape)
9. [Revenue Model (If Productized)](#9-revenue-model-if-productized)
10. [Risks & Limitations](#10-risks--limitations)
11. [Roadmap](#11-roadmap)

---

## 1. The Problem

Every startup, side project, or internal initiative begins with the same bottleneck: **the gap between having an idea and being able to show it to someone.**

To validate an idea today, a founder or product manager needs:

| What they need | Who they hire | Time | Cost |
|----------------|--------------|------|------|
| Product document | Business analyst or consultant | 3–5 days | $500–$2,000 |
| Landing page | Freelance designer + developer | 1–2 weeks | $1,500–$5,000 |
| Pitch video / demo reel | Video production agency | 2–4 weeks | $3,000–$15,000 |
| **Total** | 3 separate vendors | **3–6 weeks** | **$5,000–$22,000** |

And that's before anyone has validated whether the idea is worth building.

The result: **most ideas never get prototyped.** Not because they aren't good, but because the cost and friction of producing proof-of-concept material is prohibitive for individuals, early-stage founders, and even internal innovation teams at large companies.

### The specific pain points

**Speed:** By the time a team produces a landing page and a video, the market has moved, the window has closed, or the stakeholder has moved on to the next thing.

**Cost:** $5,000–$22,000 to test an idea that might be invalidated in the first customer conversation is irrational. Most people don't do it.

**Coordination overhead:** Managing a designer, a developer, a copywriter, and a video editor simultaneously — with feedback loops between each — takes as much energy as building the product itself.

**Consistency:** When three different vendors produce three different assets, the brand identity rarely holds across all of them. The landing page uses different language than the video. The product doc uses different terminology than both.

---

## 2. The Solution

**Prototype Agent** is an AI pipeline that takes one sentence and produces three production-ready assets in approximately 2 minutes:

1. A **5-section product document** (strategy, market, features, GTM)
2. A **fully-coded landing page** (React + Tailwind, renders in a browser)
3. A **30-second intro video** (AI voiceover + AI video clips, stitched together)

Total cost per run: **~$0.30.**

The key insight is not just that AI can do each of these tasks individually — tools for that already exist. The insight is that **a single shared brand identity drives all three outputs simultaneously.** The same brand name, color palette, tone, target audience, and messaging thread runs through the document, the website, and the video. No coordination required. No consistency gaps.

This is the difference between three AI tools and one AI agent.

---

## 3. Who It's For

### Primary users

**Solo founders and indie hackers**
Building in public, testing multiple ideas per month, no budget to hire. Need to go from idea to something shareable in hours, not weeks.

**Product managers at enterprises**
Need to socialize a new initiative internally before getting headcount approved. A polished one-pager, a landing page, and a video deck dramatically increases the chance of getting a green light.

**Startup accelerators and incubators**
Running cohorts of 20–50 companies, each of which needs prototype materials for demo day. Currently this requires each team to build their own — slow, expensive, inconsistent.

**Venture studios and venture builders**
Systematically generating and testing startup concepts. Currently the bottleneck is prototyping speed. Reducing prototype cost from $10,000 to $0.30 changes the unit economics of the entire studio model.

**Consultants and agency account teams**
Pitching a new concept to a client. A working website preview and a video produced in 2 minutes before the meeting starts is a significant competitive advantage.

### Secondary users

- Students and researchers pitching thesis projects or grant applications
- Non-technical domain experts who have product ideas but no development background
- Marketing teams testing new campaign angles before committing to production

---

## 4. What It Produces

### Output 1 — Product Document (Markdown / PDF)
A structured 5-section document written by an AI strategist that has reflected on the idea and refined it:

- **Executive Summary** — the core value proposition in 2–3 paragraphs
- **Problem & Solution** — the pain point and how this product addresses it
- **Target Market** — who the customer is and why they'll pay
- **Core Features** — bulleted feature list, prioritized
- **Go-to-Market Strategy** — how to reach the first 100 customers

This is not a generic template filled in with keywords. The document is generated from a brand identity that includes tone, audience, and competitive positioning — then reviewed by a second AI pass for logical flow before being written.

### Output 2 — Landing Page (React + Tailwind)
A fully coded, mobile-responsive single-page website built to the brand spec:

- Hero section with brand name and tagline
- Feature sections drawn from the sitemap
- Brand colors applied throughout via Tailwind
- Renders immediately in the browser — shareable as a hosted URL or static file

The code is validated in a sandboxed environment and auto-corrected if it fails compilation — up to 2 attempts before surfacing to the user.

### Output 3 — Intro Video (MP4, 1920×1080)
A 30-second produced video ready for a pitch deck, a tweet, or a product hunt launch:

- AI-written voiceover script (~75 words, punchy, no jargon)
- Human-quality narration via text-to-speech
- 4 AI-generated cinematic clips (product reveal, lifestyle, feature close-up, brand outro)
- Lower-thirds with brand name and tagline baked in
- Exported as 1080p H.264 MP4

---

## 5. How It Works — Business View

The agent runs as 4 sequential stages. Each stage feeds its output into the next — nothing is repeated, nothing is inconsistent.

```
Your idea (one sentence)
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│  STAGE 1: STRATEGY  (~20 seconds)                           │
│  AI strategist builds brand identity + sitemap              │
│  Then self-reviews: "Does this make sense for the market?"  │
│  Refines if needed. Writes the product document.            │
│                                                             │
│  Output: brand name, tagline, colors, tone, audience,       │
│          5-page sitemap, product doc                        │
└─────────────────────────────────────────────────────────────┘
        │  brand identity flows into all 3 outputs below
        ▼
┌─────────────────────────────────────────────────────────────┐
│  STAGE 2: WEBSITE  (~15 seconds)                            │
│  AI writes the full landing page code                       │
│  Validates it compiles. Auto-fixes if broken.               │
│                                                             │
│  Output: working React/Tailwind landing page                │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│  STAGE 3: MEDIA  (~90 seconds, clips run in parallel)       │
│  AI writes the voiceover script from the product doc        │
│  Text-to-speech converts it to audio                        │
│  4 branded video clips generated simultaneously             │
│                                                             │
│  Output: MP3 voiceover + 4 × 5-second MP4 clips            │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│  STAGE 4: STITCH  (~30 seconds)                             │
│  Clips concatenated, voiceover overlaid                     │
│  Brand name + tagline added as lower-thirds text            │
│  Exported as 1080p H.264 MP4                                │
│                                                             │
│  Output: final video ready to share                         │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
Product doc + Landing page + Video  ←  ready in ~2 minutes
```

The user watches this happen in real time via a live progress dashboard — no waiting, no black box.

---

## 6. Cost Structure

### Per-run cost breakdown (~$0.30 total)

| Stage | Service used | Role | Cost per run |
|-------|-------------|------|-------------|
| Strategy (3 AI calls) | DeepSeek V4 Pro | Brand strategy + product doc | ~$0.002 |
| Website (1–3 AI calls) | Gemini 2.5 Flash | Landing page code generation | ~$0.001 |
| Code validation | E2B sandbox | Compile-checks the code | ~$0.001 |
| Voiceover (30 sec) | Smallest.ai Waves | Text-to-speech narration | ~$0.060 |
| Video clips (4 × 5 sec) | Kling 3.0 | AI video generation | ~$0.20–0.40 |
| Video render (2 min GPU) | RunPod Serverless | FFmpeg stitch + encode | ~$0.020 |
| **Total** | | | **~$0.28–0.48** |

The video clips account for ~85% of total cost. Everything else — strategy, website, voiceover, rendering — costs under $0.10 combined.

### Monthly infrastructure cost (fixed)

| Service | Plan | Monthly cost |
|---------|------|-------------|
| Kling 3.0 | Starter subscription | $10.00 |
| Vercel (hosting) | Hobby / Pro | $0–$20 |
| RunPod | Pay-per-use, no base fee | $0 |
| All others | Pay-per-use | $0 |
| **Total fixed** | | **$10–$30/month** |

### Cost at scale

| Monthly runs | Variable cost | Fixed cost | Total | Cost per run |
|-------------|--------------|-----------|-------|-------------|
| 10 | ~$3 | $20 | ~$23 | ~$2.30 |
| 100 | ~$30 | $20 | ~$50 | ~$0.50 |
| 500 | ~$150 | $20 | ~$170 | ~$0.34 |
| 1,000 | ~$300 | $20 | ~$320 | ~$0.32 |
| 5,000 | ~$1,500 | $20 | ~$1,520 | ~$0.30 |

At 1,000+ runs/month the fixed Kling subscription becomes negligible and the per-run cost stabilises at ~$0.30.

### Budget-mode cost (no video generation)
If Kling/RunPod keys are not configured, the agent produces the product doc and landing page only:

| Run cost (doc + website only) | ~$0.004 |
|-------------------------------|---------|
| 1,000 runs/month | ~$4 total |

This is the Week 1–2 configuration — essentially free at any scale.

---

## 7. Value vs. Traditional Approach

### Head-to-head comparison

| | Traditional approach | Prototype Agent |
|--|---------------------|----------------|
| **Time to first draft** | 3–6 weeks | 2 minutes |
| **Cost per prototype** | $5,000–$22,000 | $0.30 |
| **Vendors required** | 3–5 | 0 |
| **Brand consistency** | Depends on briefing | Guaranteed (shared state) |
| **Iteration cost** | Full cost again | $0.30 again |
| **Barrier to test an idea** | High (budget approval) | None |

### The iteration advantage

The most undervalued aspect is not the first prototype — it's the second and third. With a traditional workflow, iterating means briefing vendors again, waiting again, paying again. Most ideas never get iterated because the cost is prohibitive.

At $0.30 per run, a founder can test 10 variations of an idea in an afternoon for $3. That changes the quality of ideas that reach market — not because the agent makes better decisions, but because it removes the economic penalty for being wrong early.

### The speed advantage — compounding over time

Speed compounds. A team that can prototype in 2 minutes instead of 6 weeks will run 10× more experiments per quarter. Over a year, that is the difference between having validated one idea versus having validated forty.

---

## 8. Competitive Landscape

### Direct alternatives

| Tool | What it does | Gap vs. Prototype Agent |
|------|-------------|------------------------|
| **Framer AI** | Generates website from prompt | Website only. No doc, no video. No brand strategy layer. |
| **Gamma** | Generates pitch decks from prompt | Deck/doc only. No working code, no video. |
| **HeyGen / Synthesia** | AI video from script | Video only. No strategy, no website. Requires manual script. |
| **Webflow AI** | Assists website building | Requires manual design decisions. No doc, no video. |
| **Notion AI** | Writes product docs | Document only. No visual outputs. |
| **v0 by Vercel** | UI generation from prompt | Code only. No strategy, no brand, no video. |

### The gap none of them fill

Every existing tool is a single-output tool. You get a website, or a video, or a document. None of them:

1. Start from a raw idea (they require a brief, not a sentence)
2. Build a brand identity first and use it to drive all outputs
3. Produce all three asset types in a single run
4. Self-review and refine their own outputs before delivering

The closest workflow today is: use ChatGPT to write a brief → paste it into Framer → paste the script into HeyGen → combine manually. That takes hours, costs more, and produces inconsistent results.

### Moat

The moat is not any individual AI model — those are commodities. The moat is the **pipeline architecture**: the shared state schema that carries brand identity, tone, and messaging through every output simultaneously. That is an engineering and product design decision, not a model capability.

---

## 9. Revenue Model (If Productized)

### Option A — Credit-based SaaS

Users purchase credits. Each full pipeline run costs 1 credit.

| Tier | Price | Credits | Cost/credit | Margin at $0.30 COGS |
|------|-------|---------|------------|----------------------|
| Starter | $9/mo | 10 credits | $0.90 | 67% |
| Growth | $29/mo | 50 credits | $0.58 | 48% |
| Studio | $99/mo | 200 credits | $0.50 | 40% |
| Agency | $299/mo | 750 credits | $0.40 | 25% |

### Option B — Per-output pricing

Charge separately for each output type, unbundled:

- Product doc only: $2
- Landing page only: $5
- Full run (doc + page + video): $15

Captures users who only need one output without forcing them into a subscription.

### Option C — Embedded / white-label API

Sell API access to accelerators, venture studios, and agencies who embed the pipeline into their own tools or workflows.

- $0.50–$2.00 per API call (vs. $0.30 COGS)
- Minimum commitment: $500/month
- Target: 50–200 studios and accelerators globally

### Option D — Enterprise licensing

For large innovation teams (corporate R&D, strategy consulting firms) that need high-volume, white-labelled, on-premise or private-cloud deployment.

- Annual license: $50,000–$200,000
- Includes custom model fine-tuning on company brand guidelines
- Dedicated infrastructure, SLA, support

---

## 10. Risks & Limitations

### Output quality ceiling
AI-generated assets are starting points, not finished products. The landing page will need human design polish before going live. The video will not replace a professionally shot brand film. The product document will not replace a real market research engagement. The value proposition is speed and cost for early-stage validation, not production-grade final output.

### Model dependency
The pipeline relies on four separate third-party AI APIs (DeepSeek, Gemini, Smallest.ai, Kling). Any of these services experiencing downtime, pricing changes, or API breaking changes will affect the pipeline. Mitigation: the agent is designed with model-swappable architecture — each model can be replaced independently.

### Video generation bottleneck
Kling video generation is the slowest step (~90 seconds per set of 4 clips) and the most expensive (~85% of total cost). It is also the step most susceptible to quality variance — AI video can hallucinate artifacts, inconsistent motion, or off-brand visuals. Mitigation: the alternative Remotion approach (animating website screenshots instead of generating new AI video) eliminates this dependency entirely at near-zero cost.

### Content appropriateness
A fully automated pipeline has no human review layer before outputting content. A malicious or careless prompt could produce inappropriate brand names, problematic copy, or off-brand video content. Any production deployment requires input validation and output moderation.

### No memory / personalization
Currently each run is stateless — the agent has no knowledge of previous runs for the same user or project. A user who runs the agent twice on the same idea gets two independent outputs. Persistent sessions, brand guidelines memory, and iterative refinement are future work.

---

## 11. Roadmap

### Week 1 — Foundation (current)
- [x] DeepSeek strategy agent with reflection loop
- [x] Product document generation
- [x] SSE streaming pipeline
- [x] Live progress UI

### Week 2 — Website
- [x] Gemini Flash landing page generation
- [x] E2B sandbox code validation with auto-fix
- [x] Iframe preview in browser

### Week 3 — Media
- [x] Video script generation
- [x] Smallest.ai voiceover integration
- [x] Kling 3.0 video clip generation (parallel)

### Week 4 — Automation
- [x] RunPod FFmpeg stitch with lower-thirds
- [x] Full one-click pipeline: idea → PDF + URL + video
- [ ] PDF export of product document
- [ ] Hosted website URL (Vercel deploy via API)
- [ ] Email delivery of outputs

### Beyond v1
- [ ] Remotion-based video (animate website screenshots, eliminates Kling dependency)
- [ ] Persistent brand profiles (re-run with same brand, iterate on outputs)
- [ ] Multiple landing page variants (A/B testing generation)
- [ ] Custom voice cloning for voiceover
- [ ] Figma export of brand identity
- [ ] Slack / Notion integration for team sharing
- [ ] Fine-tuning on user's existing brand guidelines
- [ ] Multi-language output

---

## Summary

| Dimension | Detail |
|-----------|--------|
| **Core value** | Collapse 6 weeks and $5,000–$22,000 of prototype work into 2 minutes and $0.30 |
| **Primary output** | Product doc + landing page + intro video, brand-consistent across all three |
| **Primary user** | Founders, PMs, venture studios who need to validate ideas fast |
| **Cost per run** | ~$0.30 (full pipeline) / ~$0.004 (doc + website only) |
| **Monthly fixed cost** | $10–$30 (Kling subscription + hosting) |
| **Gross margin at $9 retail** | ~97% variable margin, ~65% contribution margin |
| **Key risk** | Output is prototype-grade, not production-grade — manages expectations |
| **Key moat** | Shared brand state across all outputs — not replicated by any single-output AI tool |
