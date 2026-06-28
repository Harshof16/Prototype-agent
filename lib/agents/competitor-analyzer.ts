// Competitor Analyzer — extracts URLs from the raw idea, fetches their HTML,
// and uses Groq to distill layout/design insights for the builder agent.

import OpenAI from "openai";

const groq = new OpenAI({
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY!,
});

const FETCH_TIMEOUT_MS = 8000;
const MAX_HTML_CHARS = 60_000;
const MAX_COMPETITORS = 3;

// Common internal/utility domains to ignore when scanning the idea for URLs
const IGNORE_DOMAINS = new Set([
  "pexels.com", "unsplash.com", "googleapis.com", "gstatic.com",
  "openai.com", "anthropic.com", "gemini.google.com", "groq.com",
  "github.com", "npmjs.com", "tailwindcss.com", "reactjs.org",
]);

export function extractCompetitorUrls(text: string): string[] {
  // Match bare domains and full URLs mentioned in the idea text
  const regex =
    /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.(?:com|io|co|app|dev|ai|net|org|so|xyz|studio|tools|pro|tech|gg|me|us|uk)(?:\/[^\s,;)'"<>]*)?)/gi;

  const found = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const raw = match[0].toLowerCase();
    const domain = raw.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];

    if (IGNORE_DOMAINS.has(domain)) continue;
    // Skip emails
    if (text[match.index - 1] === "@") continue;

    const normalized = raw.startsWith("http") ? raw : `https://${raw}`;
    found.add(normalized);
    if (found.size >= MAX_COMPETITORS) break;
  }

  return [...found];
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; StartupBuilderBot/1.0; +https://agent.raga.ai)",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: controller.signal,
      redirect: "follow",
    });

    clearTimeout(timer);
    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) return null;

    const text = await res.text();
    return text.slice(0, MAX_HTML_CHARS);
  } catch {
    return null;
  }
}

function parsePageStructure(html: string, url: string): string {
  const strip = (s: string) =>
    s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

  // Remove scripts, styles, SVG blobs to reduce noise
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<svg[\s\S]*?<\/svg>/gi, "");

  const h1 = strip(cleaned.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "").slice(0, 150);
  const h2s = [...cleaned.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)]
    .map((m) => strip(m[1]).slice(0, 80))
    .filter(Boolean)
    .slice(0, 8);
  const h3s = [...cleaned.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>/gi)]
    .map((m) => strip(m[1]).slice(0, 60))
    .filter(Boolean)
    .slice(0, 8);

  const navRaw = cleaned.match(/<nav[^>]*>([\s\S]*?)<\/nav>/i)?.[1] ?? "";
  const navLinks = [...navRaw.matchAll(/>([A-Z][a-zA-Z\s]+)</g)]
    .map((m) => m[1].trim())
    .filter((t) => t.length > 2 && t.length < 30)
    .slice(0, 10);

  const ctaTexts = [
    ...cleaned.matchAll(
      /<(?:button|a)[^>]*(?:class="[^"]*(?:btn|cta|button|primary)[^"]*"|role="button")[^>]*>([\s\S]*?)<\/(?:button|a)>/gi
    ),
  ]
    .map((m) => strip(m[1]).slice(0, 60))
    .filter((t) => t.length > 2 && t.length < 60)
    .slice(0, 6);

  return JSON.stringify({ url, h1, h2Sections: h2s, h3Points: h3s, navLinks, ctaButtons: ctaTexts });
}

async function analyzeWithGroq(structureJson: string): Promise<string> {
  const res = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    temperature: 0.3,
    messages: [
      {
        role: "system",
        content:
          "You are a senior UX/design analyst. Given parsed HTML structure data from a competitor's website, extract concise, actionable design and layout insights for building a competing landing page. Focus on: section order, hero style, information hierarchy, CTA strategy, social proof approach, and content tone. Be specific and brief.",
      },
      {
        role: "user",
        content: `Analyze this competitor website structure and return a concise bullet-point design brief (max 200 words):\n\n${structureJson}`,
      },
    ],
  });
  return res.choices[0].message.content ?? "";
}

export interface CompetitorAnalysis {
  url: string;
  insights: string;
  error?: string;
}

export async function analyzeCompetitors(
  rawIdea: string,
  emit: (msg: string) => void
): Promise<CompetitorAnalysis[]> {
  const urls = extractCompetitorUrls(rawIdea);
  if (urls.length === 0) return [];

  emit(`Builder: found ${urls.length} competitor URL(s) — analyzing layout patterns...`);

  const results = await Promise.all(
    urls.map(async (url): Promise<CompetitorAnalysis> => {
      const html = await fetchHtml(url);
      if (!html) {
        emit(`Builder: could not fetch ${url} (skipped)`);
        return { url, insights: "", error: "fetch failed" };
      }

      try {
        const structure = parsePageStructure(html, url);
        const insights = await analyzeWithGroq(structure);
        emit(`Builder: analyzed ${url}`);
        return { url, insights };
      } catch {
        emit(`Builder: failed to analyze ${url} (skipped)`);
        return { url, insights: "", error: "analysis failed" };
      }
    })
  );

  return results.filter((r) => r.insights.length > 0);
}

export function formatCompetitorContext(analyses: CompetitorAnalysis[]): string {
  if (analyses.length === 0) return "";

  const lines = analyses.map(
    (a) => `### Competitor: ${a.url}\n${a.insights}`
  );

  return `
## COMPETITOR LAYOUT ANALYSIS
The user's idea mentions these competitor websites. Study their patterns and build a BETTER, differentiated version — same category, stronger value proposition, cleaner execution.

${lines.join("\n\n")}

Use these insights to:
- Match or exceed the information hierarchy and section depth of these competitors
- Adopt proven layout patterns where they make sense, but add a fresher visual treatment
- Explicitly address what competitors are doing (e.g., if they emphasize enterprise, lean into simplicity)
- Do NOT copy wording or brand identity — only borrow structural and UX patterns
`.trim();
}
