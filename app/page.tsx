"use client";

import { useState, useRef, useCallback } from "react";
import type { StreamEvent, AgentState, PhaseStatus } from "@/lib/types";

// ── Sub-components ────────────────────────────────────────────────────────

function PhaseIndicator({
  label,
  status,
  icon,
  step,
}: {
  label: string;
  status: PhaseStatus;
  icon: string;
  step: number;
}) {
  const config: Record<PhaseStatus, { border: string; glow: string; dot: string; text: string; bg: string }> = {
    pending: {
      border: "border-white/10",
      glow: "",
      dot: "bg-zinc-600",
      text: "text-zinc-500",
      bg: "bg-white/3",
    },
    running: {
      border: "border-violet-500/60",
      glow: "shadow-[0_0_20px_rgba(139,92,246,0.3)]",
      dot: "bg-violet-400 animate-ping",
      text: "text-violet-300",
      bg: "bg-violet-950/40",
    },
    done: {
      border: "border-emerald-500/50",
      glow: "shadow-[0_0_15px_rgba(16,185,129,0.2)]",
      dot: "bg-emerald-400",
      text: "text-emerald-300",
      bg: "bg-emerald-950/30",
    },
    error: {
      border: "border-red-500/50",
      glow: "shadow-[0_0_15px_rgba(239,68,68,0.2)]",
      dot: "bg-red-400",
      text: "text-red-300",
      bg: "bg-red-950/30",
    },
  };

  const c = config[status];

  return (
    <div className={`relative flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-sm transition-all duration-500 ${c.border} ${c.glow} ${c.bg}`}>
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/5 border border-white/10 shrink-0">
        <span className="text-base leading-none">{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-bold uppercase tracking-wider truncate ${c.text}`}>{label}</p>
        <p className="text-xs text-zinc-600 capitalize mt-0.5">{status}</p>
      </div>
      <div className="relative flex items-center justify-center w-3 h-3">
        <span className={`absolute w-2.5 h-2.5 rounded-full ${c.dot}`} />
        {status === "running" && (
          <span className="absolute w-2.5 h-2.5 rounded-full bg-violet-400 animate-ping opacity-75" />
        )}
      </div>
    </div>
  );
}

function ArtifactCard({
  artifact,
}: {
  artifact: NonNullable<StreamEvent["artifact"]>;
}) {
  const icons: Record<string, string> = {
    website: "🌐",
    video: "🎬",
    pdf: "📄",
    voiceover: "🎙️",
  };

  const colors: Record<string, string> = {
    website: "from-blue-600/20 to-cyan-600/10 border-blue-500/30 hover:border-blue-400/60",
    video: "from-violet-600/20 to-purple-600/10 border-violet-500/30 hover:border-violet-400/60",
    pdf: "from-amber-600/20 to-orange-600/10 border-amber-500/30 hover:border-amber-400/60",
    voiceover: "from-pink-600/20 to-rose-600/10 border-pink-500/30 hover:border-pink-400/60",
  };

  const cls = colors[artifact.type] ?? "from-zinc-600/20 to-zinc-700/10 border-zinc-500/30 hover:border-zinc-400/60";

  return (
    <a
      href={artifact.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border bg-gradient-to-r backdrop-blur-sm transition-all duration-300 group ${cls}`}
    >
      <span className="text-2xl">{icons[artifact.type] ?? "📦"}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white group-hover:text-white/90">{artifact.label}</p>
        <p className="text-xs text-zinc-500 truncate mt-0.5">{artifact.url.slice(0, 55)}…</p>
      </div>
      <span className="text-zinc-500 group-hover:text-white text-sm transition-colors">↗</span>
    </a>
  );
}

function BrandCard({ brand }: { brand: AgentState["brandIdentity"] }) {
  if (!brand) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-5 space-y-3">
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-full border-2 border-white/20 shadow-lg"
          style={{ background: brand.colors.primary }}
        />
        <div>
          <h3 className="font-bold text-white text-base leading-tight">{brand.name}</h3>
          <p className="text-zinc-400 text-xs italic mt-0.5">{brand.tagline}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-zinc-400">
          Tone: <span className="text-zinc-200">{brand.tone}</span>
        </span>
        <span className="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-zinc-400">
          Audience: <span className="text-zinc-200">{brand.targetAudience}</span>
        </span>
      </div>
      <div className="flex gap-2 flex-wrap">
        {Object.entries(brand.colors).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1.5">
            <div
              className="w-4 h-4 rounded border border-white/20 shadow"
              style={{ background: v as string }}
            />
            <span className="text-zinc-500 text-xs capitalize">{k}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WebsitePreview({ code }: { code: string }) {
  const blob = new Blob(
    [`<!DOCTYPE html><html><body>${code}</body></html>`],
    { type: "text/html" }
  );
  const url = URL.createObjectURL(blob);
  return (
    <div className="rounded-xl border border-white/10 overflow-hidden backdrop-blur-sm">
      <div className="bg-black/40 px-4 py-2.5 flex items-center gap-2 border-b border-white/10">
        <div className="flex gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-500/80" />
          <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <span className="w-3 h-3 rounded-full bg-green-500/80" />
        </div>
        <span className="text-zinc-500 text-xs font-mono ml-2">Generated Website Preview</span>
      </div>
      <iframe
        src={url}
        className="w-full h-80 bg-white"
        sandbox="allow-scripts"
        title="Generated website preview"
      />
    </div>
  );
}

// ── Decorative background orbs ─────────────────────────────────────────────

function BackgroundOrbs() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Top-left violet orb */}
      <div className="absolute -top-48 -left-48 w-[600px] h-[600px] rounded-full bg-violet-600/15 blur-[120px]" />
      {/* Top-right blue orb */}
      <div className="absolute -top-24 right-0 w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[120px]" />
      {/* Bottom-center indigo orb */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full bg-indigo-700/10 blur-[120px]" />
      {/* Mid right faint pink */}
      <div className="absolute top-1/2 -right-32 w-[400px] h-[400px] rounded-full bg-fuchsia-700/8 blur-[100px]" />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Subtle noise texture via radial gradient dots */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
    </div>
  );
}

// ── Hero section ───────────────────────────────────────────────────────────

function HeroSection({
  idea,
  setIdea,
  running,
  onSubmit,
}: {
  idea: string;
  setIdea: (v: string) => void;
  running: boolean;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <section className="relative text-center pt-20 pb-16 px-4">
      {/* Badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300 text-xs font-medium mb-8 backdrop-blur-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
        AI-Powered Product Studio
      </div>

      {/* Headline */}
      <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[1.05] mb-6">
        <span className="bg-gradient-to-br from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent">
          One idea.
        </span>
        <br />
        <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-blue-400 bg-clip-text text-transparent">
          Full launch kit.
        </span>
      </h1>

      {/* Sub-headline */}
      <p className="text-zinc-400 text-lg md:text-xl max-w-xl mx-auto mb-3 leading-relaxed">
        Describe your startup idea and get a product doc, landing page,
        and intro video in under two minutes.
      </p>

      {/* Feature pills */}
      <div className="flex flex-wrap justify-center gap-2 mb-12 text-xs text-zinc-500">
        {["Strategy & Branding", "Landing Page Code", "Voiceover", "Promo Video"].map((f) => (
          <span key={f} className="px-3 py-1 rounded-full border border-white/8 bg-white/4 backdrop-blur-sm">
            {f}
          </span>
        ))}
      </div>

      {/* Input form */}
      <form onSubmit={onSubmit} className="max-w-2xl mx-auto">
        <div className="relative flex items-center gap-0 rounded-2xl border border-white/15 bg-white/5 backdrop-blur-md p-1.5 shadow-[0_0_40px_rgba(139,92,246,0.15)] focus-within:border-violet-500/50 focus-within:shadow-[0_0_50px_rgba(139,92,246,0.25)] transition-all duration-300">
          <input
            type="text"
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="Describe your startup idea in one sentence…"
            disabled={running}
            className="flex-1 bg-transparent px-4 py-3 text-zinc-100 placeholder-zinc-600 focus:outline-none text-sm disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={running || idea.trim().length < 5}
            className="relative px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 disabled:from-zinc-700 disabled:to-zinc-700 disabled:text-zinc-500 font-semibold text-sm text-white transition-all duration-200 flex items-center gap-2 whitespace-nowrap shadow-[0_0_20px_rgba(139,92,246,0.4)] disabled:shadow-none"
          >
            {running ? (
              <>
                <span className="w-4 h-4 border-2 border-zinc-400 border-t-white rounded-full animate-spin" />
                Generating…
              </>
            ) : (
              <>
                Generate
                <span className="text-violet-300">→</span>
              </>
            )}
          </button>
        </div>
        <p className="text-zinc-600 text-xs mt-3">
          Takes ~2 minutes · Powered by DeepSeek, Gemini & Kling AI
        </p>
      </form>
    </section>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────

type Phases = AgentState["phases"];

export default function Home() {
  const [idea, setIdea] = useState("");
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [phases, setPhases] = useState<Phases>({
    strategy: "pending",
    website: "pending",
    media: "pending",
    stitching: "pending",
  });
  const [artifacts, setArtifacts] = useState<NonNullable<StreamEvent["artifact"]>[]>([]);
  const [brand, setBrand] = useState<AgentState["brandIdentity"]>();
  const [websiteCode, setWebsiteCode] = useState<string>();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string>();
  const logsEndRef = useRef<HTMLDivElement>(null);

  const scrollLogs = useCallback(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!idea.trim() || running) return;

    setRunning(true);
    setDone(false);
    setError(undefined);
    setLogs([]);
    setArtifacts([]);
    setBrand(undefined);
    setWebsiteCode(undefined);
    setPhases({ strategy: "pending", website: "pending", media: "pending", stitching: "pending" });

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea }),
      });

      if (!res.body) throw new Error("No response stream");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const event: StreamEvent = JSON.parse(line.slice(6));

          if (event.type === "log" && event.message) {
            setLogs((prev) => [...prev, event.message!]);
            scrollLogs();
          } else if (event.type === "phase" && event.phase && event.status) {
            setPhases((prev) => ({ ...prev, [event.phase!]: event.status! }));
            if (event.state?.brandIdentity) setBrand(event.state.brandIdentity);
          } else if (event.type === "artifact" && event.artifact) {
            setArtifacts((prev) => [...prev, event.artifact!]);
            if (event.artifact.type === "website") {
              const b64 = event.artifact.url.replace("data:text/html;base64,", "");
              const decoded = atob(b64);
              setWebsiteCode(decoded);
            }
          } else if (event.type === "done") {
            if (event.state?.brandIdentity) setBrand(event.state.brandIdentity);
            setDone(true);
            setRunning(false);
          } else if (event.type === "error") {
            setError(event.message);
            setRunning(false);
          }
        }
      }
    } catch (e: unknown) {
      setError((e as Error).message);
      setRunning(false);
    }
  }

  const phaseConfig: { key: keyof Phases; label: string; icon: string }[] = [
    { key: "strategy", label: "Strategy", icon: "🧠" },
    { key: "website", label: "Website", icon: "🏗️" },
    { key: "media", label: "Media", icon: "🎬" },
    { key: "stitching", label: "Stitching", icon: "✂️" },
  ];

  const hasOutput = running || done || !!error;

  return (
    <main className="min-h-screen bg-[#080810] text-zinc-100 relative overflow-x-hidden">
      <BackgroundOrbs />

      <div className="relative z-10 max-w-5xl mx-auto">
        {/* Hero / Input */}
        <HeroSection
          idea={idea}
          setIdea={setIdea}
          running={running}
          onSubmit={handleSubmit}
        />

        {/* Pipeline phases */}
        {hasOutput && (
          <section className="px-4 mb-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {phaseConfig.map(({ key, label, icon }, i) => (
                <PhaseIndicator key={key} label={label} status={phases[key]} icon={icon} step={i + 1} />
              ))}
            </div>
          </section>
        )}

        {/* Output grid */}
        {hasOutput && (
          <section className="px-4 pb-16">
            <div className="grid md:grid-cols-2 gap-5">
              {/* Left: logs + brand */}
              <div className="space-y-4">
                {logs.length > 0 && (
                  <div className="rounded-xl border border-white/8 bg-white/3 backdrop-blur-sm overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/8">
                      <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Live Log</span>
                      <span className="flex items-center gap-1.5 text-[10px] text-zinc-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Streaming
                      </span>
                    </div>
                    <div className="p-4 font-mono text-xs text-zinc-500 space-y-1 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                      {logs.map((log, i) => (
                        <div key={i} className="flex gap-2 hover:text-zinc-300 transition-colors">
                          <span className="text-zinc-700 select-none shrink-0">{String(i + 1).padStart(3, "0")}</span>
                          <span>{log}</span>
                        </div>
                      ))}
                      <div ref={logsEndRef} />
                    </div>
                  </div>
                )}
                {brand && <BrandCard brand={brand} />}
              </div>

              {/* Right: artifacts + preview */}
              <div className="space-y-4">
                {artifacts.length > 0 && (
                  <div className="space-y-2">
                    <h2 className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest px-1">Artifacts</h2>
                    {artifacts.map((a, i) => (
                      <ArtifactCard key={i} artifact={a} />
                    ))}
                  </div>
                )}
                {websiteCode && <WebsitePreview code={websiteCode} />}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="mt-5 rounded-xl border border-red-500/30 bg-red-950/30 backdrop-blur-sm px-5 py-4 text-red-300 text-sm flex items-start gap-3">
                <span className="text-lg mt-0.5">⚠️</span>
                <div>
                  <p className="font-semibold text-red-200">Pipeline error</p>
                  <p className="text-red-400 text-xs mt-1">{error}</p>
                </div>
              </div>
            )}

            {/* Done */}
            {done && (
              <div className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 backdrop-blur-sm px-5 py-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-xl shrink-0">
                  ✅
                </div>
                <div>
                  <p className="font-semibold text-emerald-300">Pipeline complete!</p>
                  <p className="text-emerald-600 text-xs mt-0.5">Your product doc, website, and video are ready above.</p>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Footer (only on idle) */}
        {!hasOutput && (
          <footer className="pb-16 text-center text-zinc-700 text-xs space-y-1">
            <p>Built with DeepSeek · Gemini · Kling · Smallest.ai · RunPod</p>
          </footer>
        )}
      </div>
    </main>
  );
}
