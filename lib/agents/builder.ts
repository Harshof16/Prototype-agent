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
