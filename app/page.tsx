"use client";

import { useState, useRef, useCallback } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
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

function downloadPDF(doc: string, brandName?: string) {
  import("jspdf").then(({ jsPDF }) => {
    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 48;
    const pageW = pdf.internal.pageSize.getWidth();
    const maxW = pageW - margin * 2;
    let y = margin;

    const lines = doc.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) { y += 8; continue; }

      if (trimmed.startsWith("## ")) {
        if (y > margin) y += 8;
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(14);
        pdf.setTextColor(40, 40, 40);
        const wrapped = pdf.splitTextToSize(trimmed.replace(/^##\s*/, ""), maxW);
        pdf.text(wrapped, margin, y);
        y += wrapped.length * 18 + 4;
        pdf.setDrawColor(200, 200, 200);
        pdf.line(margin, y, pageW - margin, y);
        y += 10;
      } else if (trimmed.startsWith("### ")) {
        y += 4;
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(11);
        pdf.setTextColor(60, 60, 60);
        const wrapped = pdf.splitTextToSize(trimmed.replace(/^###\s*/, ""), maxW);
        pdf.text(wrapped, margin, y);
        y += wrapped.length * 15 + 4;
      } else {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        pdf.setTextColor(80, 80, 80);
        const wrapped = pdf.splitTextToSize(trimmed, maxW);
        pdf.text(wrapped, margin, y);
        y += wrapped.length * 13;
      }

      if (y > pdf.internal.pageSize.getHeight() - margin) {
        pdf.addPage();
        y = margin;
      }
    }

    pdf.save(`${brandName ?? "product-doc"}.pdf`);
  });
}

function downloadDOCX(doc: string, brandName?: string) {
  const htmlBody = doc
    .split("\n")
    .map((line) => {
      const t = line.trim();
      if (!t) return "<p>&nbsp;</p>";
      if (t.startsWith("### ")) return `<h3>${t.replace(/^###\s*/, "")}</h3>`;
      if (t.startsWith("## ")) return `<h2>${t.replace(/^##\s*/, "")}</h2>`;
      if (t.startsWith("# ")) return `<h1>${t.replace(/^#\s*/, "")}</h1>`;
      return `<p>${t}</p>`;
    })
    .join("\n");

  const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office'
    xmlns:w='urn:schemas-microsoft-com:office:word'
    xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset='utf-8'/><title>${brandName ?? "Product Document"}</title>
<style>
  body { font-family: Calibri, sans-serif; font-size: 11pt; color: #222; margin: 1in; }
  h1 { font-size: 18pt; color: #1a1a2e; border-bottom: 1px solid #ccc; padding-bottom: 4pt; }
  h2 { font-size: 14pt; color: #2d2d5e; margin-top: 14pt; }
  h3 { font-size: 12pt; color: #444; margin-top: 10pt; }
  p  { line-height: 1.5; margin: 4pt 0; }
</style></head>
<body>${htmlBody}</body></html>`;

  const blob = new Blob([html], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${brandName ?? "product-doc"}.doc`;
  a.click();
  URL.revokeObjectURL(url);
}

function ProductDocCard({ doc, brandName }: { doc: string; brandName?: string }) {
  const sections = doc.split(/\n(?=###?\s)/).filter(Boolean);

  return (
    <div className="rounded-xl border border-white/10 bg-white/3 backdrop-blur-sm overflow-hidden h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/8 shrink-0">
        <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Product Document</span>
        <div className="flex gap-1">
          <button
            onClick={() => downloadPDF(doc, brandName)}
            className="px-2.5 py-1 text-[10px] rounded bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-zinc-200 border border-white/10 transition-colors"
            title="Download PDF"
          >
            PDF
          </button>
          <button
            onClick={() => downloadDOCX(doc, brandName)}
            className="px-2.5 py-1 text-[10px] rounded bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-zinc-200 border border-white/10 transition-colors"
            title="Download DOCX"
          >
            DOCX
          </button>
        </div>
      </div>
      <div className="p-4 space-y-4 overflow-y-auto max-h-[480px] scrollbar-thin scrollbar-thumb-white/10 flex-1">
        {sections.map((section, i) => {
          const lines = section.trim().split("\n");
          const heading = lines[0].replace(/^###?\s*/, "");
          const body = lines.slice(1).join("\n").trim();
          return (
            <div key={i} className="space-y-1.5">
              <p className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wide">{heading}</p>
              <p className="text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap">{body}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function buildPreviewHtml(code: string): string {
  // Remove TS-only constructs that @babel/standalone typescript preset can't handle at runtime
  const cleaned = code
    // Remove "import type" lines
    .replace(/^import type\s.+$/gm, "")
    // Remove "import ... from 'next/...'" — no Next.js in iframe
    .replace(/^import\s.+from\s['"]next\/.+['"];?\s*$/gm, "")
    // Remove "import React" — React is global via UMD
    .replace(/^import\s+React.*from\s+['"]react['"];?\s*$/gm, "")
    // Remove "export default" — we call LandingPage directly
    .replace(/export\s+default\s+/, "");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel" data-presets="react,typescript">
${cleaned}

const domRoot = document.getElementById('root');
const reactRoot = ReactDOM.createRoot(domRoot);
reactRoot.render(React.createElement(LandingPage));
  </script>
</body>
</html>`;
}

function WebsitePreview({ code }: { code: string }) {
  const [tab, setTab] = useState<"preview" | "code">("preview");
  const html = buildPreviewHtml(code);

  return (
    <div className="rounded-xl border border-white/10 overflow-hidden backdrop-blur-sm">
      <div className="bg-black/40 px-4 py-2.5 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500/80" />
            <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <span className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <span className="text-zinc-500 text-xs font-mono ml-1">Generated Website</span>
        </div>
        <div className="flex gap-1 text-[10px]">
          <button
            onClick={() => setTab("preview")}
            className={`px-2.5 py-1 rounded transition-colors ${tab === "preview" ? "bg-white/10 text-zinc-200" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            Preview
          </button>
          <button
            onClick={() => setTab("code")}
            className={`px-2.5 py-1 rounded transition-colors ${tab === "code" ? "bg-white/10 text-zinc-200" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            Code
          </button>
        </div>
      </div>
      {tab === "preview" ? (
        <iframe
          srcDoc={html}
          className="w-full h-[600px] bg-white"
          sandbox="allow-scripts"
          title="Generated website preview"
        />
      ) : (
        <pre className="p-4 text-xs text-zinc-400 overflow-auto max-h-[600px] scrollbar-thin scrollbar-thumb-white/10 leading-relaxed">
          {code}
        </pre>
      )}
    </div>
  );
}

// ── Auth bar ──────────────────────────────────────────────────────────────

function UserBar() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="fixed top-4 right-4 z-50">
        <div className="h-9 w-24 rounded-xl bg-white/5 animate-pulse border border-white/10" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={() => signIn("google")}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-zinc-900 font-semibold text-sm hover:bg-zinc-100 transition-colors shadow-lg"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
      {session.user?.image && (
        <img
          src={session.user.image}
          alt={session.user.name ?? "User avatar"}
          className="w-8 h-8 rounded-full border border-white/20"
        />
      )}
      <span className="text-zinc-300 text-sm hidden sm:block">{session.user?.name}</span>
      <button
        onClick={() => signOut()}
        className="px-3 py-1.5 rounded-lg bg-white/8 hover:bg-white/15 border border-white/10 text-zinc-400 hover:text-zinc-200 text-xs transition-colors"
      >
        Sign out
      </button>
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
          Takes ~2 minutes · Powered by Gemini & Kling AI
        </p>
      </form>
    </section>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────

type Phases = AgentState["phases"];
type PhaseKey = keyof Phases;
type LogEntry = { phase: PhaseKey; message: string };

export default function Home() {
  const [idea, setIdea] = useState("");
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [phases, setPhases] = useState<Phases>({
    strategy: "pending",
    website: "pending",
    media: "pending",
    stitching: "pending",
  });
  const [artifacts, setArtifacts] = useState<NonNullable<StreamEvent["artifact"]>[]>([]);
  const [brand, setBrand] = useState<AgentState["brandIdentity"]>();
  const [productDoc, setProductDoc] = useState<string>();
  const [websiteCode, setWebsiteCode] = useState<string>();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string>();
  const logsEndRef = useRef<HTMLDivElement>(null);
  const activePhaseRef = useRef<PhaseKey>("strategy");

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
    setProductDoc(undefined);
    setWebsiteCode(undefined);
    activePhaseRef.current = "strategy";
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

        // Parse all events in this chunk first
        const events: StreamEvent[] = [];
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          events.push(JSON.parse(line.slice(6)));
        }
        // Process phase/done/error events first so activePhaseRef is correct before logs are tagged
        for (const event of events) {
          if (event.type === "phase" && event.phase && event.status) {
            if (event.status === "running") activePhaseRef.current = event.phase;
            setPhases((prev) => ({ ...prev, [event.phase!]: event.status! }));
            if (event.state?.brandIdentity) setBrand(event.state.brandIdentity);
            if (event.state?.productDoc) setProductDoc(event.state.productDoc);
          } else if (event.type === "done") {
            if (event.state?.brandIdentity) setBrand(event.state.brandIdentity);
            if (event.state?.productDoc) setProductDoc(event.state.productDoc);
            setDone(true);
            setRunning(false);
          } else if (event.type === "error") {
            setError(event.message);
            setRunning(false);
          }
        }
        // Then process logs and artifacts (phase is already set correctly)
        for (const event of events) {
          if (event.type === "log" && event.message) {
            setLogs((prev) => [...prev, { phase: activePhaseRef.current, message: event.message! }]);
            scrollLogs();
          } else if (event.type === "artifact" && event.artifact) {
            setArtifacts((prev) => [...prev, event.artifact!]);
            if (event.artifact.type === "website") {
              const b64 = event.artifact.url.replace("data:text/html;base64,", "");
              const decoded = atob(b64);
              setWebsiteCode(decoded);
            }
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
      <UserBar />
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
          <section className="px-4 pb-16 space-y-5">
            {/* Row 1: Live Log grouped by phase */}
            {logs.length > 0 && (() => {
              const phaseLabels: Record<PhaseKey, string> = {
                strategy: "Strategy", website: "Website", media: "Media", stitching: "Stitching",
              };
              const phaseColors: Record<PhaseKey, string> = {
                strategy: "text-violet-400", website: "text-blue-400",
                media: "text-fuchsia-400", stitching: "text-emerald-400",
              };
              // Group consecutive entries by phase
              const groups: { phase: PhaseKey; entries: LogEntry[] }[] = [];
              for (const entry of logs) {
                const last = groups[groups.length - 1];
                if (last && last.phase === entry.phase) {
                  last.entries.push(entry);
                } else {
                  groups.push({ phase: entry.phase, entries: [entry] });
                }
              }
              return (
                <div className="rounded-xl border border-white/8 bg-white/3 backdrop-blur-sm overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/8">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Live Log</span>
                    {running && (
                      <span className="flex items-center gap-1.5 text-[10px] text-zinc-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Streaming
                      </span>
                    )}
                  </div>
                  <div className="p-4 font-mono text-xs space-y-3 max-h-56 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                    {groups.map((group, gi) => (
                      <div key={gi}>
                        <p className={`text-[10px] uppercase tracking-widest mb-1.5 font-semibold ${phaseColors[group.phase]}`}>
                          {phaseLabels[group.phase]}
                        </p>
                        <div className="space-y-0.5 pl-3 border-l border-white/8">
                          {group.entries.map((entry, ei) => (
                            <div key={ei} className="flex gap-2 text-zinc-500 hover:text-zinc-300 transition-colors">
                              <span className="text-zinc-700 select-none shrink-0">{String(ei + 1).padStart(2, "0")}</span>
                              <span>{entry.message}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    <div ref={logsEndRef} />
                  </div>
                </div>
              );
            })()}

            {/* Row 2: Brand + Product Doc side by side */}
            {(brand || productDoc) && (
              <div className="grid md:grid-cols-2 gap-5 items-start">
                {brand && <BrandCard brand={brand} />}
                {productDoc && <ProductDocCard doc={productDoc} brandName={brand?.name} />}
              </div>
            )}

            {/* Row 3: Artifacts list */}
            {artifacts.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest px-1">Artifacts</h2>
                <div className="grid md:grid-cols-2 gap-3">
                  {artifacts.map((a, i) => (
                    <ArtifactCard key={i} artifact={a} />
                  ))}
                </div>
              </div>
            )}

            {/* Row 4: Website preview (full width) */}
            {websiteCode && <WebsitePreview code={websiteCode} />}

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
            <p>Built with Gemini · Kling · Smallest.ai · RunPod</p>
          </footer>
        )}
      </div>
    </main>
  );
}
