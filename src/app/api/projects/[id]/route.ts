import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import {
  PROJECT_STATUSES,
  PHASE_STATUSES,
  DELIVERABLE_STATUSES,
  getPipelineGates,
} from "@/lib/sap-config";
import { enforceProjectDependencies, type ShiftedTask } from "@/lib/task-dependencies";
import { requirePermission } from "@/lib/permissions";

/** GET — fresh planner payload (used by realtime sync to pull a peer's edit). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = await requirePermission(session, "PROJECTS", "read");
  if (denied) return denied;

  const project = await prisma.project.findFirst({
    where: { id, organizationId: session.user.organizationId },
    include: {
      phases: {
        orderBy: { position: "asc" },
        include: {
          deliverables: {
            orderBy: { position: "asc" },
            include: {
              owner: { select: { id: true, name: true } },
              predecessors: { select: { predecessorId: true } },
            },
          },
        },
      },
    },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ project });
}

/** With sequential execution on, work can't start/finish in a phase while an
 *  earlier phase is still open. Returns a human-readable reason or null. */
async function sequentialBlockReason(projectId: string, phaseId: string): Promise<string | null> {
  const phases = await prisma.projectPhase.findMany({
    where: { projectId },
    select: { id: true, name: true, position: true, status: true },
    orderBy: { position: "asc" },
  });
  const target = phases.find((p) => p.id === phaseId);
  if (!target) return null;
  const openEarlier = phases.find((p) => p.position < target.position && p.status !== "COMPLETED");
  return openEarlier
    ? `Sequential phase execution is enabled: complete “${openEarlier.name}” before working in “${target.name}”. (Configurable in Admin → SAP Projects.)`
    : null;
}

const patchSchema = z
  .object({
    name: z.string().min(2).optional(),
    status: z.enum(PROJECT_STATUSES).optional(),
    startDate: z.string().nullable().optional(),
    targetEndDate: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    phase: z
      .object({
        id: z.string().min(1),
        status: z.enum(PHASE_STATUSES).optional(),
        durationWeeks: z.coerce.number().int().min(1).max(200).optional(),
        startDate: z.string().nullable().optional(),
        endDate: z.string().nullable().optional(),
      })
      .optional(),
    deliverable: z
      .object({
        id: z.string().min(1),
        status: z.enum(DELIVERABLE_STATUSES).optional(),
        priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
        ownerId: z.string().nullable().optional(),
        startDate: z.string().nullable().optional(),
        endDate: z.string().nullable().optional(),
        progressPct: z.coerce.number().int().min(0).max(100).optional(),
        estimateHours: z.coerce.number().min(0).max(100000).nullable().optional(),
        actualHours: z.coerce.number().min(0).max(100000).nullable().optional(),
      })
      .optional(),
  })
  .refine(
    (d) =>
      d.name !== undefined ||
      d.status !== undefined ||
      d.startDate !== undefined ||
      d.targetEndDate !== undefined ||
      d.notes !== undefined ||
      d.phase !== undefined ||
      d.deliverable !== undefined,
    { message: "Nothing to update" }
  );

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = await requirePermission(session, "PROJECTS", "update");
  if (denied) return denied;
  const orgId = session.user.organizationId;

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });
  const d = parsed.data;

  const project = await prisma.project.findFirst({
    where: { id, organizationId: orgId },
    select: {
      id: true,
      projectNumber: true,
      name: true,
      status: true,
      data: true,
      startDate: true,
      createdAt: true,
    },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const gates = await getPipelineGates(orgId);

  // Governance: a project can't be completed while phases are still open.
  if (d.status === "COMPLETED" && gates.completeRequiresAllPhases) {
    const open = await prisma.projectPhase.count({
      where: { projectId: project.id, NOT: { status: "COMPLETED" } },
    });
    if (open > 0) {
      return NextResponse.json(
        {
          error: `${open} phase${open === 1 ? " is" : "s are"} still open — complete every phase before marking the project completed. (Configurable in Admin → SAP Projects.)`,
          code: "gate",
        },
        { status: 409 }
      );
    }
  }

  // Phase update (status / schedule), scoped through the project.
  if (d.phase) {
    const phase = await prisma.projectPhase.findFirst({
      where: { id: d.phase.id, projectId: project.id },
      select: { id: true, name: true },
    });
    if (!phase) return NextResponse.json({ error: "Phase not found" }, { status: 404 });
    // Governance: sequential phase execution (config).
    if (gates.sequentialPhases && (d.phase.status === "IN_PROGRESS" || d.phase.status === "COMPLETED")) {
      const reason = await sequentialBlockReason(project.id, phase.id);
      if (reason) return NextResponse.json({ error: reason, code: "gate" }, { status: 409 });
    }
    await prisma.projectPhase.update({
      where: { id: phase.id },
      data: {
        ...(d.phase.status !== undefined ? { status: d.phase.status } : {}),
        ...(d.phase.durationWeeks !== undefined ? { durationWeeks: d.phase.durationWeeks } : {}),
        ...(d.phase.startDate !== undefined
          ? { startDate: d.phase.startDate ? new Date(d.phase.startDate) : null }
          : {}),
        ...(d.phase.endDate !== undefined
          ? { endDate: d.phase.endDate ? new Date(d.phase.endDate) : null }
          : {}),
      },
    });
    // Completing a phase completes its remaining deliverables; a fresh restart leaves them.
    if (d.phase.status === "COMPLETED") {
      await prisma.projectDeliverable.updateMany({
        where: { phaseId: phase.id, NOT: { status: "DONE" } },
        data: { status: "DONE", progressPct: 100 },
      });
    }
  }

  // Deliverable update (status / assignee / priority / schedule), scoped through the project.
  if (d.deliverable) {
    const del = await prisma.projectDeliverable.findFirst({
      where: { id: d.deliverable.id, phase: { projectId: project.id } },
      select: { id: true, phaseId: true, name: true, ownerId: true },
    });
    if (!del) return NextResponse.json({ error: "Deliverable not found" }, { status: 404 });
    // Governance: sequential phase execution also guards starting deliverables early
    // (recording progress counts as starting work).
    if (
      gates.sequentialPhases &&
      ((d.deliverable.status !== undefined && d.deliverable.status !== "PENDING") ||
        (d.deliverable.progressPct !== undefined && d.deliverable.progressPct > 0))
    ) {
      const reason = await sequentialBlockReason(project.id, del.phaseId);
      if (reason) return NextResponse.json({ error: reason, code: "gate" }, { status: 409 });
    }
    if (d.deliverable.ownerId) {
      const member = await prisma.user.findFirst({
        where: { id: d.deliverable.ownerId, organizationId: orgId },
        select: { id: true },
      });
      if (!member) return NextResponse.json({ error: "Assignee not found in this organization" }, { status: 404 });
    }
    // Keep status and % complete coherent: an explicit status implies a
    // progress floor/ceiling; an explicit progress derives the status.
    let status = d.deliverable.status;
    let progressPct = d.deliverable.progressPct;
    if (progressPct !== undefined && status === undefined) {
      status = progressPct >= 100 ? "DONE" : progressPct > 0 ? "IN_PROGRESS" : "PENDING";
    } else if (status !== undefined && progressPct === undefined) {
      if (status === "DONE") progressPct = 100;
      else if (status === "PENDING") progressPct = 0;
      // IN_PROGRESS keeps whatever progress is already recorded.
    }
    await prisma.projectDeliverable.update({
      where: { id: del.id },
      data: {
        ...(status !== undefined ? { status } : {}),
        ...(progressPct !== undefined ? { progressPct } : {}),
        ...(d.deliverable.estimateHours !== undefined ? { estimateHours: d.deliverable.estimateHours } : {}),
        ...(d.deliverable.actualHours !== undefined ? { actualHours: d.deliverable.actualHours } : {}),
        ...(d.deliverable.priority !== undefined ? { priority: d.deliverable.priority } : {}),
        ...(d.deliverable.ownerId !== undefined ? { ownerId: d.deliverable.ownerId } : {}),
        ...(d.deliverable.startDate !== undefined
          ? { startDate: d.deliverable.startDate ? new Date(d.deliverable.startDate) : null }
          : {}),
        ...(d.deliverable.endDate !== undefined
          ? { endDate: d.deliverable.endDate ? new Date(d.deliverable.endDate) : null }
          : {}),
      },
    });
    // Notify the new assignee (unless they assigned it to themselves).
    if (
      d.deliverable.ownerId &&
      d.deliverable.ownerId !== del.ownerId &&
      d.deliverable.ownerId !== session.user.id
    ) {
      await prisma.notification
        .create({
          data: {
            organizationId: orgId,
            userId: d.deliverable.ownerId,
            type: "SYSTEM", // NotificationType is a PG enum — reuse SYSTEM to stay additive (no SQL)
            title: `You were assigned “${del.name}” on ${project.projectNumber}`,
            url: `/app/projects/${project.id}`,
          },
        })
        .catch(() => null);
    }
    // Keep the parent phase status coherent when the deliverable status changed
    // (directly or derived from a progress update).
    if (status !== undefined) {
      const siblings = await prisma.projectDeliverable.findMany({
        where: { phaseId: del.phaseId },
        select: { status: true },
      });
      const allDone = siblings.length > 0 && siblings.every((s) => s.status === "DONE");
      const anyProgress = siblings.some((s) => s.status !== "PENDING");
      await prisma.projectPhase.update({
        where: { id: del.phaseId },
        data: { status: allDone ? "COMPLETED" : anyProgress ? "IN_PROGRESS" : "NOT_STARTED" },
      });
    }
  }

  // A schedule change anywhere (project start, phase duration/dates, task
  // dates) can violate finish-to-start links — auto-shift successors forward.
  const scheduleTouched =
    d.startDate !== undefined ||
    (d.phase && (d.phase.durationWeeks !== undefined || d.phase.startDate !== undefined || d.phase.endDate !== undefined)) ||
    (d.deliverable && (d.deliverable.startDate !== undefined || d.deliverable.endDate !== undefined));

  // Core field updates.
  const statusChanged = d.status !== undefined && d.status !== project.status;

  // On the transition into COMPLETED, freeze an actuals snapshot into
  // Project.data.actuals — this is what the estimator self-calibrates from.
  // Re-opening later leaves the snapshot intact (history is history).
  let dataPatch: Prisma.InputJsonValue | undefined;
  if (statusChanged && d.status === "COMPLETED") {
    const now = Date.now();
    const start = project.startDate ?? project.createdAt;
    const actualWeeks = Math.max(
      1,
      Math.round(((now - start.getTime()) / (7 * 24 * 60 * 60 * 1000)) * 10) / 10
    );
    // One aggregation for logged hours across every deliverable in the project.
    const hours = await prisma.projectDeliverable.aggregate({
      where: { phase: { projectId: project.id } },
      _sum: { actualHours: true },
    });
    const totalHours = hours._sum.actualHours ?? 0;
    const actualEffortPM = totalHours > 0 ? Math.round((totalHours / 160) * 10) / 10 : undefined;

    const prevData =
      project.data && typeof project.data === "object" && !Array.isArray(project.data)
        ? (project.data as Record<string, unknown>)
        : {};
    const estResult = (
      prevData.estimator as { result?: { durationWeeks?: number; totalEffortPM?: number } } | undefined
    )?.result;

    dataPatch = {
      ...prevData,
      actuals: {
        completedAt: new Date(now).toISOString(),
        actualWeeks,
        ...(actualEffortPM !== undefined ? { actualEffortPM } : {}),
        ...(estResult?.durationWeeks !== undefined ? { estimatedWeeks: estResult.durationWeeks } : {}),
        ...(estResult?.totalEffortPM !== undefined ? { estimatedEffortPM: estResult.totalEffortPM } : {}),
      },
    } as Prisma.InputJsonValue;
  }

  const updated = await prisma.project.update({
    where: { id: project.id },
    data: {
      ...(d.name !== undefined ? { name: d.name } : {}),
      ...(d.status !== undefined ? { status: d.status } : {}),
      ...(d.startDate !== undefined ? { startDate: d.startDate ? new Date(d.startDate) : null } : {}),
      ...(d.targetEndDate !== undefined ? { targetEndDate: d.targetEndDate ? new Date(d.targetEndDate) : null } : {}),
      ...(d.notes !== undefined ? { notes: d.notes } : {}),
      ...(dataPatch !== undefined ? { data: dataPatch } : {}),
    },
    select: { id: true },
  });

  let shifted: ShiftedTask[] = [];
  if (scheduleTouched) {
    shifted = await enforceProjectDependencies(project.id);
  }

  // Re-read after enforcement so the response reflects any auto-shifts.
  const fresh = await prisma.project.findUnique({
    where: { id: updated.id },
    include: {
      phases: {
        orderBy: { position: "asc" },
        include: {
          deliverables: {
            orderBy: { position: "asc" },
            include: {
              owner: { select: { id: true, name: true } },
              predecessors: { select: { predecessorId: true } },
            },
          },
        },
      },
    },
  });

  if (statusChanged || d.phase || d.deliverable || d.name !== undefined) {
    await recordAudit({
      organizationId: orgId,
      entityType: "PROJECT",
      entityId: project.id,
      entityLabel: project.projectNumber,
      action: statusChanged ? "STATUS_CHANGED" : "UPDATED",
      summary: statusChanged
        ? `Project status: ${project.status} → ${d.status}`
        : d.phase
          ? `Phase updated${d.phase.status ? ` · ${d.phase.status.toLowerCase().replace("_", " ")}` : " · schedule"}`
          : d.deliverable
            ? `Deliverable updated${d.deliverable.status ? ` · ${d.deliverable.status.toLowerCase().replace("_", " ")}` : ""}`
            : `Project updated`,
      actorId: session.user.id,
      actorName: session.user.name,
    });
  }

  return NextResponse.json({ project: fresh, shifted });
}

/** POST — add a task/deliverable to one of the project's phases. */
const addTaskSchema = z.object({
  phaseId: z.string().min(1),
  name: z.string().min(1),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = await requirePermission(session, "PROJECTS", "update");
  if (denied) return denied;
  const orgId = session.user.organizationId;

  const parsed = addTaskSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const phase = await prisma.projectPhase.findFirst({
    where: { id: parsed.data.phaseId, project: { id, organizationId: orgId } },
    select: { id: true, name: true, project: { select: { projectNumber: true } } },
  });
  if (!phase) return NextResponse.json({ error: "Phase not found" }, { status: 404 });

  const max = await prisma.projectDeliverable.aggregate({
    where: { phaseId: phase.id },
    _max: { position: true },
  });
  const deliverable = await prisma.projectDeliverable.create({
    data: { phaseId: phase.id, name: parsed.data.name, position: (max._max.position ?? 0) + 1 },
    include: {
      owner: { select: { id: true, name: true } },
      predecessors: { select: { predecessorId: true } },
    },
  });
  await recordAudit({
    organizationId: orgId,
    entityType: "PROJECT",
    entityId: id,
    entityLabel: phase.project.projectNumber,
    action: "UPDATED",
    summary: `Task “${parsed.data.name}” added to ${phase.name}`,
    actorId: session.user.id,
    actorName: session.user.name,
  });
  return NextResponse.json({ deliverable });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId0 = session.user.organizationId;

  // Task deletion (any member): DELETE ?deliverableId=…
  const deliverableId = new URL(req.url).searchParams.get("deliverableId");
  if (deliverableId) {
    // Removing a task edits the project plan → PROJECTS/update.
    const denied = await requirePermission(session, "PROJECTS", "update");
    if (denied) return denied;
    const del = await prisma.projectDeliverable.findFirst({
      where: { id: deliverableId, phase: { project: { id, organizationId: orgId0 } } },
      select: { id: true, name: true, phase: { select: { name: true, project: { select: { projectNumber: true } } } } },
    });
    if (!del) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.projectDeliverable.delete({ where: { id: del.id } });
    await recordAudit({
      organizationId: orgId0,
      entityType: "PROJECT",
      entityId: id,
      entityLabel: del.phase.project.projectNumber,
      action: "UPDATED",
      summary: `Task “${del.name}” removed from ${del.phase.name}`,
      actorId: session.user.id,
      actorName: session.user.name,
    });
    return NextResponse.json({ ok: true });
  }

  // Whole-project deletion → PROJECTS/delete, and stays admin-only on top.
  const deniedDelete = await requirePermission(session, "PROJECTS", "delete");
  if (deniedDelete) return deniedDelete;
  if (!["SUPER_ADMIN", "SUPER_USER", "ADMIN"].includes(session.user.role ?? "")) return NextResponse.json({ error: "Only admins can delete projects" }, { status: 403 });
  const orgId = session.user.organizationId;
  const existing = await prisma.project.findFirst({
    where: { id, organizationId: orgId },
    select: { id: true, projectNumber: true, name: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.project.delete({ where: { id: existing.id } });
  await recordAudit({
    organizationId: orgId,
    entityType: "PROJECT",
    entityId: existing.id,
    entityLabel: existing.projectNumber,
    action: "DELETED",
    summary: `Project “${existing.name}” deleted`,
    actorId: session.user.id,
    actorName: session.user.name,
  });
  return NextResponse.json({ ok: true });
}
