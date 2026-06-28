// Phase 2: Builder Agent — Gemini 2.5 Flash + E2B sandbox
// Generates single-file React/Tailwind component, validates it, auto-fixes on error.

import { GoogleGenerativeAI } from "@google/generative-ai";
import { AgentState } from "../types";
import { STYLING_GUIDE } from "../styling-guide";

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genai.getGenerativeModel({ model: "gemini-2.5-flash" });

const MAX_API_RETRIES = 3;
const RETRY_BASE_MS = 2000;

async function withGeminiRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < MAX_API_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (e: unknown) {
      const msg = (e as Error).message ?? "";
      const isTransient =
        msg.includes("503") ||
        msg.includes("Service Unavailable") ||
        msg.includes("high demand") ||
        msg.includes("429");
      if (!isTransient || attempt === MAX_API_RETRIES - 1) throw e;
      await new Promise((r) => setTimeout(r, RETRY_BASE_MS * 2 ** attempt));
    }
  }
  throw new Error("unreachable");
}

async function generateWebsiteCode(
  brandIdentity: AgentState["brandIdentity"],
  sitemap: AgentState["sitemap"],
  hasLogo: boolean,
  competitorInsights?: string,
  previousError?: string
): Promise<string> {
  const errorContext = previousError
    ? `\n\nPrevious attempt failed with this error — fix it:\n${previousError}`
    : "";

  // Logo: inject as a hard constraint at the TOP of the prompt so the model cannot overlook it.
  // The placeholder __BRAND_LOGO__ is replaced with the real data URL AFTER generation (below).
  const logoBlock = hasLogo
    ? `
╔══════════════════════════════════════════════╗
║  ⚠  LOGO REQUIREMENT — NON-NEGOTIABLE       ║
╚══════════════════════════════════════════════╝
The user has uploaded their brand logo. You MUST display it in the navigation bar.

EXACT RULE: wherever you render the brand name in the <nav>, also render this img tag:
  <img src="__BRAND_LOGO__" alt="${brandIdentity?.name ?? "Brand"} logo" style={{height:"40px",width:"auto",objectFit:"contain"}} />

Place the <img> to the LEFT of the brand name text inside the nav.
Use the literal string __BRAND_LOGO__ as the src — do NOT use any URL, variable, or import.
This placeholder will be replaced with the real image at runtime.
✗ DO NOT omit this img tag.
✗ DO NOT use any other src value.
✗ DO NOT use Next.js Image component.
`
    : "";

  const competitorSection = competitorInsights
    ? `\n${competitorInsights}\n`
    : "";

  const prompt = `You are a world-class frontend engineer and UX designer. Generate a complete, self-contained single-file React component (TypeScript, .tsx) for a startup landing page.

The component runs in a browser iframe with React 18, ReactDOM, Babel standalone, and Tailwind CDN already loaded — no bundler, no Next.js.
${logoBlock}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BRAND & CONTENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Brand identity: ${JSON.stringify(brandIdentity)}
Sections to include: ${sitemap?.map((p) => p.title).join(", ")}
${competitorSection}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DESIGN SYSTEM (MANDATORY — READ BEFORE CODING)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${STYLING_GUIDE}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TECHNICAL REQUIREMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- ONLY import from "react" (useState, useEffect, useRef, etc.). Do NOT import from "next", "next/router", "next/image", "next/link", or any other package.
- No "use client" directive.
- Default export named "LandingPage" — a plain React functional component with NO type annotations on the export:
  ✓ export default function LandingPage()
  ✗ const LandingPage: NextPage = ...
- Use brand colors via Tailwind arbitrary values: primary=${brandIdentity?.colors.primary}, secondary=${brandIdentity?.colors.secondary}, accent=${brandIdentity?.colors.accent}
- Mobile-responsive layout using Tailwind responsive prefixes (sm:, md:, lg:)
${hasLogo ? `- LOGO REMINDER: the <img src="__BRAND_LOGO__" ...> tag MUST appear in the nav bar. The literal string __BRAND_LOGO__ is the src.` : ""}

Fonts:
- Use ONLY font-sans (Tailwind default stack) for all text. Do NOT reference, import, or @font-face any custom fonts.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IMAGES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Use ONLY real Pexels photographs (never icons-as-images or placeholders). Pick photos that best match each section's content and MIX them so no photo repeats:

Business / Team:
  https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=1260
  https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?auto=compress&cs=tinysrgb&w=1260
  https://images.pexels.com/photos/3184339/pexels-photo-3184339.jpeg?auto=compress&cs=tinysrgb&w=1260
  https://images.pexels.com/photos/3182812/pexels-photo-3182812.jpeg?auto=compress&cs=tinysrgb&w=1260
  https://images.pexels.com/photos/3184398/pexels-photo-3184398.jpeg?auto=compress&cs=tinysrgb&w=1260
  https://images.pexels.com/photos/3184433/pexels-photo-3184433.jpeg?auto=compress&cs=tinysrgb&w=1260
  https://images.pexels.com/photos/3184325/pexels-photo-3184325.jpeg?auto=compress&cs=tinysrgb&w=1260
  https://images.pexels.com/photos/1181244/pexels-photo-1181244.jpeg?auto=compress&cs=tinysrgb&w=1260

Technology / Devices:
  https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=1260
  https://images.pexels.com/photos/374074/pexels-photo-374074.jpeg?auto=compress&cs=tinysrgb&w=1260
  https://images.pexels.com/photos/3760067/pexels-photo-3760067.jpeg?auto=compress&cs=tinysrgb&w=1260
  https://images.pexels.com/photos/3760323/pexels-photo-3760323.jpeg?auto=compress&cs=tinysrgb&w=1260
  https://images.pexels.com/photos/3850512/pexels-photo-3850512.jpeg?auto=compress&cs=tinysrgb&w=1260

Lifestyle / People:
  https://images.pexels.com/photos/1595385/pexels-photo-1595385.jpeg?auto=compress&cs=tinysrgb&w=1260
  https://images.pexels.com/photos/3756766/pexels-photo-3756766.jpeg?auto=compress&cs=tinysrgb&w=1260
  https://images.pexels.com/photos/1639729/pexels-photo-1639729.jpeg?auto=compress&cs=tinysrgb&w=1260
  https://images.pexels.com/photos/1051838/pexels-photo-1051838.jpeg?auto=compress&cs=tinysrgb&w=1260
  https://images.pexels.com/photos/2566581/pexels-photo-2566581.jpeg?auto=compress&cs=tinysrgb&w=1260
  https://images.pexels.com/photos/3936421/pexels-photo-3936421.jpeg?auto=compress&cs=tinysrgb&w=1260
  https://images.pexels.com/photos/3585047/pexels-photo-3585047.jpeg?auto=compress&cs=tinysrgb&w=1260

Abstract / Nature / Finance:
  https://images.pexels.com/photos/2102587/pexels-photo-2102587.jpeg?auto=compress&cs=tinysrgb&w=1260
  https://images.pexels.com/photos/3771089/pexels-photo-3771089.jpeg?auto=compress&cs=tinysrgb&w=1260
  https://images.pexels.com/photos/3771810/pexels-photo-3771810.jpeg?auto=compress&cs=tinysrgb&w=1260
  https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=1260
  https://images.pexels.com/photos/1640772/pexels-photo-1640772.jpeg?auto=compress&cs=tinysrgb&w=1260
  https://images.pexels.com/photos/3760069/pexels-photo-3760069.jpeg?auto=compress&cs=tinysrgb&w=1260
  https://images.pexels.com/photos/4474035/pexels-photo-4474035.jpeg?auto=compress&cs=tinysrgb&w=1260
  https://images.pexels.com/photos/3182773/pexels-photo-3182773.jpeg?auto=compress&cs=tinysrgb&w=1260
  https://images.pexels.com/photos/3194519/pexels-photo-3194519.jpeg?auto=compress&cs=tinysrgb&w=1260
  https://images.pexels.com/photos/3184360/pexels-photo-3184360.jpeg?auto=compress&cs=tinysrgb&w=1260
  https://images.pexels.com/photos/3756879/pexels-photo-3756879.jpeg?auto=compress&cs=tinysrgb&w=1260

Include at least one photo per major section. Add ONE image slider/carousel section (e.g. "Gallery" or "In Action") mid-page with:
- Auto-advance every ~4 seconds via useEffect + setInterval (clean up on unmount)
- Manual prev/next buttons
- Dot indicators (clickable)
- Smooth CSS transition via Tailwind (opacity or transform)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Return ONLY the TypeScript code. No explanation. No markdown fences.${errorContext}`;

  const result = await withGeminiRetry(() => model.generateContent(prompt));
  let code = result.response.text().trim();

  // Strip markdown fences if model added them despite instructions
  if (code.startsWith("```")) {
    code = code.replace(/^```(?:tsx?|jsx?)?\n?/, "").replace(/\n?```$/, "");
  }
  return code;
}

async function validateCodeWithE2B(code: string): Promise<{ ok: boolean; error?: string }> {
  if (!process.env.E2B_API_KEY) {
    const hasExport = /export\s+default/.test(code);
    const hasJSX = /<[A-Z]/.test(code) || /return\s*\(/.test(code);
    if (!hasExport || !hasJSX) {
      return { ok: false, error: "Missing default export or JSX structure" };
    }
    return { ok: true };
  }

  try {
    const { Sandbox } = (await import("e2b")) as {
      Sandbox: {
        create(o: unknown): Promise<{
          files: { write(p: string, c: string): Promise<void> };
          commands: { run(cmd: string): Promise<{ stdout: string; stderr: string }> };
          kill(): Promise<void>;
        }>;
      };
    };
    const sandbox = await Sandbox.create({ apiKey: process.env.E2B_API_KEY, timeout: 30000 });
    await sandbox.files.write("/app/page.tsx", code);
    const result = await sandbox.commands.run(
      "cd /app && npx tsc --noEmit --jsx react --esModuleInterop 2>&1 || true"
    );
    await sandbox.kill();

    const output = result.stdout + result.stderr;
    const hasErrors = /error TS\d+/.test(output);
    return hasErrors ? { ok: false, error: output.slice(0, 500) } : { ok: true };
  } catch {
    return { ok: true };
  }
}

const MAX_FIX_ATTEMPTS = 2;

export async function runBuilderAgent(
  state: AgentState,
  emit: (msg: string) => void
): Promise<Partial<AgentState>> {
  emit("Builder: generating website code with Gemini Flash...");

  const hasLogo = !!state.logoDataUrl;
  let code = await generateWebsiteCode(
    state.brandIdentity,
    state.sitemap,
    hasLogo,
    state.competitorInsights
  );
  let attempts = 0;

  while (attempts < MAX_FIX_ATTEMPTS) {
    const validation = await validateCodeWithE2B(code);
    if (validation.ok) break;
    attempts++;
    emit(`Builder: validation error (attempt ${attempts}) — fixing...`);
    code = await generateWebsiteCode(
      state.brandIdentity,
      state.sitemap,
      hasLogo,
      state.competitorInsights,
      validation.error
    );
  }

  if (state.logoDataUrl) {
    if (code.includes("__BRAND_LOGO__")) {
      // Happy path: model used the placeholder correctly
      code = code.replaceAll("__BRAND_LOGO__", state.logoDataUrl);
      emit("Builder: logo injected into nav.");
    } else {
      // Fallback: model ignored the instruction — surgically insert the img tag
      // into the first <nav …> JSX element we find.
      const logoImg = `<img src="${state.logoDataUrl}" alt="${state.brandIdentity?.name ?? "Brand"} logo" style={{height:"40px",width:"auto",objectFit:"contain",display:"inline-block"}} />`;
      // Try inserting after the opening <nav tag's closing >
      const navTagMatch = code.match(/<nav\b[^>]*>/);
      if (navTagMatch && navTagMatch.index !== undefined) {
        const insertAt = navTagMatch.index + navTagMatch[0].length;
        code = code.slice(0, insertAt) + "\n          " + logoImg + code.slice(insertAt);
        emit("Builder: logo fallback-injected into nav (placeholder was not used).");
      } else {
        emit("Builder: WARNING — no <nav> found; logo could not be injected.");
      }
    }
  }

  emit("Builder: done.");
  return {
    websiteCode: code,
    codeFixAttempts: attempts,
    phases: { ...state.phases, website: "done" },
  };
}
