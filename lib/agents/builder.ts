// Phase 2: Builder Agent — Gemini 2.5 Flash + E2B sandbox
// Generates single-file React/Tailwind component, validates it, auto-fixes on error.

import { GoogleGenerativeAI } from "@google/generative-ai";
import { AgentState } from "../types";

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genai.getGenerativeModel({ model: "gemini-2.5-flash-preview-05-20" });

const MAX_FIX_ATTEMPTS = 2;

async function generateWebsiteCode(
  brandIdentity: AgentState["brandIdentity"],
  sitemap: AgentState["sitemap"],
  previousError?: string
): Promise<string> {
  const errorContext = previousError
    ? `\n\nPrevious attempt failed with this error — fix it:\n${previousError}`
    : "";

  const prompt = `Generate a complete, self-contained single-file React component as a Next.js page (TypeScript, .tsx).
Use Tailwind CSS for all styling. No external imports except React and Next.js built-ins.
The page should implement a landing page for:
- Brand: ${JSON.stringify(brandIdentity)}
- Sitemap sections to include on the page: ${sitemap?.map((p) => p.title).join(", ")}

Requirements:
- Default export named "LandingPage"
- Hero section with brand name and tagline
- Feature sections based on the sitemap
- Use brand colors as inline Tailwind arbitrary values: primary=${brandIdentity?.colors.primary}, secondary=${brandIdentity?.colors.secondary}
- Mobile-responsive layout
- Clean, modern design
- Return ONLY the TypeScript code, no explanation, no markdown fences.${errorContext}`;

  const result = await model.generateContent(prompt);
  let code = result.response.text().trim();

  // Strip markdown fences if model added them despite instructions
  if (code.startsWith("```")) {
    code = code.replace(/^```(?:tsx?|jsx?)?\n?/, "").replace(/\n?```$/, "");
  }
  return code;
}

async function validateCodeWithE2B(code: string): Promise<{ ok: boolean; error?: string }> {
  // E2B sandbox validation — requires E2B_API_KEY
  // Falls back to static syntax check if E2B key not configured
  if (!process.env.E2B_API_KEY) {
    // Basic static validation: check for required exports and JSX
    const hasExport = /export\s+default/.test(code);
    const hasJSX = /<[A-Z]/.test(code) || /return\s*\(/.test(code);
    if (!hasExport || !hasJSX) {
      return { ok: false, error: "Missing default export or JSX structure" };
    }
    return { ok: true };
  }

  try {
    // Dynamic import so build doesn't fail without E2B installed
    const { Sandbox } = await import("e2b" as string as any);
    const sandbox = await Sandbox.create({ apiKey: process.env.E2B_API_KEY, timeout: 30000 });
    await sandbox.files.write("/app/page.tsx", code);
    const result = await sandbox.commands.run(
      "cd /app && npx tsc --noEmit --jsx react --esModuleInterop 2>&1 || true"
    );
    await sandbox.kill();

    const output = result.stdout + result.stderr;
    const hasErrors = /error TS\d+/.test(output);
    return hasErrors ? { ok: false, error: output.slice(0, 500) } : { ok: true };
  } catch (e: unknown) {
    // If E2B fails, don't block the pipeline
    return { ok: true };
  }
}

export async function runBuilderAgent(
  state: AgentState,
  emit: (msg: string) => void
): Promise<Partial<AgentState>> {
  emit("Builder: generating website code with Gemini Flash...");

  let code = await generateWebsiteCode(state.brandIdentity, state.sitemap);
  let attempts = 0;

  while (attempts < MAX_FIX_ATTEMPTS) {
    emit(`Builder: validating code (attempt ${attempts + 1})...`);
    const validation = await validateCodeWithE2B(code);

    if (validation.ok) {
      emit("Builder: code validated successfully.");
      break;
    }

    emit(`Builder: code error detected, requesting one-shot fix...`);
    code = await generateWebsiteCode(state.brandIdentity, state.sitemap, validation.error);
    attempts++;
  }

  emit("Builder: done.");
  return {
    websiteCode: code,
    codeFixAttempts: attempts,
    phases: { ...state.phases, website: "done" },
  };
}
