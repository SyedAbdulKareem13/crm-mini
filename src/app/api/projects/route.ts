import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nextProjectNumber } from "@/lib/numbering";
import { recordAudit } from "@/lib/audit";
import { ensureSapConfig } from "@/lib/sap-config";
import { requirePermission } from "@/lib/permissions";

const createSchema = z.object({
  name: z.string().min(2),
  opportunityId: z.string().min(1),
  transformationTypeId: z.string().optional(),
  methodologyId: z.string().min(1),
  startDate: z.string().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = await requirePermission(session, "PROJECTS", "read");
  if (denied) return denied;
  const orgId = session.user.organizationId;
  const projects = await prisma.project.findMany({
    where: { organizationId: orgId },
    include: {
      customer: { select: { name: true } },
      opportunity: { select: { id: true, name: true, oppNumber: true } },
      methodology: { select: { name: true } },
      transformationType: { select: { name: true, subtitle: true } },
      owner: { select: { name: true, image: true } },
      phases: { select: { status: true }, orderBy: { position: "asc" } },
    },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ projects });
}

/** Create a project from an opportunity, instantiating the selected
 *  methodology's roadmap (phases + deliverables) onto the project. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = await requirePermission(session, "PROJECTS", "create");
  if (denied) return denied;
  const orgId = session.user.organizationId;

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid", details: parsed.error.flatten() }, { status: 400 });
  const d = parsed.data;

  // Multi-tenant guards: opportunity + methodology must belong to this org.
  const opp = await prisma.opportunity.findFirst({
    where: { id: d.opportunityId, organizationId: orgId },
    select: { id: true, name: true, oppNumber: true, customerId: true, project: { select: { id: true } } },
  });
  if (!opp) return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
  if (opp.project) {
    return NextResponse.json(
      { error: "This opportunity already has a project.", projectId: opp.project.id },
      { status: 409 }
    );
  }

  await ensureSapConfig(orgId);
  const methodology = await prisma.methodology.findFirst({
    where: { id: d.methodologyId, organizationId: orgId },
    include: {
      phases: {
        where: { active: true },
        orderBy: { position: "asc" },
        include: { deliverables: { where: { active: true }, orderBy: { position: "asc" } } },
      },
    },
  });
  if (!methodology) return NextResponse.json({ error: "Methodology not found" }, { status: 404 });

  if (d.transformationTypeId) {
    const tt = await prisma.transformationType.findFirst({
      where: { id: d.transformationTypeId, organizationId: orgId },
      select: { id: true },
    });
    if (!tt) return NextResponse.json({ error: "Transformation type not found" }, { status: 404 });
  }

  const projectNumber = await nextProjectNumber(orgId);
  const project = await prisma.project.create({
    data: {
      projectNumber,
      organizationId: orgId,
      name: d.name,
      opportunityId: opp.id,
      customerId: opp.customerId,
      transformationTypeId: d.transformationTypeId ?? null,
      methodologyId: methodology.id,
      ownerId: session.user.id,
      startDate: d.startDate ? new Date(d.startDate) : null,
      phases: {
        create: methodology.phases.map((p) => ({
          name: p.name,
          color: p.color,
          durationWeeks: p.durationWeeks,
          position: p.position,
          deliverables: {
            create: p.deliverables.map((del) => ({ name: del.name, position: del.position })),
          },
        })),
      },
    },
    select: { id: true, projectNumber: true, name: true },
  });

  await recordAudit({
    organizationId: orgId,
    entityType: "OPPORTUNITY",
    entityId: opp.id,
    entityLabel: opp.oppNumber,
    action: "UPDATED",
    summary: `Project ${project.projectNumber} “${project.name}” created from this opportunity (${methodology.name})`,
    actorId: session.user.id,
    actorName: session.user.name,
  });

  return NextResponse.json({ project });
}
