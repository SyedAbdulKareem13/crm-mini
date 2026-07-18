import { prisma } from "@/lib/prisma";

async function nextSequenceFor(
  prefix: string,
  count: () => Promise<number>
): Promise<string> {
  const n = (await count()) + 1;
  return `${prefix}-${String(n).padStart(5, "0")}`;
}

export const nextLeadNumber = (organizationId: string) =>
  nextSequenceFor("LD", () => prisma.lead.count({ where: { organizationId } }));

export const nextOppNumber = (organizationId: string) =>
  nextSequenceFor("OPP", () =>
    prisma.opportunity.count({ where: { organizationId } })
  );

export const nextRfqNumber = (organizationId: string) =>
  nextSequenceFor("RFQ", () => prisma.rFQ.count({ where: { organizationId } }));

export const nextQuotationNumber = (organizationId: string) =>
  nextSequenceFor("QT", () =>
    prisma.quotation.count({ where: { organizationId } })
  );

export const nextProjectNumber = (organizationId: string) =>
  nextSequenceFor("PRJ", () =>
    prisma.project.count({ where: { organizationId } })
  );
