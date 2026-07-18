import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { PROJECT_STATUSES, PHASE_STATUSES, DELIVERABLE_STATUSES } from "@/lib/sap-config";

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
  const orgId = session.user.organizationId;

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });
  const d = parsed.data;

  const project = await prisma.project.findFirst({
    where: { id, organizationId: orgId },
    select: { id: true, projectNumber: true, name: true, status: true },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Phase update (status / schedule), scoped through the project.
  if (d.phase) {
    const phase = await prisma.projectPhase.findFirst({
      where: { id: d.phase.id, projectId: project.id },
      select: { id: true, name: true },
    });
    if (!phase) return NextResponse.json({ error: "Phase not found" }, { status: 404 });
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
        data: { status: "DONE" },
      });
    }
  }

  // Deliverable update (status / assignee / priority / schedule), scoped through the project.
  if (d.deliverable) {
    const del = await prisma.projectDeliverable.findFirst({
      where: { id: d.deliverable.id, phase: { projectId: project.id } },
      select: { id: true, phaseId: true },
    });
    if (!del) return NextResponse.json({ error: "Deliverable not found" }, { status: 404 });
    if (d.deliverable.ownerId) {
      const member = await prisma.user.findFirst({
        where: { id: d.deliverable.ownerId, organizationId: orgId },
        select: { id: true },
      });
      if (!member) return NextResponse.json({ error: "Assignee not found in this organization" }, { status: 404 });
    }
    await prisma.projectDeliverable.update({
      where: { id: del.id },
      data: {
        ...(d.deliverable.status !== undefined ? { status: d.deliverable.status } : {}),
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
    // Keep the parent phase status coherent when the deliverable status changed.
    if (d.deliverable.status !== undefined) {
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

  // Core field updates.
  const statusChanged = d.status !== undefined && d.status !== project.status;
  const updated = await prisma.project.update({
    where: { id: project.id },
    data: {
      ...(d.name !== undefined ? { name: d.name } : {}),
      ...(d.status !== undefined ? { status: d.status } : {}),
      ...(d.startDate !== undefined ? { startDate: d.startDate ? new Date(d.startDate) : null } : {}),
      ...(d.targetEndDate !== undefined ? { targetEndDate: d.targetEndDate ? new Date(d.targetEndDate) : null } : {}),
      ...(d.notes !== undefined ? { notes: d.notes } : {}),
    },
    include: {
      phases: {
        orderBy: { position: "asc" },
        include: {
          deliverables: {
            orderBy: { position: "asc" },
            include: { owner: { select: { id: true, name: true } } },
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

  return NextResponse.json({ project: updated });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Only admins can delete projects" }, { status: 403 });
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
