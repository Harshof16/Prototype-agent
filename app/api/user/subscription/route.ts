import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Internal admin accounts exempt from the free-trial credit limit.
const UNLIMITED_EMAILS = ["harshs@observancegroup.com"];

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const sub = await prisma.subscription.upsert({
    where: { userId: session.user.id },
    update: {},
    create: { userId: session.user.id },
    select: { tier: true, creditsUsed: true, creditsTotal: true, renewsAt: true },
  });

  const unlimited = UNLIMITED_EMAILS.includes(session.user.email ?? "");

  return Response.json({ ...sub, unlimited });
}
