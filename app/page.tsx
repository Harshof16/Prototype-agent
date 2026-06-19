"use client";

import { useState, useRef, useCallback, useEffect, useImperativeHandle, forwardRef, startTransition } from "react";
import NextImage from "next/image";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { StreamEvent, AgentState, PhaseStatus, ThemeOption } from "@/lib/types";
import type { ValidatorTurn, ValidationReport } from "@/lib/agents/validator";
import DograhVoiceWidget from "@/app/components/DograhVoiceWidget";

const TOTAL_QUESTIONS = 5;

// ── Sub-components ────────────────────────────────────────────────────────

function PhaseIndicator({
  label,
  status,
  icon,
}: {
  label: string;
  status: PhaseStatus;
  icon: string;
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
    script: "📝",
  };

  const colors: Record<string, string> = {
    website: "from-blue-600/20 to-cyan-600/10 border-blue-500/30 hover:border-blue-400/60",
    video: "from-violet-600/20 to-purple-600/10 border-violet-500/30 hover:border-violet-400/60",
    pdf: "from-amber-600/20 to-orange-600/10 border-amber-500/30 hover:border-amber-400/60",
    voiceover: "from-pink-600/20 to-rose-600/10 border-pink-500/30 hover:border-pink-400/60",
    script: "from-teal-600/20 to-cyan-600/10 border-teal-500/30 hover:border-teal-400/60",
  };

  const cls = colors[artifact.type] ?? "from-zinc-600/20 to-zinc-700/10 border-zinc-500/30 hover:border-zinc-400/60";
  const isAudio = artifact.url.startsWith("data:audio/") || artifact.type === "voiceover";

  if (artifact.type === "script") {
    const text = decodeURIComponent(artifact.url.replace("data:text/plain;charset=utf-8,", ""));
    return (
      <div className={`flex flex-col gap-2 px-4 py-3 rounded-xl border bg-linear-to-r backdrop-blur-sm ${cls}`}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icons.script}</span>
          <p className="text-sm font-semibold text-white">{artifact.label}</p>
        </div>
        <p className="text-xs text-zinc-300 leading-relaxed font-mono whitespace-pre-wrap border-t border-white/8 pt-2">{text}</p>
      </div>
    );
  }

  if (isAudio) {
    return (
      <div className={`flex flex-col gap-3 px-4 py-3 rounded-xl border bg-linear-to-r backdrop-blur-sm ${cls}`}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icons[artifact.type] ?? "📦"}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">{artifact.label}</p>
            <p className="text-xs text-zinc-500 truncate mt-0.5">{artifact.url.slice(0, 55)}…</p>
          </div>
        </div>
        <audio controls src={artifact.url} className="w-full h-10 accent-pink-500" />
      </div>
    );
  }

  if (artifact.type === "video") {
    return (
      <div className={`flex flex-col gap-3 px-4 py-3 rounded-xl border bg-linear-to-r backdrop-blur-sm ${cls}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{icons.video}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">{artifact.label}</p>
              <p className="text-xs text-zinc-500 truncate mt-0.5">{artifact.url.slice(0, 55)}…</p>
            </div>
          </div>
          <a
            href={artifact.url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-zinc-500 hover:text-white text-sm transition-colors"
            title="Open in new tab"
          >
            ↗
          </a>
        </div>
        <video
          controls
          src={artifact.url}
          className="w-full rounded-lg max-h-56 bg-black"
          preload="metadata"
        />
      </div>
    );
  }

  return (
    <a
      href={artifact.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border bg-linear-to-r backdrop-blur-sm transition-all duration-300 group ${cls}`}
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

function toStr(val: unknown): string {
  if (typeof val === "string") return val;
  if (typeof val === "object" && val !== null) return Object.values(val).join(", ");
  return String(val ?? "");
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
          Tone: <span className="text-zinc-200">{toStr(brand.tone)}</span>
        </span>
        <span className="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-zinc-400">
          Audience: <span className="text-zinc-200">{toStr(brand.targetAudience)}</span>
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
  // Detect the exported component name before stripping the export keyword
  const exportMatch = code.match(/export\s+default\s+(?:function\s+)?(\w+)/);
  const componentName = exportMatch?.[1] ?? "LandingPage";

  // Collect named react imports so we can re-inject them as globals
  // (matches both `import { useState } from "react"` and the default+named
  // combo `import React, { useState } from "react"`)
  const reactImports: string[] = [];
  code.replace(/^import\s+(?:\w+\s*,\s*)?\{([^}]*)\}\s+from\s+['"]react['"];?\s*$/gm, (_, names: string) => {
    names.split(",").map((n: string) => n.trim().split(/\s+as\s+/)[0].trim()).filter(Boolean).forEach((n: string) => reactImports.push(n));
    return "";
  });
  const reactGlobals = reactImports.length
    ? `const { ${[...new Set(reactImports)].join(", ")} } = React;`
    : "";

  const cleaned = code
    .replace(/^['"]use client['"];?\s*$/gm, "")
    .replace(/^import type\s.+$/gm, "")
    .replace(/^import\s.+from\s['"]next(?:\/.+)?['"];?\s*$/gm, "")
    .replace(/^import\s.*from\s+['"]react['"];?\s*$/gm, "")
    .replace(/export\s+default\s+/, "");

  // Base64-encode (UTF-8 safe) so the TSX source can sit inert in the DOM
  // and be handed to Babel.transform() with an explicit filename — the
  // automatic type="text/babel" DOM scan never sets a filename, which
  // makes @babel/preset-typescript silently no-op and break on TS syntax.
  const fullSource = `${reactGlobals}\n${cleaned}`;
  const encodedSource = btoa(unescape(encodeURIComponent(fullSource)));

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossorigin></script>
  <script src="https://unpkg.com/@babel/standalone@7.23.10/babel.min.js" crossorigin></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>body{margin:0;font-family:'Inter',ui-sans-serif,system-ui,sans-serif}</style>
</head>
<body>
  <div id="root"></div>
  <div id="error" style="display:none;padding:16px;background:#fee;color:#c00;font:13px monospace;white-space:pre-wrap"></div>
  <script id="source" type="text/plain">${encodedSource}</script>
  <script>
    window.onerror = function(msg, src, line, col, err) {
      var el = document.getElementById('error');
      el.style.display = 'block';
      el.textContent = (err ? err.stack : msg) || msg;
    };
    try {
      var b64 = document.getElementById('source').textContent;
      var source = decodeURIComponent(escape(window.atob(b64)));
      var result = Babel.transform(source, { presets: ['react', 'typescript'], filename: 'component.tsx' });
      var run = new Function('React', 'ReactDOM', result.code + '\\n;return ${componentName};');
      var Component = run(React, ReactDOM);
      var domRoot = document.getElementById('root');
      var reactRoot = ReactDOM.createRoot(domRoot);
      reactRoot.render(React.createElement(Component));
    } catch(e) {
      var el = document.getElementById('error');
      el.style.display = 'block';
      el.textContent = e.stack || e.message;
    }
  </script>
</body>
</html>`;
}

function WebsitePreview({ code }: { code: string }) {
  const [tab, setTab] = useState<"preview" | "code">("preview");
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    const html = buildPreviewHtml(code);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    startTransition(() => setBlobUrl(url));
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [code]);

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
        blobUrl ? (
          <iframe
            src={blobUrl}
            className="w-full h-[600px] bg-white"
            sandbox="allow-scripts"
            title="Generated website preview"
          />
        ) : (
          <div className="w-full h-[600px] bg-white flex items-center justify-center text-zinc-400 text-sm">
            Loading preview…
          </div>
        )
      ) : (
        <pre className="p-4 text-xs text-zinc-400 overflow-auto max-h-[600px] scrollbar-thin scrollbar-thumb-white/10 leading-relaxed">
          {code}
        </pre>
      )}
    </div>
  );
}


// ── Auth button (floating) ────────────────────────────────────────────────

type Subscription = { tier: string; creditsUsed: number; creditsTotal: number; unlimited?: boolean };

function AuthButton({ refreshTrigger }: { refreshTrigger: number }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sub, setSub] = useState<Subscription | null>(null);

  useEffect(() => {
    async function load() {
      if (!session) { setSub(null); return; }
      try {
        const r = await fetch("/api/user/subscription");
        setSub(r.ok ? await r.json() : null);
      } catch {
        setSub(null);
      }
    }
    load();
  }, [session, refreshTrigger]);

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
          onClick={() => router.push("/auth/signin")}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-zinc-900 font-semibold text-sm hover:bg-zinc-100 transition-colors shadow-lg"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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

  const remaining = sub ? sub.creditsTotal - sub.creditsUsed : null;
  const creditColor =
    remaining === null ? "" :
    remaining === 0 ? "text-red-400 border-red-500/30 bg-red-950/30" :
    remaining === 1 ? "text-amber-400 border-amber-500/30 bg-amber-950/30" :
    "text-emerald-400 border-emerald-500/30 bg-emerald-950/30";

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
      {sub && sub.unlimited && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold text-violet-300 border-violet-500/30 bg-violet-950/30">
          <span>⚡</span>
          <span>Unlimited</span>
        </div>
      )}
      {sub && !sub.unlimited && (
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${creditColor}`}>
          <span>{remaining === 0 ? "⚡" : "⚡"}</span>
          <span>{remaining} / {sub.creditsTotal} trials</span>
        </div>
      )}
      {session.user?.image && (
        <NextImage
          src={session.user.image}
          alt={session.user.name ?? "User avatar"}
          width={32}
          height={32}
          className="rounded-full border border-white/20"
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

// ── Idea Validator ────────────────────────────────────────────────────────

const SCORE_LABELS: Record<string, string> = {
  marketSize: "Market Size",
  competition: "Low Competition",
  feasibility: "Feasibility",
  uniqueness: "Uniqueness",
  monetisation: "Monetisation",
  overall: "Overall",
};

const VERDICT_CONFIG = {
  strong:       { label: "Strong Idea",    bg: "bg-emerald-950/40", border: "border-emerald-500/40", text: "text-emerald-300", dot: "bg-emerald-400" },
  promising:    { label: "Promising",       bg: "bg-blue-950/40",    border: "border-blue-500/40",    text: "text-blue-300",    dot: "bg-blue-400" },
  "needs-work": { label: "Needs Work",      bg: "bg-amber-950/40",   border: "border-amber-500/40",   text: "text-amber-300",   dot: "bg-amber-400" },
  risky:        { label: "High Risk",       bg: "bg-red-950/40",     border: "border-red-500/40",     text: "text-red-300",     dot: "bg-red-400" },
};

function ScoreBadge({ value, label }: { value: number; label: string }) {
  const pct = (value / 10) * 100;
  const color =
    value >= 8 ? "bg-emerald-500" :
    value >= 6 ? "bg-blue-500" :
    value >= 4 ? "bg-amber-500" :
    "bg-red-500";

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-zinc-400">{label}</span>
        <span className="text-zinc-200 font-semibold">{value}/10</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ValidationReportCard({ report, onProceed }: { report: ValidationReport; onProceed: () => void }) {
  const vc = VERDICT_CONFIG[report.verdict] ?? VERDICT_CONFIG["promising"];

  return (
    <div className={`rounded-2xl border ${vc.border} ${vc.bg} backdrop-blur-sm p-6 space-y-5`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${vc.dot}`} />
          <span className={`text-sm font-bold uppercase tracking-wider ${vc.text}`}>{vc.label}</span>
        </div>
        <span className="text-xs text-zinc-600 font-mono">Validation Report</span>
      </div>

      {/* Summary */}
      <p className="text-sm text-zinc-300 leading-relaxed">{report.summary}</p>

      {/* Market info */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-white/4 border border-white/8 px-3 py-2">
          <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-0.5">Target Market</p>
          <p className="text-xs text-zinc-200">{report.targetMarket}</p>
        </div>
        <div className="rounded-lg bg-white/4 border border-white/8 px-3 py-2">
          <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-0.5">Market Size</p>
          <p className="text-xs text-zinc-200">{report.estimatedMarketSize}</p>
        </div>
      </div>

      {/* Scores */}
      <div className="space-y-2.5">
        <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Evaluation Scores</p>
        {Object.entries(report.scores).map(([k, v]) => (
          <ScoreBadge key={k} value={v as number} label={SCORE_LABELS[k] ?? k} />
        ))}
      </div>

      {/* Competitors */}
      {report.competitorExamples?.length > 0 && (
        <div>
          <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-2">Competitors</p>
          <div className="flex flex-wrap gap-1.5">
            {report.competitorExamples.map((c) => (
              <span key={c} className="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-400">{c}</span>
            ))}
          </div>
        </div>
      )}

      {/* Strengths / Risks / Suggestions */}
      <div className="grid md:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <p className="text-[10px] font-mono text-emerald-600 uppercase tracking-widest">Strengths</p>
          {report.strengths.map((s, i) => (
            <p key={i} className="text-xs text-zinc-400 flex gap-1.5"><span className="text-emerald-600 shrink-0">+</span>{s}</p>
          ))}
        </div>
        <div className="space-y-1.5">
          <p className="text-[10px] font-mono text-red-600 uppercase tracking-widest">Risks</p>
          {report.risks.map((r, i) => (
            <p key={i} className="text-xs text-zinc-400 flex gap-1.5"><span className="text-red-600 shrink-0">!</span>{r}</p>
          ))}
        </div>
        <div className="space-y-1.5">
          <p className="text-[10px] font-mono text-blue-500 uppercase tracking-widest">Suggestions</p>
          {report.suggestions.map((s, i) => (
            <p key={i} className="text-xs text-zinc-400 flex gap-1.5"><span className="text-blue-500 shrink-0">→</span>{s}</p>
          ))}
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={onProceed}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white font-semibold text-sm transition-all duration-200 shadow-[0_0_20px_rgba(139,92,246,0.4)] flex items-center justify-center gap-2"
      >
        Looks good — Generate full kit
        <span className="text-violet-300">→</span>
      </button>
    </div>
  );
}

interface IdeaValidatorProps {
  idea: string;
  onProceed: () => void;
  onClose: () => void;
}

function IdeaValidator({ idea, onProceed, onClose }: IdeaValidatorProps) {
  const [history, setHistory] = useState<ValidatorTurn[]>([]);
  const [currentInput, setCurrentInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(-1);
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Kick off the first question on mount
  useEffect(() => {
    sendTurn([]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollToBottom();
    if (!loading && !report) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [history, loading, report, scrollToBottom]);

  async function sendTurn(hist: ValidatorTurn[]) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea, history: hist }),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();

      if (data.type === "question") {
        setQuestionIndex(data.questionIndex);
        setHistory((prev) => [...prev, { role: "assistant", content: data.content }]);
      } else if (data.type === "report") {
        setReport(data.report);
      }
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAnswer(e: React.FormEvent) {
    e.preventDefault();
    const answer = currentInput.trim();
    if (!answer || loading) return;

    const newHistory: ValidatorTurn[] = [...history, { role: "user", content: answer }];
    setHistory(newHistory);
    setCurrentInput("");
    await sendTurn(newHistory);
  }

  const progressPct = report ? 100 : Math.round(((questionIndex + 1) / TOTAL_QUESTIONS) * 100);

  return (
    <div className="rounded-2xl border border-violet-500/30 bg-[#0d0d1a] backdrop-blur-sm overflow-hidden shadow-[0_0_40px_rgba(139,92,246,0.15)]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/8 bg-violet-950/20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
            <span className="text-xs font-semibold text-violet-300 uppercase tracking-wider">Idea Validator</span>
          </div>
          {!report && (
            <span className="text-[10px] text-zinc-600 font-mono">
              Question {Math.min(questionIndex + 1, TOTAL_QUESTIONS)} of {TOTAL_QUESTIONS}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-zinc-600 hover:text-zinc-300 transition-colors text-lg leading-none"
          aria-label="Close validator"
        >
          ×
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-white/5">
        <div
          className="h-full bg-gradient-to-r from-violet-600 to-fuchsia-500 transition-all duration-700"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Chat area */}
      <div className="p-5 space-y-4 max-h-[520px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
        {/* Intro */}
        <div className="flex gap-3 items-start">
          <div className="w-7 h-7 rounded-full bg-violet-600/30 border border-violet-500/30 flex items-center justify-center text-sm shrink-0">🔍</div>
          <div className="flex-1">
            <p className="text-xs text-zinc-400 leading-relaxed">
              I&apos;ll evaluate <span className="text-violet-300 font-medium">&ldquo;{idea}&rdquo;</span> across five dimensions — market size, competition, feasibility, uniqueness, and monetisation — then give you a scored validation report.
            </p>
          </div>
        </div>

        {/* Conversation */}
        {history.map((turn, i) => (
          <div key={i} className={`flex gap-3 items-start ${turn.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0 ${
              turn.role === "assistant"
                ? "bg-violet-600/30 border border-violet-500/30"
                : "bg-white/8 border border-white/15"
            }`}>
              {turn.role === "assistant" ? "🤖" : "💬"}
            </div>
            <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
              turn.role === "assistant"
                ? "bg-white/5 border border-white/8 text-zinc-200 rounded-tl-sm"
                : "bg-violet-600/20 border border-violet-500/25 text-violet-100 rounded-tr-sm"
            }`}>
              {turn.content}
            </div>
          </div>
        ))}

        {/* Loading */}
        {loading && (
          <div className="flex gap-3 items-start">
            <div className="w-7 h-7 rounded-full bg-violet-600/30 border border-violet-500/30 flex items-center justify-center text-sm shrink-0">🤖</div>
            <div className="px-3.5 py-2.5 rounded-2xl rounded-tl-sm bg-white/5 border border-white/8 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-950/30 px-4 py-3 text-xs text-red-300">
            {error} — <button onClick={() => sendTurn(history)} className="underline">retry</button>
          </div>
        )}

        {/* Report */}
        {report && <ValidationReportCard report={report} onProceed={onProceed} />}

        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      {!report && (
        <div className="px-5 pb-5">
          <form onSubmit={handleAnswer} className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              placeholder={loading ? "Thinking…" : "Your answer…"}
              disabled={loading || history.length === 0}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-violet-500/50 disabled:opacity-50 transition-colors"
            />
            <button
              type="submit"
              disabled={loading || !currentInput.trim() || history.length === 0}
              className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-semibold text-sm transition-colors"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

// ── Theme Selector ───────────────────────────────────────────────────────

interface ThemeSelectorProps {
  themes: ThemeOption[];
  loading: boolean;
  error: string | null;
  onSelect: (theme: ThemeOption) => void;
  onRetry: () => void;
  onClose: () => void;
}

function ThemeSelector({ themes, loading, error, onSelect, onRetry, onClose }: ThemeSelectorProps) {
  return (
    <div className="rounded-2xl border border-violet-500/30 bg-[#0d0d1a] backdrop-blur-sm overflow-hidden shadow-[0_0_40px_rgba(139,92,246,0.15)]">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/8 bg-violet-950/20">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
          <span className="text-xs font-semibold text-violet-300 uppercase tracking-wider">Choose a Theme</span>
        </div>
        <button
          onClick={onClose}
          className="text-zinc-600 hover:text-zinc-300 transition-colors text-lg leading-none"
          aria-label="Close theme selector"
        >
          ×
        </button>
      </div>

      <div className="p-5">
        {loading && (
          <div className="flex items-center justify-center gap-2 py-10 text-zinc-500 text-sm">
            <span className="w-4 h-4 border-2 border-zinc-600 border-t-violet-400 rounded-full animate-spin" />
            Generating theme options…
          </div>
        )}

        {!loading && error && (
          <div className="rounded-xl border border-red-500/30 bg-red-950/30 px-4 py-3 text-xs text-red-300">
            {error} — <button onClick={onRetry} className="underline">retry</button>
          </div>
        )}

        {!loading && !error && (
          <>
            <p className="text-xs text-zinc-500 mb-4">
              No theme specified — pick a direction and we&apos;ll build your brand around it.
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              {themes.map((t) => (
                <button
                  key={t.name}
                  onClick={() => onSelect(t)}
                  className="group text-left rounded-xl border border-white/10 bg-white/4 hover:border-violet-500/50 hover:bg-violet-950/20 transition-all duration-200 p-4 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-white text-sm">{t.name}</h3>
                    <div className="flex gap-1">
                      {Object.values(t.colors).map((c, i) => (
                        <span key={i} className="w-3.5 h-3.5 rounded-full border border-white/20" style={{ background: c }} />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">{t.description}</p>
                  <p className="text-[10px] text-zinc-600 uppercase tracking-widest">{t.mood}</p>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Background ─────────────────────────────────────────────────────────────

type BillingCycle = "monthly" | "quarterly" | "halfyearly" | "annual";

const CYCLE_LABELS: Record<BillingCycle, string> = {
  monthly:    "Monthly",
  quarterly:  "Quarterly  −10%",
  halfyearly: "Half-yearly  −17%",
  annual:     "Annual  −25%",
};

const BASE_PRICES: Record<string, number> = {
  starter: 9,
  growth:  29,
  studio:  99,
  agency:  299,
};

const CYCLE_MULTIPLIER: Record<BillingCycle, number> = {
  monthly:    1,
  quarterly:  0.90,
  halfyearly: 0.83,
  annual:     0.75,
};

const CYCLE_PERIOD: Record<BillingCycle, number> = {
  monthly:    1,
  quarterly:  3,
  halfyearly: 6,
  annual:     12,
};

function cyclePrice(plan: string, cycle: BillingCycle): number {
  return Math.round(BASE_PRICES[plan] * CYCLE_MULTIPLIER[cycle] * CYCLE_PERIOD[cycle]);
}

function effectiveMonthly(plan: string, cycle: BillingCycle): string {
  const monthly = BASE_PRICES[plan] * CYCLE_MULTIPLIER[cycle];
  return monthly % 1 === 0 ? `$${monthly}` : `$${monthly.toFixed(2)}`;
}

function PricingSection() {
  const { data: session } = useSession();
  const router = useRouter();
  const [cycle, setCycle] = useState<BillingCycle>("monthly");

  const isMonthly = cycle === "monthly";
  const periodLabel = isMonthly ? "/ mo" : `/ ${cycle === "quarterly" ? "quarter" : cycle === "halfyearly" ? "6 mo" : "year"}`;

  return (
    <section className="max-w-5xl mx-auto px-4 pt-4 pb-16">
      <div className="text-center mb-8">
        <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-3">Pricing</p>
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">Simple, transparent pricing</h2>
        <p className="text-zinc-500 text-sm max-w-lg mx-auto">
          Every paid plan includes full-kit credits — strategy, landing page, voiceover, and promo video in one run.
        </p>
      </div>

      {/* Billing cycle toggle */}
      <div className="flex justify-center mb-10">
        <div className="inline-flex rounded-xl border border-white/10 bg-white/3 p-1 gap-1">
          {(Object.keys(CYCLE_LABELS) as BillingCycle[]).map((c) => (
            <button
              key={c}
              onClick={() => setCycle(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                cycle === c
                  ? "bg-violet-600 text-white shadow"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {CYCLE_LABELS[c]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4 items-stretch">
        {/* Free */}
        <div className="rounded-2xl border border-white/10 bg-white/3 backdrop-blur-sm p-6 flex flex-col gap-5">
          <div>
            <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-3">Free</p>
            <div className="flex items-end gap-1 mb-1">
              <span className="text-4xl font-black text-white">$0</span>
              <span className="text-zinc-500 text-sm mb-1.5">/ mo</span>
            </div>
            <p className="text-zinc-600 text-xs">Doc + landing page only. No credit card.</p>
          </div>
          <div className="flex-1 space-y-2.5">
            {[
              { on: true,  text: "Brand strategy & product doc" },
              { on: true,  text: "React + Tailwind landing page" },
              { on: true,  text: "PDF & DOCX export" },
              { on: false, text: "AI voiceover" },
              { on: false, text: "20s promo video" },
              { on: false, text: "Priority queue" },
            ].map(({ on, text }) => (
              <div key={text} className="flex items-center gap-2.5 text-sm">
                <span className={on ? "text-emerald-400" : "text-zinc-700"}>{on ? "✓" : "✕"}</span>
                <span className={on ? "text-zinc-300" : "text-zinc-600"}>{text}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => { if (!session) router.push("/auth/signin"); }}
            className="w-full py-2.5 rounded-xl border border-white/15 text-zinc-300 text-sm font-semibold hover:bg-white/5 transition-colors"
          >
            {session ? "You're on Free" : "Get started free"}
          </button>
        </div>

        {/* Starter */}
        <div className="rounded-2xl border border-white/10 bg-white/3 backdrop-blur-sm p-6 flex flex-col gap-5">
          <div>
            <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-3">Starter</p>
            <div className="flex items-end gap-1 mb-1">
              <span className="text-4xl font-black text-white">${cyclePrice("starter", cycle)}</span>
              <span className="text-zinc-500 text-sm mb-1.5">{periodLabel}</span>
            </div>
            <p className="text-zinc-600 text-xs">
              10 full-kit runs / mo{!isMonthly && ` · ${effectiveMonthly("starter", cycle)}/mo`}
            </p>
          </div>
          <div className="flex-1 space-y-2.5">
            {[
              { on: true,  text: "Everything in Free" },
              { on: true,  text: "10 full-kit credits / mo" },
              { on: true,  text: "AI voiceover included" },
              { on: true,  text: "20s promo video included" },
              { on: false, text: "Priority queue" },
              { on: false, text: "Rollover unused credits" },
            ].map(({ on, text }) => (
              <div key={text} className="flex items-center gap-2.5 text-sm">
                <span className={on ? "text-emerald-400" : "text-zinc-700"}>{on ? "✓" : "✕"}</span>
                <span className={on ? "text-zinc-300" : "text-zinc-600"}>{text}</span>
              </div>
            ))}
          </div>
          <button className="w-full py-2.5 rounded-xl border border-white/15 text-zinc-300 text-sm font-semibold hover:bg-white/5 transition-colors">
            Start Starter
          </button>
        </div>

        {/* Growth — highlighted */}
        <div className="relative rounded-2xl border border-violet-500/40 bg-violet-950/30 backdrop-blur-sm p-6 flex flex-col gap-5 shadow-[0_0_40px_rgba(139,92,246,0.15)]">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="px-3 py-1 rounded-full bg-violet-500 text-white text-[10px] font-bold uppercase tracking-wider shadow-lg whitespace-nowrap">Most popular</span>
          </div>
          <div>
            <p className="text-xs font-mono text-violet-400 uppercase tracking-widest mb-3">Growth</p>
            <div className="flex items-end gap-1 mb-1">
              <span className="text-4xl font-black text-white">${cyclePrice("growth", cycle)}</span>
              <span className="text-zinc-500 text-sm mb-1.5">{periodLabel}</span>
            </div>
            <p className="text-zinc-600 text-xs">
              50 full-kit runs / mo{!isMonthly && ` · ${effectiveMonthly("growth", cycle)}/mo`}
            </p>
          </div>
          <div className="flex-1 space-y-2.5">
            {[
              "Everything in Starter",
              "50 full-kit credits / mo",
              "Priority queue",
              "Rollover up to 10 credits",
              "Email support",
              "Early access to new models",
            ].map((text) => (
              <div key={text} className="flex items-center gap-2.5 text-sm">
                <span className="text-emerald-400">✓</span>
                <span className="text-zinc-300">{text}</span>
              </div>
            ))}
          </div>
          <button className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors shadow-[0_0_20px_rgba(139,92,246,0.35)]">
            Start Growth
          </button>
        </div>

        {/* Studio */}
        <div className="rounded-2xl border border-white/10 bg-white/3 backdrop-blur-sm p-6 flex flex-col gap-5">
          <div>
            <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-3">Studio</p>
            <div className="flex items-end gap-1 mb-1">
              <span className="text-4xl font-black text-white">${cyclePrice("studio", cycle)}</span>
              <span className="text-zinc-500 text-sm mb-1.5">{periodLabel}</span>
            </div>
            <p className="text-zinc-600 text-xs">
              200 full-kit runs / mo{!isMonthly && ` · ${effectiveMonthly("studio", cycle)}/mo`}
            </p>
          </div>
          <div className="flex-1 space-y-2.5">
            {[
              "Everything in Growth",
              "200 full-kit credits / mo",
              "Rollover up to 50 credits",
              "Dedicated support",
              "Team seats (up to 5)",
              "Custom brand presets",
            ].map((text) => (
              <div key={text} className="flex items-center gap-2.5 text-sm">
                <span className="text-emerald-400">✓</span>
                <span className="text-zinc-300">{text}</span>
              </div>
            ))}
          </div>
          <button className="w-full py-2.5 rounded-xl border border-white/15 text-zinc-300 text-sm font-semibold hover:bg-white/5 transition-colors">
            Start Studio
          </button>
        </div>
      </div>

      <p className="text-center text-zinc-600 text-xs mt-6">
        All paid plans include a 7-day free trial. Longer billing cycles are charged upfront and are non-refundable after the trial period.
      </p>
    </section>
  );
}

function BackgroundOrbs() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      <div className="absolute -top-48 -left-48 w-150 h-150 rounded-full bg-violet-600/15 blur-[120px]" />
      <div className="absolute -top-24 right-0 w-125 h-125 rounded-full bg-blue-600/10 blur-[120px]" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-175 h-100 rounded-full bg-indigo-700/10 blur-[120px]" />
      <div className="absolute top-1/2 -right-32 w-100 h-100 rounded-full bg-fuchsia-700/8 blur-[100px]" />
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
    </div>
  );
}

// ── Landing page sections (shown only before first run) ────────────────────

const STEPS = [
  {
    number: "01",
    icon: "🔍",
    title: "Validate your idea",
    body: "Click Validate. An AI advisor asks 5 sharp questions — market size, competition, feasibility, uniqueness, monetisation — then scores your idea and flags the risks.",
    color: "from-amber-500/20 to-amber-600/5",
    border: "border-amber-500/20",
    accent: "text-amber-400",
  },
  {
    number: "02",
    icon: "🧠",
    title: "Watch it build",
    body: "One click proceeds to the full pipeline. Live logs stream as four AI agents work — strategy, landing page code, voiceover, and video — all sharing one brand identity.",
    color: "from-violet-500/20 to-violet-600/5",
    border: "border-violet-500/20",
    accent: "text-violet-400",
  },
  {
    number: "03",
    icon: "🚀",
    title: "Download your kit",
    body: "Get a validation report, product doc (PDF/DOCX), a fully coded React landing page, a voiceover MP3, and a 30-second promo video.",
    color: "from-emerald-500/20 to-emerald-600/5",
    border: "border-emerald-500/20",
    accent: "text-emerald-400",
  },
];

const OUTPUTS = [
  {
    icon: "🔍",
    label: "Validation Report",
    desc: "Scored assessment across market size, competition, feasibility, uniqueness, and monetisation — with a verdict, real competitor names, risks, and actionable suggestions.",
    tag: "Pre-flight",
    tagColor: "bg-amber-500/15 text-amber-300 border-amber-500/20",
  },
  {
    icon: "📄",
    label: "Product Document",
    desc: "5-section strategic brief — problem, solution, audience, roadmap, and go-to-market. Exported as PDF & DOCX.",
    tag: "Strategy",
    tagColor: "bg-violet-500/15 text-violet-300 border-violet-500/20",
  },
  {
    icon: "🌐",
    label: "Landing Page",
    desc: "Mobile-responsive React + Tailwind site built to your brand palette. Preview in-browser and copy the source.",
    tag: "Code",
    tagColor: "bg-blue-500/15 text-blue-300 border-blue-500/20",
  },
  {
    icon: "🎙️",
    label: "Voiceover",
    desc: "Professional broadcast-quality narration generated from your script. Ready for ads, demos, or social.",
    tag: "Audio",
    tagColor: "bg-pink-500/15 text-pink-300 border-pink-500/20",
  },
  {
    icon: "🎬",
    label: "Promo Video",
    desc: "30-second branded intro — four cinematic AI clips stitched with lower-thirds and your voiceover baked in.",
    tag: "Video",
    tagColor: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/20",
  },
];

const EXAMPLE_IDEAS = [
  "A habit tracker that uses AI to adapt to your psychology",
  "Marketplace connecting local chefs with remote dinner parties",
  "B2B tool that turns Slack threads into Jira tickets automatically",
  "An app that gamifies learning a new language with daily micro-challenges",
];

const STATS = [
  { value: "~2 min", label: "Average run time" },
  { value: "from $9", label: "Per month, all-inclusive" },
  { value: "5", label: "AI agents in the pipeline" },
  { value: "4+", label: "Deliverables per run" },
];

function LandingContent({ onIdeaSelect }: { onIdeaSelect: (idea: string) => void }) {
  return (
    <>
      {/* Stats strip */}
      <div className="w-full border-y border-white/6 bg-white/2 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-2xl font-black text-white">{s.value}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-4 pt-16 pb-10">
        <div className="text-center mb-10">
          <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-3">How it works</p>
          <h2 className="text-2xl md:text-3xl font-bold text-white">Validate, build, and ship — in three steps</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {STEPS.map((step) => (
            <div
              key={step.number}
              className={`relative rounded-2xl border ${step.border} bg-linear-to-b ${step.color} backdrop-blur-sm p-6`}
            >
              <div className="flex items-start gap-3 mb-4">
                <span className={`text-xs font-mono font-bold ${step.accent} opacity-60`}>{step.number}</span>
                <span className="text-2xl leading-none">{step.icon}</span>
              </div>
              <h3 className="text-white font-semibold mb-2">{step.title}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* What you get */}
      <section className="max-w-5xl mx-auto px-4 pt-4 pb-10">
        <div className="text-center mb-10">
          <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-3">What you get</p>
          <h2 className="text-2xl md:text-3xl font-bold text-white">Validate first, then ship four production assets</h2>
        </div>
        {/* Validation report — full-width featured card */}
        <div className="mb-4">
          <div className="group rounded-2xl border border-amber-500/25 bg-gradient-to-r from-amber-500/10 to-amber-600/5 backdrop-blur-sm p-6 hover:border-amber-500/40 hover:bg-amber-500/10 transition-all duration-300">
            <div className="flex items-start justify-between mb-3">
              <span className="text-3xl leading-none">{OUTPUTS[0].icon}</span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${OUTPUTS[0].tagColor}`}>{OUTPUTS[0].tag}</span>
            </div>
            <h3 className="text-white font-semibold mb-1.5">{OUTPUTS[0].label}</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">{OUTPUTS[0].desc}</p>
          </div>
        </div>
        {/* Remaining four outputs — 2-col grid */}
        <div className="grid md:grid-cols-2 gap-4">
          {OUTPUTS.slice(1).map((o) => (
            <div
              key={o.label}
              className="group rounded-2xl border border-white/8 bg-white/3 backdrop-blur-sm p-6 hover:border-white/15 hover:bg-white/5 transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-3xl leading-none">{o.icon}</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${o.tagColor}`}>{o.tag}</span>
              </div>
              <h3 className="text-white font-semibold mb-1.5">{o.label}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">{o.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Example ideas */}
      <section className="max-w-5xl mx-auto px-4 pb-16">
        <p className="text-xs font-mono text-zinc-600 uppercase tracking-widest mb-4 text-center">Try one of these</p>
        <div className="grid sm:grid-cols-2 gap-2">
          {EXAMPLE_IDEAS.map((idea) => (
            <button
              key={idea}
              onClick={() => onIdeaSelect(idea)}
              className="group text-left px-4 py-3 rounded-xl border border-white/8 bg-white/3 hover:border-violet-500/40 hover:bg-violet-950/20 transition-all duration-200 text-sm text-zinc-400 hover:text-zinc-200"
            >
              <span className="text-zinc-700 group-hover:text-violet-500 mr-2 transition-colors">→</span>
              {idea}
            </button>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <PricingSection />

      {/* Powered by */}
      <div className="border-t border-white/6 py-8">
        <p className="text-center text-zinc-700 text-xs mb-4">Powered by</p>
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-zinc-600 text-xs font-mono">
          {["Llama 3.3 70B · Groq", "Gemini 2.5 Flash", "Magic Hour", "Smallest.ai Waves", "RunPod + FFmpeg", "E2B Sandbox"].map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
      </div>
    </>
  );
}

// ── Hero / Input ───────────────────────────────────────────────────────────

interface HeroSectionHandle {
  focusInput: () => void;
}

const HeroSection = forwardRef<HeroSectionHandle, {
  idea: string;
  setIdea: (v: string) => void;
  theme: string;
  setTheme: (v: string) => void;
  running: boolean;
  validating: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onValidate: () => void;
}>(function HeroSection({
  idea,
  setIdea,
  theme,
  setTheme,
  running,
  validating,
  onSubmit,
  onValidate,
}, ref) {
  const handleVoiceTranscript = (text: string) => {
    setIdea(text);
  };
  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    focusInput() {
      inputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => inputRef.current?.focus(), 300);
    },
  }));

  return (
    <section className="relative text-center pt-20 pb-16 px-4">
      {/* Badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300 text-xs font-medium mb-8 backdrop-blur-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
        AI-Powered Product Studio
      </div>

      {/* Headline */}
      <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[1.05] mb-6">
        <span className="bg-linear-to-br from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent">
          One idea.
        </span>
        <br />
        <span className="bg-linear-to-r from-violet-400 via-fuchsia-400 to-blue-400 bg-clip-text text-transparent">
          Full launch kit.
        </span>
      </h1>

      {/* Sub-headline */}
      <p className="text-zinc-400 text-lg md:text-xl max-w-xl mx-auto mb-3 leading-relaxed">
        Type your startup idea. Get a product doc, landing page, and promo video in under two minutes.
      </p>

      {/* Feature pills */}
      <div className="flex flex-wrap justify-center gap-2 mb-12 text-xs text-zinc-500">
        {["Idea Validation", "Strategy & Branding", "Landing Page Code", "Voiceover", "Promo Video"].map((f) => (
          <span key={f} className="px-3 py-1 rounded-full border border-white/8 bg-white/4 backdrop-blur-sm">
            {f}
          </span>
        ))}
      </div>

      {/* Input form */}
      <form onSubmit={onSubmit} className="max-w-2xl mx-auto">
        <div className="relative flex items-center gap-0 rounded-2xl border border-white/15 bg-white/5 backdrop-blur-md p-1.5 shadow-[0_0_40px_rgba(139,92,246,0.15)] focus-within:border-violet-500/50 focus-within:shadow-[0_0_50px_rgba(139,92,246,0.25)] transition-all duration-300">
          <input
            ref={inputRef}
            type="text"
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="Describe your startup idea in one sentence…"
            disabled={running || validating}
            className="flex-1 bg-transparent px-4 py-3 text-zinc-100 placeholder-zinc-600 focus:outline-none text-sm disabled:opacity-50"
          />
          <div className="flex items-center gap-1.5 shrink-0">
            <DograhVoiceWidget onTranscript={handleVoiceTranscript} />
            <button
              type="button"
              onClick={onValidate}
              disabled={running || validating || idea.trim().length < 5}
              title="Validate your idea before generating"
              className="px-4 py-3 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-300 hover:text-white font-medium text-sm transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap"
            >
              {validating ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-zinc-400 border-t-violet-400 rounded-full animate-spin" />
                  Validating…
                </>
              ) : (
                <>
                  <span className="text-violet-400">🔍</span>
                  Validate
                </>
              )}
            </button>
            <button
              type="submit"
              disabled={running || validating || idea.trim().length < 5}
              className="relative px-6 py-3 rounded-xl bg-linear-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 disabled:from-zinc-700 disabled:to-zinc-700 disabled:text-zinc-500 font-semibold text-sm text-white transition-all duration-200 flex items-center gap-2 whitespace-nowrap shadow-[0_0_20px_rgba(139,92,246,0.4)] disabled:shadow-none"
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
        </div>
        <input
          type="text"
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          placeholder="Theme (optional) — e.g. 'minimalist pastel'. Leave blank to choose from suggestions."
          disabled={running || validating}
          className="w-full mt-2.5 bg-white/3 border border-white/10 rounded-xl px-4 py-2.5 text-zinc-200 placeholder-zinc-600 text-xs focus:outline-none focus:border-violet-500/50 disabled:opacity-50 transition-colors"
        />
        <p className="text-zinc-600 text-xs mt-3">
          Takes ~2 minutes · From $9/mo · Powered by Gemini & Magic Hour
        </p>
      </form>
    </section>
  );
});

// ── Main Page ─────────────────────────────────────────────────────────────

type Phases = AgentState["phases"];
type PhaseKey = keyof Phases;
type LogEntry = { phase: PhaseKey; message: string };

export default function Home() {
  const { data: session } = useSession();
  const router = useRouter();
  const [idea, setIdea] = useState("");
  const [theme, setTheme] = useState("");
  const [choosingTheme, setChoosingTheme] = useState(false);
  const [themeOptions, setThemeOptions] = useState<ThemeOption[]>([]);
  const [loadingThemes, setLoadingThemes] = useState(false);
  const [themeFetchError, setThemeFetchError] = useState<string | null>(null);
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
  const [validating, setValidating] = useState(false);
  const [validatorKey, setValidatorKey] = useState(0);
  const [subRefresh, setSubRefresh] = useState(0);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const activePhaseRef = useRef<PhaseKey>("strategy");
  const heroRef = useRef<HeroSectionHandle>(null);

  const scrollLogs = useCallback(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!session) { router.push("/auth/signin"); return; }
    if (running || choosingTheme) return;
    if (theme.trim()) {
      startGenerate(theme.trim());
      return;
    }
    fetchThemeOptions();
  }

  async function fetchThemeOptions() {
    if (!idea.trim() || running) return;
    setChoosingTheme(true);
    setLoadingThemes(true);
    setThemeFetchError(null);
    try {
      const res = await fetch("/api/generate/themes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Server error ${res.status}`);
      setThemeOptions(data.themes ?? []);
    } catch (e: unknown) {
      setThemeFetchError((e as Error).message);
    } finally {
      setLoadingThemes(false);
    }
  }

  async function startGenerate(chosenTheme?: string) {
    if (!idea.trim() || running) return;
    setChoosingTheme(false);

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
        body: JSON.stringify({ idea, theme: chosenTheme }),
      });

      if (res.status === 429) {
        setError("You've used all your free trials. Upgrade to keep generating.");
        setRunning(false);
        setSubRefresh((n) => n + 1);
        return;
      }

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

        const events: StreamEvent[] = [];
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          events.push(JSON.parse(line.slice(6)));
        }
        for (const event of events) {
          if (event.type === "phase" && event.phase && event.status) {
            if (event.status === "running") activePhaseRef.current = event.phase;
            setPhases((prev) => ({ ...prev, [event.phase!]: event.status! }));
            if (event.state?.brandIdentity) setBrand(event.state.brandIdentity);
            if (event.state?.productDoc) setProductDoc(event.state.productDoc);
          } else if (event.type === "log" && event.message) {
            setLogs((prev) => [...prev, { phase: (event.phase ?? activePhaseRef.current) as PhaseKey, message: event.message! }]);
            scrollLogs();
          } else if (event.type === "artifact" && event.artifact) {
            setArtifacts((prev) => [...prev, event.artifact!]);
            if (event.artifact.type === "website") {
              const b64 = event.artifact.url.replace("data:text/html;base64,", "");
              const decoded = atob(b64);
              setWebsiteCode(decoded);
            }
          } else if (event.type === "done") {
            if (event.state?.brandIdentity) setBrand(event.state.brandIdentity);
            if (event.state?.productDoc) setProductDoc(event.state.productDoc);
            setDone(true);
            setRunning(false);
            setSubRefresh((n) => n + 1);
          } else if (event.type === "error") {
            setError(event.message);
            setRunning(false);
            setSubRefresh((n) => n + 1);
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
      <AuthButton refreshTrigger={subRefresh} />
      <BackgroundOrbs />

      <div className="relative z-10 max-w-5xl mx-auto">
        {/* Hero / Input — always visible */}
        <HeroSection
          ref={heroRef}
          idea={idea}
          setIdea={setIdea}
          theme={theme}
          setTheme={setTheme}
          running={running}
          validating={validating || choosingTheme}
          onSubmit={handleSubmit}
          onValidate={() => {
            if (idea.trim().length < 5 || running || choosingTheme) return;
            if (!session) { router.push("/auth/signin"); return; }
            setValidating(true);
            setValidatorKey((k) => k + 1);
          }}
        />

        {/* Theme selector — shown when the user didn't specify their own theme */}
        {choosingTheme && (
          <section className="px-4 mb-8">
            <ThemeSelector
              themes={themeOptions}
              loading={loadingThemes}
              error={themeFetchError}
              onSelect={(t) => startGenerate(t.name)}
              onRetry={fetchThemeOptions}
              onClose={() => setChoosingTheme(false)}
            />
          </section>
        )}

        {/* Idea Validator panel */}
        {validating && (
          <section className="px-4 mb-8">
            <IdeaValidator
              key={validatorKey}
              idea={idea}
              onProceed={() => {
                setValidating(false);
                if (theme.trim()) {
                  startGenerate(theme.trim());
                } else {
                  fetchThemeOptions();
                }
              }}
              onClose={() => setValidating(false)}
            />
          </section>
        )}

        {/* Landing page content — hidden once pipeline starts or validator/theme selector open */}
        {!hasOutput && !validating && !choosingTheme && (
          <LandingContent onIdeaSelect={(val) => { setIdea(val); heroRef.current?.focusInput(); }} />
        )}

        {/* Pipeline phases */}
        {hasOutput && (
          <section className="px-4 mb-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {phaseConfig.map(({ key, label, icon }, i) => (
                <PhaseIndicator key={key} label={label} status={phases[key]} icon={icon} />
              ))}
            </div>
          </section>
        )}

        {/* Output grid */}
        {hasOutput && (
          <section className="px-4 pb-16 space-y-5">
            {logs.length > 0 && (() => {
              const phaseLabels: Record<PhaseKey, string> = {
                strategy: "Strategy", website: "Website", media: "Media", stitching: "Stitching",
              };
              const phaseColors: Record<PhaseKey, string> = {
                strategy: "text-violet-400", website: "text-blue-400",
                media: "text-fuchsia-400", stitching: "text-emerald-400",
              };
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

            {(brand || productDoc) && (
              <div className="grid md:grid-cols-2 gap-5 items-start">
                {brand && <BrandCard brand={brand} />}
                {productDoc && <ProductDocCard doc={productDoc} brandName={brand?.name} />}
              </div>
            )}

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

            {websiteCode && <WebsitePreview code={websiteCode} />}

            {error && (
              <div className="mt-5 rounded-xl border border-red-500/30 bg-red-950/30 backdrop-blur-sm px-5 py-4 text-red-300 text-sm flex items-start gap-3">
                <span className="text-lg mt-0.5">⚠️</span>
                <div>
                  <p className="font-semibold text-red-200">Pipeline error</p>
                  <p className="text-red-400 text-xs mt-1">{error}</p>
                </div>
              </div>
            )}

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
      </div>
    </main>
  );
}
