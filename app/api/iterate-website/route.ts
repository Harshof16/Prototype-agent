import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genai.getGenerativeModel({ model: "gemini-2.5-flash" });

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { currentCode, changeRequest } = await req.json();
  if (!currentCode || typeof currentCode !== "string") {
    return Response.json({ error: "Missing currentCode" }, { status: 400 });
  }
  if (!changeRequest || typeof changeRequest !== "string" || changeRequest.trim().length < 3) {
    return Response.json({ error: "Change request too short" }, { status: 400 });
  }

  const prompt = `You are a frontend engineer making a precise, surgical edit to an existing React landing page.

EXISTING CODE:
\`\`\`tsx
${currentCode}
\`\`\`

CHANGE REQUEST from the user:
${changeRequest.trim()}

RULES — follow exactly:
1. Apply ONLY the requested change. Touch nothing else.
2. Keep every other section, color, image, animation, copy, and layout exactly as-is.
3. Preserve all useState / useEffect / useRef hooks and their existing logic.
4. Keep the same component name: export default function LandingPage().
5. If the code contains the literal string "__BRAND_LOGO__" as an img src, keep it exactly — do not alter it.
6. Do NOT add, remove, or reorder sections unless the change request explicitly asks.
7. Do NOT wrap the output in markdown fences or add any explanation.

Return ONLY the complete updated TypeScript code.`;

  try {
    const result = await model.generateContent(prompt);
    let code = result.response.text().trim();
    if (code.startsWith("```")) {
      code = code.replace(/^```(?:tsx?|jsx?)?\n?/, "").replace(/\n?```$/, "");
    }
    return Response.json({ code });
  } catch (e: unknown) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
