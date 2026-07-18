import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Overdue project tasks → TASK_DUE notifications, generated on demand when
 *  the bell polls (no cron needed). Deduped per task for 3 days via the url. */
async function ensureOverdueNotifications(userId: string, organizationId: string) {
  const now = new Date();
  const overdue = await prisma.projectDeliverable.findMany({
    where: {
      ownerId: userId,
      status: { not: "DONE" },
      endDate: { not: null, lt: now },
      phase: { project: { organizationId, status: { in: ["PLANNING", "ACTIVE"] } } },
    },
    select: {
      id: true,
      name: true,
      endDate: true,
      phase: { select: { project: { select: { id: true, projectNumber: true } } } },
    },
    take: 10,
  });
  if (!overdue.length) return;

  const since = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const urls = overdue.map((t) => `/app/projects/${t.phase.project.id}?task=${t.id}`);
  const existing = await prisma.notification.findMany({
    where: { userId, organizationId, type: "TASK_DUE", url: { in: urls }, createdAt: { gte: since } },
    select: { url: true },
  });
  const seen = new Set(existing.map((e) => e.url));
  const fresh = overdue.filter((t) => !seen.has(`/app/projects/${t.phase.project.id}?task=${t.id}`));
  if (!fresh.length) return;

  await prisma.notification
    .createMany({
      data: fresh.map((t) => ({
        organizationId,
        userId,
        type: "TASK_DUE" as const,
        title: `“${t.name}” on ${t.phase.project.projectNumber} is overdue (due ${t.endDate!.toLocaleDateString("en-GB", { day: "numeric", month: "short" })})`,
        url: `/app/projects/${t.phase.project.id}?task=${t.id}`,
      })),
    })
    .catch(() => null);
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.organizationId || !session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureOverdueNotifications(session.user.id, session.user.organizationId).catch(() => null);

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: {
        userId: session.user.id,
        organizationId: session.user.organizationId,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.notification.count({
      where: {
        userId: session.user.id,
        organizationId: session.user.organizationId,
        readAt: null,
      },
    }),
  ]);

  return NextResponse.json({ notifications, unreadCount });
}

const postSchema = z.object({
  action: z.literal("markAllRead"),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.organizationId || !session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid" }, { status: 400 });
  }

  await prisma.notification.updateMany({
    where: {
      userId: session.user.id,
      organizationId: session.user.organizationId,
      readAt: null,
    },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
