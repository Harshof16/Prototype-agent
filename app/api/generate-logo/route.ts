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

  const { idea, brandName } = await req.json();

  if (!idea || typeof idea !== "string") {
    return Response.json({ error: "Idea is required" }, { status: 400 });
  }

  const nameHint = brandName ? ` The brand name is "${brandName}".` : "";

  const prompt = `Generate a clean, professional SVG logo for a startup with this idea: "${idea}".${nameHint}

Requirements:
- Return ONLY valid SVG markup, nothing else — no explanation, no markdown fences.
- viewBox="0 0 200 200", width="200", height="200"
- Create a minimal, modern abstract icon/mark (no text inside the SVG)
- Use 2–3 harmonious colors that feel modern and startup-appropriate
- The design should be simple, geometric, and instantly recognizable at small sizes
- Transparent background (no <rect> fill covering the whole canvas)
- The icon should visually represent the core concept of the startup idea
- Make it look polished and unique`;

  try {
    const result = await model.generateContent(prompt);
    let svg = result.response.text().trim();

    // Strip markdown fences
    if (svg.startsWith("```")) {
      svg = svg.replace(/^```(?:svg|xml)?\n?/, "").replace(/\n?```$/, "").trim();
    }

    // Strip XML declaration and doctype headers — they break <img> rendering
    svg = svg.replace(/^<\?xml[^?]*\?>\s*/i, "").replace(/^<!DOCTYPE[^>]*>\s*/i, "").trim();

    // Trim anything before the opening <svg tag (Gemini sometimes adds commentary)
    const svgStart = svg.indexOf("<svg");
    if (svgStart === -1) {
      return Response.json({ error: "Model did not return valid SVG" }, { status: 500 });
    }
    svg = svg.slice(svgStart);

    // Ensure xmlns attribute is present — required for <img> rendering
    if (!svg.includes("xmlns=")) {
      svg = svg.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
    }

    // Use URL encoding instead of base64 — more robust for SVG in <img> tags
    const dataUrl = `data:image/svg+xml,${encodeURIComponent(svg)}`;
    return Response.json({ dataUrl });
  } catch (e: unknown) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
