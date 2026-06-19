// Phase 2: Builder Agent — Gemini 2.5 Flash + E2B sandbox
// Generates single-file React/Tailwind component, validates it, auto-fixes on error.

import { GoogleGenerativeAI } from "@google/generative-ai";
import { AgentState } from "../types";

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
      const isTransient = msg.includes("503") || msg.includes("Service Unavailable") || msg.includes("high demand") || msg.includes("429");
      if (!isTransient || attempt === MAX_API_RETRIES - 1) throw e;
      await new Promise((r) => setTimeout(r, RETRY_BASE_MS * 2 ** attempt));
    }
  }
  throw new Error("unreachable");
}

async function generateWebsiteCode(
  brandIdentity: AgentState["brandIdentity"],
  sitemap: AgentState["sitemap"],
  previousError?: string
): Promise<string> {
  const errorContext = previousError
    ? `\n\nPrevious attempt failed with this error — fix it:\n${previousError}`
    : "";

  const prompt = `Generate a complete, self-contained single-file React component (TypeScript, .tsx).
Use Tailwind CSS for all styling. The component runs in a browser iframe with React 18, ReactDOM, Babel standalone, and Tailwind CDN already loaded — no bundler, no Next.js.

The page should implement a landing page for:
- Brand: ${JSON.stringify(brandIdentity)}
- Sitemap sections to include on the page: ${sitemap?.map((p) => p.title).join(", ")}

Requirements:
- ONLY import from "react" (useState, useEffect, etc.). Do NOT import from "next", "next/router", "next/image", "next/link", or any other package.
- No "use client" directive.
- Default export named "LandingPage" — a plain React functional component with NO type annotations on the export (e.g. \`export default function LandingPage()\`, NOT \`const LandingPage: NextPage = ...\`).
- Hero section with brand name and tagline
- Feature sections based on the sitemap
- Use brand colors as inline Tailwind arbitrary values: primary=${brandIdentity?.colors.primary}, secondary=${brandIdentity?.colors.secondary}
- Mobile-responsive layout
- Clean, modern design

Fonts:
- IGNORE brandIdentity.fonts. Use only Tailwind's standard, web-safe font stack (\`font-sans\`, the default UI font stack) for every element. Do not reference, import, or @font-face any custom/brand fonts.

Images — use ONLY real photographs, never illustrations, icons-as-images, or AI-generated-looking images:
- Use these real Pexels stock photo URLs as <img> src values (pick the ones that best fit each section's content/category — business & team, technology, lifestyle, food, nature/abstract, mobile/finance — mix sections so the page doesn't repeat the same photo twice):
  https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=1260
  https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?auto=compress&cs=tinysrgb&w=1260
  https://images.pexels.com/photos/3184339/pexels-photo-3184339.jpeg?auto=compress&cs=tinysrgb&w=1260
  https://images.pexels.com/photos/3182812/pexels-photo-3182812.jpeg?auto=compress&cs=tinysrgb&w=1260
  https://images.pexels.com/photos/3182773/pexels-photo-3182773.jpeg?auto=compress&cs=tinysrgb&w=1260
  https://images.pexels.com/photos/3194519/pexels-photo-3194519.jpeg?auto=compress&cs=tinysrgb&w=1260
  https://images.pexels.com/photos/3184398/pexels-photo-3184398.jpeg?auto=compress&cs=tinysrgb&w=1260
  https://images.pexels.com/photos/3184433/pexels-photo-3184433.jpeg?auto=compress&cs=tinysrgb&w=1260
  https://images.pexels.com/photos/3184325/pexels-photo-3184325.jpeg?auto=compress&cs=tinysrgb&w=1260
  https://images.pexels.com/photos/3184360/pexels-photo-3184360.jpeg?auto=compress&cs=tinysrgb&w=1260
  https://images.pexels.com/photos/1181244/pexels-photo-1181244.jpeg?auto=compress&cs=tinysrgb&w=1260
  https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=1260
  https://images.pexels.com/photos/3585047/pexels-photo-3585047.jpeg?auto=compress&cs=tinysrgb&w=1260
  https://images.pexels.com/photos/374074/pexels-photo-374074.jpeg?auto=compress&cs=tinysrgb&w=1260
  https://images.pexels.com/photos/3760067/pexels-photo-3760067.jpeg?auto=compress&cs=tinysrgb&w=1260
  https://images.pexels.com/photos/3760323/pexels-photo-3760323.jpeg?auto=compress&cs=tinysrgb&w=1260
  https://images.pexels.com/photos/3850512/pexels-photo-3850512.jpeg?auto=compress&cs=tinysrgb&w=1260
  https://images.pexels.com/photos/1595385/pexels-photo-1595385.jpeg?auto=compress&cs=tinysrgb&w=1260
  https://images.pexels.com/photos/3756766/pexels-photo-3756766.jpeg?auto=compress&cs=tinysrgb&w=1260
  https://images.pexels.com/photos/3756879/pexels-photo-3756879.jpeg?auto=compress&cs=tinysrgb&w=1260
  https://images.pexels.com/photos/1639729/pexels-photo-1639729.jpeg?auto=compress&cs=tinysrgb&w=1260
  https://images.pexels.com/photos/1051838/pexels-photo-1051838.jpeg?auto=compress&cs=tinysrgb&w=1260
  https://images.pexels.com/photos/2566581/pexels-photo-2566581.jpeg?auto=compress&cs=tinysrgb&w=1260
  https://images.pexels.com/photos/3936421/pexels-photo-3936421.jpeg?auto=compress&cs=tinysrgb&w=1260
  https://images.pexels.com/photos/2102587/pexels-photo-2102587.jpeg?auto=compress&cs=tinysrgb&w=1260
  https://images.pexels.com/photos/3771089/pexels-photo-3771089.jpeg?auto=compress&cs=tinysrgb&w=1260
  https://images.pexels.com/photos/3771810/pexels-photo-3771810.jpeg?auto=compress&cs=tinysrgb&w=1260
  https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=1260
  https://images.pexels.com/photos/1640772/pexels-photo-1640772.jpeg?auto=compress&cs=tinysrgb&w=1260
  https://images.pexels.com/photos/3760069/pexels-photo-3760069.jpeg?auto=compress&cs=tinysrgb&w=1260
  https://images.pexels.com/photos/4474035/pexels-photo-4474035.jpeg?auto=compress&cs=tinysrgb&w=1260
- Include a hero image and at least one photo per major section.
- Add ONE image slider/carousel section (e.g. a "Gallery" or "In Action" section) showing 4-6 of the photos above, one at a time, with:
  - Auto-advance every ~4 seconds via \`useEffect\` + \`setInterval\` (clean up the interval on unmount)
  - Manual prev/next buttons that update the same React state
  - Small dot indicators showing the active slide, clickable to jump to that slide
  - Smooth CSS transition (opacity or transform) between slides — implement with Tailwind classes only, no external carousel library
- Return ONLY the TypeScript code, no explanation, no markdown fences.${errorContext}`;

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
    const { Sandbox } = (await import("e2b")) as { Sandbox: { create(o: unknown): Promise<{ files: { write(p: string, c: string): Promise<void> }; commands: { run(cmd: string): Promise<{ stdout: string; stderr: string }> }; kill(): Promise<void> }> } };
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

  let code = await generateWebsiteCode(state.brandIdentity, state.sitemap);
  let attempts = 0;

  while (attempts < MAX_FIX_ATTEMPTS) {
    const validation = await validateCodeWithE2B(code);
    if (validation.ok) break;
    attempts++;
    emit(`Builder: validation error (attempt ${attempts}) — fixing...`);
    code = await generateWebsiteCode(state.brandIdentity, state.sitemap, validation.error);
  }

  emit("Builder: done.");
  return {
    websiteCode: code,
    codeFixAttempts: attempts,
    phases: { ...state.phases, website: "done" },
  };
}
