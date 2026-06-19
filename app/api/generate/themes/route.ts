import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { generateThemeOptions } from "@/lib/agents/strategist";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { idea } = await req.json();

  if (!idea || typeof idea !== "string" || idea.trim().length < 5) {
    return new Response(JSON.stringify({ error: "Idea must be at least 5 characters." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const themes = await generateThemeOptions(idea.trim());
    return new Response(JSON.stringify({ themes }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
