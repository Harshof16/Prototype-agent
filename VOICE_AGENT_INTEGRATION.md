# Dograh Voice Agent Integration

## Overview

This document describes how the [Dograh](https://www.dograh.com/) open-source voice agent is integrated into Prototype Agent — an AI-powered product studio that turns startup ideas into full launch kits.

The integration adds a **Voice** button to the hero input bar. Clicking it starts a live voice session where the user speaks their startup idea to an AI agent. The spoken idea is captured and auto-filled into the text input, feeding directly into the existing generation pipeline.

---

## Architecture

```
Browser
│
├── DograhVoiceWidget.tsx        ← React component (our UI)
│     │
│     ├── Injects <script> tag → app.dograh.com/embed/dograh-widget.js
│     ├── Polls for window.DograhWidget (async init)
│     ├── Registers event listeners (onCallStart, onCallEnd, onStatusChange, onError)
│     └── Calls window.DograhWidget.start() / .end() on button click
│
└── Dograh Widget (headless mode)
      │
      ├── Opens WebRTC connection to Dograh cloud
      ├── Captures microphone audio (STT)
      ├── Runs LLM via configured workflow
      ├── Speaks response (TTS)
      └── Returns transcript on call end → fills idea input
```

---

## Files

| File | Purpose |
|------|---------|
| `app/components/DograhVoiceWidget.tsx` | React component — the mic button and all widget lifecycle logic |
| `types/dograh.d.ts` | TypeScript declarations for `window.DograhWidget` |
| `app/page.tsx` | Mounts `DograhVoiceWidget` inside `HeroSection`, wires transcript to idea state |
| `.env.local` | Holds `NEXT_PUBLIC_DOGRAH_WIDGET_SRC` — the embed script URL |

---

## Environment Variable

```env
NEXT_PUBLIC_DOGRAH_WIDGET_SRC=https://app.dograh.com/embed/dograh-widget.js?token=<EMBED_TOKEN>&environment=production&apiEndpoint=https://api.dograh.com
```

- **Prefixed `NEXT_PUBLIC_`** so Next.js exposes it to the browser bundle.
- When this variable is absent the component returns `null` — the mic button simply doesn't render. No errors, no broken UI.
- The embed token is scoped to a single Dograh workflow. Rotating it in the dashboard immediately invalidates the old one.

---

## How to Get the Embed Token

1. Go to [app.dograh.com/workflow](https://app.dograh.com/workflow)
2. Create or open a Voice Agent workflow
3. Click the **Widget** tab inside the workflow editor
4. Select **Headless (Bring Your Own UI)** mode
5. Copy the generated `<script>` tag — extract the `src` URL
6. Paste that URL as `NEXT_PUBLIC_DOGRAH_WIDGET_SRC` in `.env.local`
7. Restart the dev server

---

## Component Lifecycle (`DograhVoiceWidget.tsx`)

The component goes through three distinct phases after mounting:

### Phase 1 — Script Injection

```ts
const script = document.createElement("script");
script.src = widgetSrc;          // NEXT_PUBLIC_DOGRAH_WIDGET_SRC
script.async = true;
script.setAttribute("data-dograh-widget", "true");
script.onload = () => setScriptLoaded(true);
document.body.appendChild(script);
```

- Checks if the script is already in the DOM (prevents duplicate injection on re-renders)
- Sets `scriptLoaded = true` when the browser finishes parsing the script

### Phase 2 — Widget Object Poll

```ts
const poll = setInterval(() => {
  if (window.DograhWidget) {
    clearInterval(poll);
    setWidgetReady(true);
  }
}, 100);
```

- The Dograh script does its own async initialisation after parsing
- `window.DograhWidget` is not available immediately at `onload`
- We poll every 100 ms until the object appears (max 10 seconds, then surface an error)

### Phase 3 — Event Listener Registration

```ts
widget.onStatusChange((s) => setStatus(s));
widget.onCallStart(() => setStatus("connected"));
widget.onCallEnd((data) => {
  setStatus("idle");
  if (data?.transcript) onTranscriptRef.current?.(data.transcript);
});
widget.onError((e) => setError(e.message));
```

- Runs exactly once (`registeredRef` guard)
- `onTranscriptRef` is a ref to the latest `onTranscript` prop — avoids stale closures without needing to re-register listeners

---

## Call Flow

```
User clicks Voice button
        │
        ▼
navigator.mediaDevices.getUserMedia({ audio: true })
        │                    │
    Granted              Denied → show error, status = "failed"
        │
        ▼
window.DograhWidget.start()
        │
        ▼
[Dograh WebRTC connection opens]
        │
        ▼
onCallStart fires → status = "connected", pulsing red indicator shown
        │
        ▼
Agent speaks intro (TTS over WebRTC)
        │
        ▼
User speaks startup idea (STT via microphone)
        │
        ▼
Agent LLM processes → responds via TTS
        │
        ▼
User says goodbye / agent ends call
        │
        ▼
onCallEnd fires → status = "idle"
        │       └─ if transcript present → setIdea(transcript)
        ▼
Idea text field auto-filled ✓
```

---

## Why Mic Permission is Requested Explicitly

Browsers require microphone access to be requested inside a **user-gesture handler** (a click event). Dograh's `start()` internally sets up WebRTC, but if the browser hasn't already been asked for mic permission in the same synchronous call stack, it may silently block audio capture — causing the agent to speak (TTS works over a plain WebSocket) but never hear the user (WebRTC mic stream blocked).

Our fix:

```ts
// Inside the button's onClick handler (user gesture ✓)
await navigator.mediaDevices.getUserMedia({ audio: true });
// Permission now granted in this gesture frame
widget.start();
```

This ensures mic permission is granted before Dograh's WebRTC negotiation begins.

---

## TypeScript Declarations (`types/dograh.d.ts`)

```ts
type DograhWidgetStatus = "idle" | "connecting" | "connected" | "failed";

interface DograhWidgetCallEndData {
  transcript?: string;
  duration?: number;
}

interface DograhWidgetAPI {
  start(): void;
  end(): void;
  onStatusChange(handler: (status: DograhWidgetStatus) => void): void;
  onCallStart(handler: () => void): void;
  onCallEnd(handler: (data?: DograhWidgetCallEndData) => void): void;
  onError(handler: (error: Error) => void): void;
}

declare global {
  interface Window {
    DograhWidget?: DograhWidgetAPI;
  }
}
```

TypeScript's `**/*.ts` glob in `tsconfig.json` picks this up automatically — no explicit `include` needed.

---

## UI States

| Status | Button appearance | Behaviour |
|--------|------------------|-----------|
| `idle` (widget loading) | Spinner, disabled | Polling for `window.DograhWidget` |
| `idle` (ready) | Mic icon, "Voice" | Click starts call |
| `connecting` | Spinner, "Connecting…", disabled | `start()` called, WebRTC negotiating |
| `connected` | Active mic icon, "End voice", red pulse | Live call in progress |
| `failed` | Mic icon, "Retry" | Error shown below button |

---

## Dograh Workflow Configuration

The voice agent is a Dograh workflow hosted at `app.dograh.com`. For the Prototype Agent use-case the workflow should be configured as:

```
[Start]
   │
[Greeting Node]
   "Hi! Tell me your startup idea in one sentence."
   │
[Listen / STT Node]   ← Increase silence timeout to 800–1200 ms
   │                     to avoid cutting off mid-sentence
[LLM Agent Node]
   "Acknowledge the idea, ask one clarifying question if needed,
    then say 'Got it! Your idea has been captured.' and end the call."
   │
[End Call]
```

### Key Settings to Configure in Dograh Dashboard

| Setting | Location | Recommended Value |
|---------|----------|------------------|
| Silence timeout (VAD) | STT node or Model config | 800–1200 ms |
| Embed mode | Widget tab | Headless |
| Allowed domains | Widget tab | `localhost:3000`, your production domain |

---

## Self-Hosting Dograh

Dograh is fully open-source (BSD 2-Clause). To self-host:

```bash
git clone https://github.com/dograh-hq/dograh
cd dograh
docker-compose up
```

Dashboard runs at `http://localhost:3010`. Update `NEXT_PUBLIC_DOGRAH_WIDGET_SRC` to point to your instance's embed URL instead of `app.dograh.com`.

---

## Transcript → Idea Pipeline

When a call ends and Dograh returns a transcript:

```ts
// DograhVoiceWidget.tsx
widget.onCallEnd((data) => {
  if (data?.transcript) onTranscriptRef.current?.(data.transcript);
});

// app/page.tsx (HeroSection)
<DograhVoiceWidget onTranscript={(text) => setIdea(text)} />
```

`setIdea` is the same state setter used by the manual text input, so the transcribed idea flows into the existing Validate → Generate pipeline with zero additional wiring.

---

## Dograh SDK Keys (not used by widget)

The Dograh Developer Portal provides two key types unrelated to the widget embed:

| Key | Prefix | Used for |
|-----|--------|---------|
| API Key | `dgr_` | Server-side REST API / `@dograh/sdk` (create workflows, trigger calls programmatically) |
| Model Service Key | `mps_sk_` | Dograh's built-in LLM / TTS / STT services inside your workflow |

Neither is needed for the web widget integration — the embed token in the script URL handles authentication for browser-side calls.

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Mic button doesn't appear | `NEXT_PUBLIC_DOGRAH_WIDGET_SRC` not set | Add env var and restart dev server |
| "Failed to load Dograh widget" error | Wrong script URL or network issue | Verify the embed token URL in Dograh dashboard |
| Agent speaks intro but doesn't hear user | Mic permission blocked | Check browser permission bar; our `getUserMedia` call should prompt automatically |
| Agent cuts off user mid-sentence | VAD silence timeout too short | Increase endpointing delay in Dograh STT config |
| Transcript not auto-filling idea box | `onCallEnd` not returning transcript | Some workflow configs don't return transcript; user types manually |
| Widget works in Dograh dashboard but not in app | `window.DograhWidget` not ready | Fixed by polling — check browser console for errors |
