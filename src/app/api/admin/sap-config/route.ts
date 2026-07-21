import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMethodologies, getTransformationTypes, getPipelineGates } from "@/lib/sap-config";
import { OPP_STAGES } from "@/lib/constants";

const STAGE_VALUES = OPP_STAGES.map((s) => s.value as string);

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.organizationId) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (session.user.role !== "ADMIN") return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { orgId: session.user.organizationId };
}

/** GET — full SAP configuration (available to any authed user; the project
 *  creation dialog reads it). Seeds defaults on first read. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = session.user.organizationId;
  const [methodologies, transformationTypes, gates] = await Promise.all([
    getMethodologies(orgId),
    getTransformationTypes(orgId),
    getPipelineGates(orgId),
  ]);
  return NextResponse.json({ methodologies, transformationTypes, gates });
}

const patchSchema = z.object({
  gates: z
    .object({
      quoteRequiredStage: z.string().nullable().optional(),
      projectRequiredStage: z.string().nullable().optional(),
      sequentialPhases: z.boolean().optional(),
      completeRequiresAllPhases: z.boolean().optional(),
      oppRequiresLead: z.boolean().optional(),
      rfqRequiresOpportunity: z.boolean().optional(),
      quoteRequiresRfq: z.boolean().optional(),
      workingDays: z.string().regex(/^[1-7](,[1-7])*$/).optional(),
      holidays: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).max(200).optional(),
    })
    .optional(),
  methodology: z
    .object({
      id: z.string().min(1),
      name: z.string().min(2).optional(),
      description: z.string().nullable().optional(),
      active: z.boolean().optional(),
    })
    .optional(),
  phase: z
    .object({
      id: z.string().min(1),
      name: z.string().min(1).optional(),
      color: z.string().optional(),
      durationWeeks: z.coerce.number().int().min(1).max(200).optional(),
      active: z.boolean().optional(),
    })
    .optional(),
  deliverable: z
    .object({
      id: z.string().min(1),
      name: z.string().min(1).optional(),
      active: z.boolean().optional(),
    })
    .optional(),
  transformationType: z
    .object({
      id: z.string().min(1),
      name: z.string().min(1).optional(),
      subtitle: z.string().nullable().optional(),
      methodologyId: z.string().nullable().optional(),
      active: z.boolean().optional(),
    })
    .optional(),
});

export async function PATCH(req: Request) {
  const a = await requireAdmin();
  if (a.error) return a.error;
  const orgId = a.orgId!;
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  const d = parsed.data;

  if (d.gates) {
    for (const v of [d.gates.quoteRequiredStage, d.gates.projectRequiredStage]) {
      if (v != null && !STAGE_VALUES.includes(v)) {
        return NextResponse.json({ error: "Invalid stage value" }, { status: 400 });
      }
    }
    await prisma.pipelineGateConfig.upsert({
      where: { organizationId: orgId },
      update: {
        ...(d.gates.quoteRequiredStage !== undefined ? { quoteRequiredStage: d.gates.quoteRequiredStage } : {}),
        ...(d.gates.projectRequiredStage !== undefined ? { projectRequiredStage: d.gates.projectRequiredStage } : {}),
        ...(d.gates.sequentialPhases !== undefined ? { sequentialPhases: d.gates.sequentialPhases } : {}),
        ...(d.gates.completeRequiresAllPhases !== undefined
          ? { completeRequiresAllPhases: d.gates.completeRequiresAllPhases }
          : {}),
        ...(d.gates.oppRequiresLead !== undefined ? { oppRequiresLead: d.gates.oppRequiresLead } : {}),
        ...(d.gates.rfqRequiresOpportunity !== undefined ? { rfqRequiresOpportunity: d.gates.rfqRequiresOpportunity } : {}),
        ...(d.gates.quoteRequiresRfq !== undefined ? { quoteRequiresRfq: d.gates.quoteRequiresRfq } : {}),
        ...(d.gates.workingDays !== undefined ? { workingDays: d.gates.workingDays } : {}),
        ...(d.gates.holidays !== undefined ? { holidays: d.gates.holidays as Prisma.InputJsonValue } : {}),
      },
      create: {
        organizationId: orgId,
        quoteRequiredStage: d.gates.quoteRequiredStage ?? null,
        projectRequiredStage: d.gates.projectRequiredStage ?? null,
        sequentialPhases: d.gates.sequentialPhases ?? false,
        completeRequiresAllPhases: d.gates.completeRequiresAllPhases ?? true,
        oppRequiresLead: d.gates.oppRequiresLead ?? false,
        rfqRequiresOpportunity: d.gates.rfqRequiresOpportunity ?? false,
        quoteRequiresRfq: d.gates.quoteRequiresRfq ?? false,
        ...(d.gates.workingDays !== undefined ? { workingDays: d.gates.workingDays } : {}),
        ...(d.gates.holidays !== undefined ? { holidays: d.gates.holidays as Prisma.InputJsonValue } : {}),
      },
    });
  }

  if (d.methodology) {
    const row = await prisma.methodology.findFirst({
      where: { id: d.methodology.id, organizationId: orgId },
      select: { id: true },
    });
    if (!row) return NextResponse.json({ error: "Methodology not found" }, { status: 404 });
    const { id, ...rest } = d.methodology;
    await prisma.methodology.update({ where: { id }, data: rest });
  }

  if (d.phase) {
    const row = await prisma.methodologyPhase.findFirst({
      where: { id: d.phase.id, methodology: { organizationId: orgId } },
      select: { id: true },
    });
    if (!row) return NextResponse.json({ error: "Phase not found" }, { status: 404 });
    const { id, ...rest } = d.phase;
    await prisma.methodologyPhase.update({ where: { id }, data: rest });
  }

  if (d.deliverable) {
    const row = await prisma.methodologyDeliverable.findFirst({
      where: { id: d.deliverable.id, phase: { methodology: { organizationId: orgId } } },
      select: { id: true },
    });
    if (!row) return NextResponse.json({ error: "Deliverable not found" }, { status: 404 });
    const { id, ...rest } = d.deliverable;
    await prisma.methodologyDeliverable.update({ where: { id }, data: rest });
  }

  if (d.transformationType) {
    const row = await prisma.transformationType.findFirst({
      where: { id: d.transformationType.id, organizationId: orgId },
      select: { id: true },
    });
    if (!row) return NextResponse.json({ error: "Transformation type not found" }, { status: 404 });
    if (d.transformationType.methodologyId) {
      const m = await prisma.methodology.findFirst({
        where: { id: d.transformationType.methodologyId, organizationId: orgId },
        select: { id: true },
      });
      if (!m) return NextResponse.json({ error: "Methodology not found" }, { status: 404 });
    }
    const { id, ...rest } = d.transformationType;
    await prisma.transformationType.update({ where: { id }, data: rest });
  }

  return NextResponse.json({ ok: true });
}

/** POST — create template entities: a phase deliverable (legacy shape), or
 *  via `action`: a whole methodology, a phase, or a transformation type.
 *  This is what makes non-SAP project templates fully self-serviceable. */
const addSchema = z.union([
  z.object({ phaseId: z.string().min(1), name: z.string().min(1) }),
  z.object({ action: z.literal("createMethodology"), name: z.string().min(2) }),
  z.object({
    action: z.literal("createPhase"),
    methodologyId: z.string().min(1),
    name: z.string().min(1),
    durationWeeks: z.coerce.number().int().min(1).max(200).default(4),
    color: z.string().optional(),
  }),
  z.object({
    action: z.literal("createTransformationType"),
    name: z.string().min(2),
    subtitle: z.string().nullable().optional(),
    methodologyId: z.string().min(1),
  }),
]);

const slugKey = (name: string) =>
  name.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40) || "CUSTOM";

const PHASE_PALETTE = ["#6366F1", "#0EA5E9", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#14B8A6"];

export async function POST(req: Request) {
  const a = await requireAdmin();
  if (a.error) return a.error;
  const orgId = a.orgId!;
  const parsed = addSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  const d = parsed.data;

  // New methodology from scratch (generic — SAP or otherwise).
  if ("action" in d && d.action === "createMethodology") {
    const base = slugKey(d.name);
    let key = base;
    for (let i = 2; await prisma.methodology.findFirst({ where: { organizationId: orgId, key }, select: { id: true } }); i++) {
      key = `${base}_${i}`;
    }
    const max = await prisma.methodology.aggregate({ where: { organizationId: orgId }, _max: { position: true } });
    const methodology = await prisma.methodology.create({
      data: {
        organizationId: orgId,
        key,
        name: d.name,
        position: (max._max.position ?? 0) + 1,
        phases: {
          create: [{ name: "Phase 1", color: PHASE_PALETTE[0], durationWeeks: 4, position: 1 }],
        },
      },
      include: { phases: { include: { deliverables: true }, orderBy: { position: "asc" } } },
    });
    return NextResponse.json({ methodology });
  }

  // New phase on an existing methodology.
  if ("action" in d && d.action === "createPhase") {
    const m = await prisma.methodology.findFirst({
      where: { id: d.methodologyId, organizationId: orgId },
      select: { id: true, _count: { select: { phases: true } } },
    });
    if (!m) return NextResponse.json({ error: "Methodology not found" }, { status: 404 });
    const max = await prisma.methodologyPhase.aggregate({ where: { methodologyId: m.id }, _max: { position: true } });
    const phase = await prisma.methodologyPhase.create({
      data: {
        methodologyId: m.id,
        name: d.name,
        color: d.color ?? PHASE_PALETTE[m._count.phases % PHASE_PALETTE.length],
        durationWeeks: d.durationWeeks,
        position: (max._max.position ?? 0) + 1,
      },
      include: { deliverables: true },
    });
    return NextResponse.json({ phase });
  }

  // New transformation type in the catalog.
  if ("action" in d && d.action === "createTransformationType") {
    const m = await prisma.methodology.findFirst({
      where: { id: d.methodologyId, organizationId: orgId },
      select: { id: true },
    });
    if (!m) return NextResponse.json({ error: "Methodology not found" }, { status: 404 });
    const base = slugKey(d.name);
    let key = base;
    for (let i = 2; await prisma.transformationType.findFirst({ where: { organizationId: orgId, key }, select: { id: true } }); i++) {
      key = `${base}_${i}`;
    }
    const max = await prisma.transformationType.aggregate({ where: { organizationId: orgId }, _max: { position: true } });
    const transformationType = await prisma.transformationType.create({
      data: {
        organizationId: orgId,
        key,
        name: d.name,
        subtitle: d.subtitle ?? null,
        methodologyId: m.id,
        position: (max._max.position ?? 0) + 1,
      },
    });
    return NextResponse.json({ transformationType });
  }

  // Legacy shape: add a deliverable to a phase.
  if (!("phaseId" in d)) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  const phase = await prisma.methodologyPhase.findFirst({
    where: { id: d.phaseId, methodology: { organizationId: orgId } },
    select: { id: true },
  });
  if (!phase) return NextResponse.json({ error: "Phase not found" }, { status: 404 });

  const max = await prisma.methodologyDeliverable.aggregate({
    where: { phaseId: phase.id },
    _max: { position: true },
  });
  const deliverable = await prisma.methodologyDeliverable.create({
    data: { phaseId: phase.id, name: d.name, position: (max._max.position ?? 0) + 1 },
  });
  return NextResponse.json({ deliverable });
}

/** DELETE — remove template entities. In-use guards: a methodology or
 *  transformation type referenced by projects can't be deleted (deactivate it
 *  instead); project phases/tasks are copies, so template edits never touch
 *  running projects. */
export async function DELETE(req: Request) {
  const a = await requireAdmin();
  if (a.error) return a.error;
  const orgId = a.orgId!;
  const params = new URL(req.url).searchParams;

  const methodologyId = params.get("methodologyId");
  if (methodologyId) {
    const row = await prisma.methodology.findFirst({
      where: { id: methodologyId, organizationId: orgId },
      select: { id: true, name: true, _count: { select: { projects: true, transformationTypes: true } } },
    });
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (row._count.projects > 0) {
      return NextResponse.json(
        { error: `“${row.name}” is used by ${row._count.projects} project${row._count.projects === 1 ? "" : "s"} — deactivate it instead of deleting.` },
        { status: 409 }
      );
    }
    if (row._count.transformationTypes > 0) {
      return NextResponse.json(
        { error: `“${row.name}” is the roadmap for ${row._count.transformationTypes} transformation type${row._count.transformationTypes === 1 ? "" : "s"} — remap them first.` },
        { status: 409 }
      );
    }
    await prisma.methodology.delete({ where: { id: row.id } });
    return NextResponse.json({ ok: true });
  }

  const phaseId = params.get("phaseId");
  if (phaseId) {
    const row = await prisma.methodologyPhase.findFirst({
      where: { id: phaseId, methodology: { organizationId: orgId } },
      select: { id: true, methodologyId: true },
    });
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const siblings = await prisma.methodologyPhase.count({ where: { methodologyId: row.methodologyId } });
    if (siblings <= 1) {
      return NextResponse.json({ error: "A methodology needs at least one phase." }, { status: 409 });
    }
    await prisma.methodologyPhase.delete({ where: { id: row.id } });
    return NextResponse.json({ ok: true });
  }

  const transformationTypeId = params.get("transformationTypeId");
  if (transformationTypeId) {
    const row = await prisma.transformationType.findFirst({
      where: { id: transformationTypeId, organizationId: orgId },
      select: { id: true, name: true, _count: { select: { projects: true } } },
    });
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (row._count.projects > 0) {
      return NextResponse.json(
        { error: `“${row.name}” is used by ${row._count.projects} project${row._count.projects === 1 ? "" : "s"} — deactivate it instead.` },
        { status: 409 }
      );
    }
    await prisma.transformationType.delete({ where: { id: row.id } });
    return NextResponse.json({ ok: true });
  }

  const id = params.get("deliverableId") ?? "";
  const row = await prisma.methodologyDeliverable.findFirst({
    where: { id, phase: { methodology: { organizationId: orgId } } },
    select: { id: true },
  });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.methodologyDeliverable.delete({ where: { id: row.id } });
  return NextResponse.json({ ok: true });
}
