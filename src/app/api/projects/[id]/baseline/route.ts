import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/permissions";

const DAY = 86_400_000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY);

export type BaselineSnapshot = {
  takenAt: string;
  takenBy: string | null;
  tasks: Record<string, { start: string; end: string }>;
  phases: Record<string, { start: string; end: string }>;
};

/** POST — snapshot the current schedule as the project baseline (stored in
 *  Project.data.baseline). The Gantt then shows planned-vs-actual ghosts.
 *  Re-running replaces the baseline (re-baselining after change control). */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = await requirePermission(session, "PROJECTS", "update");
  if (denied) return denied;
  const orgId = session.user.organizationId;

  const project = await prisma.project.findFirst({
    where: { id, organizationId: orgId },
    select: {
      id: true,
      projectNumber: true,
      startDate: true,
      data: true,
      phases: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          durationWeeks: true,
          startDate: true,
          endDate: true,
          deliverables: { select: { id: true, startDate: true, endDate: true } },
        },
      },
    },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Resolve windows exactly like the Gantt derives them.
  const baseline: BaselineSnapshot = {
    takenAt: new Date().toISOString(),
    takenBy: session.user.name ?? null,
    tasks: {},
    phases: {},
  };
  let cursor = startOfDay(project.startDate ?? new Date());
  for (const phase of project.phases) {
    const pStart = phase.startDate ? startOfDay(phase.startDate) : cursor;
    const pEndRaw = phase.endDate
      ? startOfDay(phase.endDate)
      : addDays(pStart, Math.max(1, phase.durationWeeks) * 7);
    const pEnd = pEndRaw <= pStart ? addDays(pStart, 7) : pEndRaw;
    cursor = pEnd;
    baseline.phases[phase.id] = { start: pStart.toISOString(), end: pEnd.toISOString() };
    for (const d of phase.deliverables) {
      const ds = d.startDate ? startOfDay(d.startDate) : pStart;
      const deRaw = d.endDate ? startOfDay(d.endDate) : d.startDate ? addDays(ds, 7) : pEnd;
      const de = deRaw < ds ? addDays(ds, 1) : deRaw;
      baseline.tasks[d.id] = { start: ds.toISOString(), end: de.toISOString() };
    }
  }

  const prevData =
    project.data && typeof project.data === "object" && !Array.isArray(project.data)
      ? (project.data as Record<string, unknown>)
      : {};
  await prisma.project.update({
    where: { id: project.id },
    data: { data: { ...prevData, baseline } as Prisma.InputJsonValue },
  });

  await recordAudit({
    organizationId: orgId,
    entityType: "PROJECT",
    entityId: project.id,
    entityLabel: project.projectNumber,
    action: "UPDATED",
    summary: `Baseline set (${Object.keys(baseline.tasks).length} tasks snapshotted)`,
    actorId: session.user.id,
    actorName: session.user.name,
  });

  return NextResponse.json({ baseline });
}

/** DELETE — clear the baseline. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = await requirePermission(session, "PROJECTS", "update");
  if (denied) return denied;

  const project = await prisma.project.findFirst({
    where: { id, organizationId: session.user.organizationId },
    select: { id: true, projectNumber: true, data: true },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const prevData =
    project.data && typeof project.data === "object" && !Array.isArray(project.data)
      ? (project.data as Record<string, unknown>)
      : {};
  delete prevData.baseline;
  await prisma.project.update({
    where: { id: project.id },
    data: { data: prevData as Prisma.InputJsonValue },
  });
  await recordAudit({
    organizationId: session.user.organizationId,
    entityType: "PROJECT",
    entityId: project.id,
    entityLabel: project.projectNumber,
    action: "UPDATED",
    summary: "Baseline cleared",
    actorId: session.user.id,
    actorName: session.user.name,
  });
  return NextResponse.json({ ok: true });
}
