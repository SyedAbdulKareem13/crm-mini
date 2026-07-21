import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nextOppNumber } from "@/lib/numbering";
import { recordAudit } from "@/lib/audit";

/**
 * Convert Lead → Opportunity. Carries customer/contacts/activities/notes/docs.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const orgId = session.user.organizationId;
  const lead = await prisma.lead.findFirst({
    where: { id, organizationId: orgId },
    include: { activities: true, documents: true },
  });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  // Lifecycle governance: a cancelled lead is read-only — reopen before converting.
  if (lead.status === "CANCELLED") {
    const who = lead.cancelledByName ?? "a user";
    const when = lead.cancelledAt
      ? new Date(lead.cancelledAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
      : "an earlier date";
    return NextResponse.json(
      { error: `This lead was cancelled by ${who} on ${when} and is read-only — reopen it to make changes.`, code: "cancelled" },
      { status: 409 }
    );
  }
  if (lead.convertedOpportunityId) {
    return NextResponse.json({ error: "Lead already converted" }, { status: 409 });
  }

  // Ensure customer
  let customerId = lead.customerId;
  if (!customerId) {
    const customer = await prisma.customer.create({
      data: {
        organizationId: orgId,
        name: lead.company,
        industry: lead.industry,
        contacts: lead.contactPerson
          ? {
              create: [
                {
                  name: lead.contactPerson,
                  email: lead.email,
                  mobile: lead.mobile,
                  isPrimary: true,
                },
              ],
            }
          : undefined,
      },
    });
    customerId = customer.id;
  }

  const oppNumber = await nextOppNumber(orgId);
  const opp = await prisma.opportunity.create({
    data: {
      oppNumber,
      organizationId: orgId,
      name: `${lead.company} — ${lead.name}`,
      customerId,
      ownerId: lead.ownerId ?? session.user.id,
      revenueOwnerId: lead.ownerId ?? session.user.id,
      territoryId: lead.territoryId ?? undefined,
      expectedRevenue: lead.expectedRevenue ?? 0,
      probability: 20,
      stage: "QUALIFICATION",
      notes: lead.notes,
    },
  });

  // Move activities and documents
  await prisma.$transaction([
    prisma.activity.updateMany({
      where: { leadId: lead.id },
      data: { opportunityId: opp.id, leadId: null },
    }),
    prisma.document.updateMany({
      where: { leadId: lead.id },
      data: { opportunityId: opp.id, leadId: null },
    }),
    prisma.lead.update({
      where: { id: lead.id },
      data: {
        status: "CONVERTED",
        customerId,
        convertedOpportunityId: opp.id,
      },
    }),
  ]);

  await recordAudit({
    organizationId: orgId,
    entityType: "LEAD",
    entityId: lead.id,
    entityLabel: lead.leadNumber,
    action: "CONVERTED",
    summary: `Converted to opportunity ${opp.oppNumber}`,
    actorId: session.user.id,
    actorName: session.user.name,
  });
  await recordAudit({
    organizationId: orgId,
    entityType: "OPPORTUNITY",
    entityId: opp.id,
    entityLabel: opp.oppNumber,
    action: "CREATED",
    summary: `Created from lead ${lead.leadNumber}`,
    actorId: session.user.id,
    actorName: session.user.name,
  });
  return NextResponse.json({ opportunity: opp });
}
