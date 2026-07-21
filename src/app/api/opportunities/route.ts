import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nextOppNumber } from "@/lib/numbering";
import { recordAudit } from "@/lib/audit";
import { getPipelineGates } from "@/lib/sap-config";
import { requirePermission } from "@/lib/permissions";

const schema = z.object({
  name: z.string().min(2),
  customerId: z.string().min(1),
  expectedRevenue: z.coerce.number().nonnegative().default(0),
  probability: z.coerce.number().min(0).max(100).default(20),
  expectedCloseDate: z.string().optional(),
  stage: z
    .enum([
      "QUALIFICATION", "DISCOVERY", "REQUIREMENT_ANALYSIS", "PROPOSAL_SUBMITTED",
      "RFQ_RECEIVED", "QUOTATION_SENT", "NEGOTIATION", "MANAGEMENT_APPROVAL",
      "VERBAL_CONFIRMATION", "WON", "LOST",
    ])
    .default("QUALIFICATION"),
  territoryId: z.string().optional(),
  businessUnitId: z.string().optional(),
  notes: z.string().optional(),
  data: z.record(z.unknown()).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = await requirePermission(session, "OPPORTUNITIES", "read");
  if (denied) return denied;
  const opps = await prisma.opportunity.findMany({
    where: { organizationId: session.user.organizationId },
    include: {
      customer: { select: { name: true } },
      owner: { select: { name: true, image: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ opportunities: opps });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = await requirePermission(session, "OPPORTUNITIES", "create");
  if (denied) return denied;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid", details: parsed.error.flatten() }, { status: 400 });
  }
  const orgId = session.user.organizationId;

  // Chain integrity (config, default OFF): opportunities must originate from a
  // qualified lead. Lead conversion uses its own route (leads/[id]/convert),
  // so this route only ever represents a manual, non-lead creation.
  const gates = await getPipelineGates(orgId);
  if (gates.oppRequiresLead) {
    return NextResponse.json(
      { error: "Opportunities must start from a qualified lead (configurable in Admin → SAP Projects).", code: "gate" },
      { status: 409 }
    );
  }

  const oppNumber = await nextOppNumber(orgId);
  const { data: customData, ...core } = parsed.data;
  const opp = await prisma.opportunity.create({
    data: {
      ...core,
      ...(customData && Object.keys(customData).length
        ? { data: customData as Prisma.InputJsonValue }
        : {}),
      oppNumber,
      organizationId: orgId,
      ownerId: session.user.id,
      revenueOwnerId: session.user.id,
      expectedCloseDate: parsed.data.expectedCloseDate ? new Date(parsed.data.expectedCloseDate) : undefined,
    },
  });
  await recordAudit({
    organizationId: orgId,
    entityType: "OPPORTUNITY",
    entityId: opp.id,
    entityLabel: opp.oppNumber,
    action: "CREATED",
    summary: `Opportunity “${opp.name}” created at ${opp.stage}`,
    actorId: session.user.id,
    actorName: session.user.name,
  });
  return NextResponse.json({ opportunity: opp });
}
