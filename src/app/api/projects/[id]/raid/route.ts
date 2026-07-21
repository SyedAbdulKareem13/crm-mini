import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/permissions";

/* RAID register — Risks, Assumptions, Issues, Dependencies for a project. */

const TYPES = ["RISK", "ASSUMPTION", "ISSUE", "DEPENDENCY"] as const;
const SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
const PROBABILITIES = ["LOW", "MEDIUM", "HIGH"] as const;
const STATUSES = ["OPEN", "MITIGATING", "CLOSED"] as const;

const dateStr = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected yyyy-mm-dd")
  .nullable()
  .optional();

const createSchema = z.object({
  type: z.enum(TYPES),
  title: z.string().min(2),
  description: z.string().nullable().optional(),
  severity: z.enum(SEVERITIES),
  probability: z.enum(PROBABILITIES).nullable().optional(),
  status: z.enum(STATUSES).optional(),
  mitigation: z.string().nullable().optional(),
  ownerId: z.string().nullable().optional(),
  dueDate: dateStr,
});

const patchSchema = z.object({
  id: z.string().min(1),
  type: z.enum(TYPES).optional(),
  title: z.string().min(2).optional(),
  description: z.string().nullable().optional(),
  severity: z.enum(SEVERITIES).optional(),
  probability: z.enum(PROBABILITIES).nullable().optional(),
  status: z.enum(STATUSES).optional(),
  mitigation: z.string().nullable().optional(),
  ownerId: z.string().nullable().optional(),
  dueDate: dateStr,
});

const ownerSelect = { owner: { select: { id: true, name: true } } } as const;

/** POST — create a RAID item. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = await requirePermission(session, "PROJECTS", "update");
  if (denied) return denied;
  const orgId = session.user.organizationId;

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });
  const d = parsed.data;

  const project = await prisma.project.findFirst({
    where: { id, organizationId: orgId },
    select: { id: true, projectNumber: true },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Validate the owner belongs to the org.
  if (d.ownerId) {
    const member = await prisma.user.findFirst({
      where: { id: d.ownerId, organizationId: orgId },
      select: { id: true },
    });
    if (!member) return NextResponse.json({ error: "Owner not found in this organization" }, { status: 404 });
  }

  const item = await prisma.projectRaidItem.create({
    data: {
      projectId: project.id,
      type: d.type,
      title: d.title,
      description: d.description ?? null,
      severity: d.severity,
      probability: d.probability ?? null,
      status: d.status ?? "OPEN",
      mitigation: d.mitigation ?? null,
      ownerId: d.ownerId ?? null,
      dueDate: d.dueDate ? new Date(d.dueDate) : null,
    },
    include: ownerSelect,
  });

  await recordAudit({
    organizationId: orgId,
    entityType: "PROJECT",
    entityId: project.id,
    entityLabel: project.projectNumber,
    action: "UPDATED",
    summary: `RAID ${d.type.toLowerCase()} “${d.title}” added`,
    actorId: session.user.id,
    actorName: session.user.name,
  });

  // Notify the assigned owner (unless they assigned it to themselves).
  if (d.ownerId && d.ownerId !== session.user.id) {
    await prisma.notification
      .create({
        data: {
          organizationId: orgId,
          userId: d.ownerId,
          type: "SYSTEM",
          title: `You were assigned RAID item “${d.title}” on ${project.projectNumber}`,
          url: `/app/projects/${project.id}`,
        },
      })
      .catch(() => null);
  }

  return NextResponse.json({ item });
}

/** PATCH — update a RAID item (all fields optional). */
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

  // Scope the item through the project's organization.
  const existing = await prisma.projectRaidItem.findFirst({
    where: { id: d.id, projectId: id, project: { organizationId: orgId } },
    select: { id: true, ownerId: true, status: true, title: true, project: { select: { id: true, projectNumber: true } } },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (d.ownerId) {
    const member = await prisma.user.findFirst({
      where: { id: d.ownerId, organizationId: orgId },
      select: { id: true },
    });
    if (!member) return NextResponse.json({ error: "Owner not found in this organization" }, { status: 404 });
  }

  const item = await prisma.projectRaidItem.update({
    where: { id: existing.id },
    data: {
      ...(d.type !== undefined ? { type: d.type } : {}),
      ...(d.title !== undefined ? { title: d.title } : {}),
      ...(d.description !== undefined ? { description: d.description } : {}),
      ...(d.severity !== undefined ? { severity: d.severity } : {}),
      ...(d.probability !== undefined ? { probability: d.probability } : {}),
      ...(d.status !== undefined ? { status: d.status } : {}),
      ...(d.mitigation !== undefined ? { mitigation: d.mitigation } : {}),
      ...(d.ownerId !== undefined ? { ownerId: d.ownerId } : {}),
      ...(d.dueDate !== undefined ? { dueDate: d.dueDate ? new Date(d.dueDate) : null } : {}),
    },
    include: ownerSelect,
  });

  // Audit when an item is closed.
  if (d.status === "CLOSED" && existing.status !== "CLOSED") {
    await recordAudit({
      organizationId: orgId,
      entityType: "PROJECT",
      entityId: existing.project.id,
      entityLabel: existing.project.projectNumber,
      action: "UPDATED",
      summary: `RAID item “${item.title}” closed`,
      actorId: session.user.id,
      actorName: session.user.name,
    });
  }

  // Notify on owner change (new owner ≠ previous ≠ actor).
  if (
    d.ownerId &&
    d.ownerId !== existing.ownerId &&
    d.ownerId !== session.user.id
  ) {
    await prisma.notification
      .create({
        data: {
          organizationId: orgId,
          userId: d.ownerId,
          type: "SYSTEM",
          title: `You were assigned RAID item “${item.title}” on ${existing.project.projectNumber}`,
          url: `/app/projects/${existing.project.id}`,
        },
      })
      .catch(() => null);
  }

  return NextResponse.json({ item });
}

/** DELETE ?raidId=… — remove a RAID item. */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = await requirePermission(session, "PROJECTS", "update");
  if (denied) return denied;
  const orgId = session.user.organizationId;

  const raidId = new URL(req.url).searchParams.get("raidId") ?? "";
  if (!raidId) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const existing = await prisma.projectRaidItem.findFirst({
    where: { id: raidId, projectId: id, project: { organizationId: orgId } },
    select: { id: true, type: true, title: true, project: { select: { id: true, projectNumber: true } } },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.projectRaidItem.delete({ where: { id: existing.id } });

  await recordAudit({
    organizationId: orgId,
    entityType: "PROJECT",
    entityId: existing.project.id,
    entityLabel: existing.project.projectNumber,
    action: "UPDATED",
    summary: `RAID ${existing.type.toLowerCase()} “${existing.title}” removed`,
    actorId: session.user.id,
    actorName: session.user.name,
  });

  return NextResponse.json({ ok: true });
}
