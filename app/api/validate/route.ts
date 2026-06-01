import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { runValidatorTurn, ValidatorTurn } from "@/lib/agents/validator";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await req.json() as { idea?: string; history?: ValidatorTurn[] };
  const { idea, history = [] } = body;

  if (!idea || typeof idea !== "string" || idea.trim().length < 5) {
    return new Response(JSON.stringify({ error: "Idea must be at least 5 characters." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const result = await runValidatorTurn(idea.trim(), history);
    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
