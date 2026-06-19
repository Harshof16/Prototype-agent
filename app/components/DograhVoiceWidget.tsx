"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface Props {
  onTranscript?: (text: string) => void;
}

type CallStatus = "idle" | "connecting" | "connected" | "failed";

export default function DograhVoiceWidget({ onTranscript }: Props) {
  const [status, setStatus] = useState<CallStatus>("idle");
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [widgetReady, setWidgetReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const registeredRef = useRef(false);
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  const widgetSrc = process.env.NEXT_PUBLIC_DOGRAH_WIDGET_SRC;

  // Step 1: inject script tag
  useEffect(() => {
    if (!widgetSrc) return;

    const existing = document.querySelector("script[data-dograh-widget]");
    if (existing) {
      setScriptLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = widgetSrc;
    script.async = true;
    script.setAttribute("data-dograh-widget", "true");
    script.onload = () => setScriptLoaded(true);
    script.onerror = () => setError("Failed to load Dograh widget. Check NEXT_PUBLIC_DOGRAH_WIDGET_SRC.");
    document.body.appendChild(script);
  }, [widgetSrc]);

  // Step 2: poll for window.DograhWidget after script loads (it initialises async)
  useEffect(() => {
    if (!scriptLoaded) return;

    const poll = setInterval(() => {
      if (window.DograhWidget) {
        clearInterval(poll);
        setWidgetReady(true);
      }
    }, 100);

    // give up after 10 s
    const timeout = setTimeout(() => {
      clearInterval(poll);
      if (!window.DograhWidget) {
        setError("Dograh widget failed to initialise.");
      }
    }, 10_000);

    return () => {
      clearInterval(poll);
      clearTimeout(timeout);
    };
  }, [scriptLoaded]);

  // Step 3: register event listeners once widget object is ready
  useEffect(() => {
    if (!widgetReady || registeredRef.current) return;
    const widget = window.DograhWidget!;
    registeredRef.current = true;

    widget.onStatusChange((s) => setStatus(s));
    widget.onCallStart(() => {
      setStatus("connected");
      setError(null);
    });
    widget.onCallEnd((data) => {
      setStatus("idle");
      if (data?.transcript) onTranscriptRef.current?.(data.transcript);
    });
    widget.onError((e) => {
      setError(e.message);
      setStatus("failed");
    });
  }, [widgetReady]);

  const handleToggle = useCallback(async () => {
    const widget = window.DograhWidget;
    if (!widget) {
      setError("Voice agent not ready yet — please wait a moment.");
      return;
    }

    if (status === "connected") {
      widget.end();
      return;
    }

    if (status !== "idle" && status !== "failed") return;

    setError(null);

    // Explicitly request microphone before calling start() so the browser
    // grants access in the same user-gesture frame that start() fires in.
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("Microphone access denied — please allow it in your browser.");
      setStatus("failed");
      return;
    }

    widget.start();
  }, [status]);

  if (!widgetSrc) return null;

  const isActive = status === "connected" || status === "connecting";

  const label =
    status === "connecting" ? "Connecting…" :
    status === "connected"  ? "End voice" :
    status === "failed"     ? "Retry" :
    "Voice";

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={handleToggle}
        disabled={status === "connecting" || (!widgetReady && !error)}
        title={isActive ? "End voice session" : "Speak your startup idea"}
        className={`relative flex items-center gap-1.5 px-4 py-3 rounded-xl border font-medium text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${
          isActive
            ? "border-rose-500/60 bg-rose-950/40 text-rose-300 hover:bg-rose-900/40 shadow-[0_0_16px_rgba(244,63,94,0.25)]"
            : "border-white/15 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white"
        }`}
      >
        {status === "connecting" || (scriptLoaded && !widgetReady && !error) ? (
          <span className="w-4 h-4 border-2 border-zinc-500 border-t-violet-400 rounded-full animate-spin" />
        ) : isActive ? (
          <MicActiveIcon />
        ) : (
          <MicIcon />
        )}
        <span className="whitespace-nowrap">{label}</span>
        {isActive && (
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
        )}
      </button>
      {error && (
        <p className="text-[10px] text-red-400 max-w-[160px] text-center leading-tight">{error}</p>
      )}
    </div>
  );
}

function MicIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  );
}

function MicActiveIcon() {
  return (
    <svg className="w-4 h-4 shrink-0 text-rose-400" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" opacity={0.9} />
      <path fillRule="evenodd" d="M5 10a1 1 0 0 1 1 1 6 6 0 0 0 12 0 1 1 0 1 1 2 0 8 8 0 0 1-7 7.94V21h3a1 1 0 1 1 0 2H8a1 1 0 1 1 0-2h3v-2.06A8 8 0 0 1 4 11a1 1 0 0 1 1-1Z" clipRule="evenodd" />
    </svg>
  );
}
