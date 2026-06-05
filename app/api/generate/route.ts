import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { runPipeline } from "@/lib/pipeline";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes for full pipeline

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

  // Fetch subscription, creating a FREE one if this is an existing user without one
  const sub = await prisma.subscription.upsert({
    where: { userId: session.user.id },
    update: {},
    create: { userId: session.user.id },
  });

  if (sub.creditsUsed >= sub.creditsTotal) {
    return new Response(
      JSON.stringify({ error: "credit_limit_reached", tier: sub.tier }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  // Create Run + deduct credit atomically before the pipeline starts
  const [run] = await prisma.$transaction([
    prisma.run.create({
      data: { userId: session.user.id, idea: idea.trim(), status: "RUNNING" },
    }),
    prisma.subscription.update({
      where: { userId: session.user.id },
      data: { creditsUsed: { increment: 1 } },
    }),
  ]);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let pipelineError = false;
      const artifacts: Record<string, string> = {};

      try {
        for await (const event of runPipeline(idea.trim(), sub.tier)) {
          const chunk = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(chunk));

          // Collect artifact URLs from pipeline events
          if (event.type === "artifact") {
            if (event.artifactType === "website") artifacts.websiteUrl = event.url;
            if (event.artifactType === "video") artifacts.finalVideoUrl = event.url;
            if (event.artifactType === "doc") artifacts.productDoc = event.content;
          }
        }
      } catch (e: unknown) {
        pipelineError = true;
        const errEvent = { type: "error", message: (e as Error).message };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(errEvent)}\n\n`));
      } finally {
        await prisma.run.update({
          where: { id: run.id },
          data: {
            status: pipelineError ? "FAILED" : "COMPLETED",
            artifacts: Object.keys(artifacts).length ? artifacts : undefined,
            completedAt: new Date(),
          },
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
