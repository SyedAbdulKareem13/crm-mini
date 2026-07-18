import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import {
  pathExists,
  projectDependencyEdges,
  enforceProjectDependencies,
} from "@/lib/task-dependencies";

const createSchema = z.object({
  predecessorId: z.string().min(1),
  successorId: z.string().min(1),
});

/** POST — link two tasks finish-to-start. Guards: same project, no self
 *  link, no duplicate, no cycle. Auto-shifts the successor chain when the
 *  new link is already violated. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = session.user.organizationId;

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  const { predecessorId, successorId } = parsed.data;

  if (predecessorId === successorId) {
    return NextResponse.json({ error: "A task can't depend on itself." }, { status: 400 });
  }

  const project = await prisma.project.findFirst({
    where: { id, organizationId: orgId },
    select: { id: true, projectNumber: true },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Both tasks must belong to this project.
  const tasks = await prisma.projectDeliverable.findMany({
    where: { id: { in: [predecessorId, successorId] }, phase: { projectId: project.id } },
    select: { id: true, name: true },
  });
  if (tasks.length !== 2) {
    return NextResponse.json({ error: "Both tasks must belong to this project." }, { status: 400 });
  }

  const edges = await projectDependencyEdges(project.id);
  if (edges.some((e) => e.predecessorId === predecessorId && e.successorId === successorId)) {
    return NextResponse.json({ error: "That dependency already exists." }, { status: 409 });
  }
  // Adding P→S creates a cycle when S already reaches P.
  if (pathExists(edges, successorId, predecessorId)) {
    return NextResponse.json(
      { error: "That link would create a circular dependency.", code: "cycle" },
      { status: 409 }
    );
  }

  const dep = await prisma.projectTaskDependency.create({
    data: { predecessorId, successorId },
    select: { id: true, predecessorId: true, successorId: true },
  });

  // If the successor now starts before the predecessor ends, shift it (and
  // anything downstream) forward immediately.
  const shifted = await enforceProjectDependencies(project.id);

  const predName = tasks.find((t) => t.id === predecessorId)?.name ?? "task";
  const succName = tasks.find((t) => t.id === successorId)?.name ?? "task";
  await recordAudit({
    organizationId: orgId,
    entityType: "PROJECT",
    entityId: project.id,
    entityLabel: project.projectNumber,
    action: "UPDATED",
    summary: `Dependency added: “${succName}” starts after “${predName}”${shifted.length ? ` · ${shifted.length} task${shifted.length === 1 ? "" : "s"} auto-shifted` : ""}`,
    actorId: session.user.id,
    actorName: session.user.name,
  });

  return NextResponse.json({ dependency: dep, shifted });
}

/** DELETE ?predecessorId=…&successorId=… — remove a link. */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = session.user.organizationId;

  const url = new URL(req.url);
  const predecessorId = url.searchParams.get("predecessorId") ?? "";
  const successorId = url.searchParams.get("successorId") ?? "";
  if (!predecessorId || !successorId) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const project = await prisma.project.findFirst({
    where: { id, organizationId: orgId },
    select: { id: true, projectNumber: true },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const dep = await prisma.projectTaskDependency.findFirst({
    where: {
      predecessorId,
      successorId,
      predecessor: { phase: { projectId: project.id } },
    },
    select: { id: true, predecessor: { select: { name: true } }, successor: { select: { name: true } } },
  });
  if (!dep) return NextResponse.json({ error: "Dependency not found" }, { status: 404 });

  await prisma.projectTaskDependency.delete({ where: { id: dep.id } });
  await recordAudit({
    organizationId: orgId,
    entityType: "PROJECT",
    entityId: project.id,
    entityLabel: project.projectNumber,
    action: "UPDATED",
    summary: `Dependency removed: “${dep.successor.name}” no longer waits for “${dep.predecessor.name}”`,
    actorId: session.user.id,
    actorName: session.user.name,
  });
  return NextResponse.json({ ok: true });
}
