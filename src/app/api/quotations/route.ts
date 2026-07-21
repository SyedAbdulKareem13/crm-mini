import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nextQuotationNumber } from "@/lib/numbering";
import { computeQuotation } from "@/lib/quotation-engine";
import { recordAudit } from "@/lib/audit";
import { getPipelineGates } from "@/lib/sap-config";
import { requirePermission } from "@/lib/permissions";

const itemSchema = z.object({
  itemType: z.enum(["MANPOWER", "NON_MANPOWER", "LICENSE"]),
  description: z.string().min(1),
  quantity: z.coerce.number().nonnegative().default(1),
  uom: z.string().optional(),
  unitCost: z.coerce.number().nonnegative(),
  markupPct: z.coerce.number().default(0),
  discountPct: z.coerce.number().default(0),
  taxPct: z.coerce.number().default(0),
  manpowerGrade: z.string().optional(),
  manpowerExperience: z.string().optional(),
  licenseProduct: z.string().optional(),
  licenseDuration: z.string().optional(),
});

const positionSchema = z.object({
  designation: z.string(),
  grade: z.string().optional(),
  experience: z.string().optional(),
  headcount: z.coerce.number().int().positive(),
  durationMonths: z.coerce.number().positive(),
  monthlyRate: z.coerce.number().nonnegative(),
  monthlyBilling: z.coerce.number().nonnegative(),
  cost: z.coerce.number().nonnegative(),
  revenue: z.coerce.number().nonnegative(),
  margin: z.coerce.number(),
  marginPct: z.coerce.number(),
});

const schema = z.object({
  customerId: z.string().min(1),
  rfqId: z.string().optional(),
  opportunityId: z.string().optional(),
  currency: z.string().default("INR"),
  validUntil: z.string().optional(),
  notes: z.string().optional(),
  termsAndConditions: z.string().optional(),
  items: z.array(itemSchema).default([]),
  positions: z.array(positionSchema).default([]),
  data: z.record(z.unknown()).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = await requirePermission(session, "QUOTATIONS", "create");
  if (denied) return denied;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid", details: parsed.error.flatten() }, { status: 400 });
  }
  const orgId = session.user.organizationId;

  // Chain integrity (config, default OFF): a quotation must be raised from an RFQ.
  const gates = await getPipelineGates(orgId);
  if (gates.quoteRequiresRfq && !parsed.data.rfqId) {
    return NextResponse.json(
      { error: "Quotations must be raised from an RFQ (configurable in Admin → SAP Projects).", code: "gate" },
      { status: 409 }
    );
  }

  const quotationNumber = await nextQuotationNumber(orgId);

  const totals = computeQuotation(
    parsed.data.items.map((i) => ({
      unitCost: i.unitCost,
      quantity: i.quantity,
      markupPct: i.markupPct,
      discountPct: i.discountPct,
      taxPct: i.taxPct,
    }))
  );

  const quotation = await prisma.quotation.create({
    data: {
      quotationNumber,
      organizationId: orgId,
      customerId: parsed.data.customerId,
      rfqId: parsed.data.rfqId,
      opportunityId: parsed.data.opportunityId,
      currency: parsed.data.currency,
      validUntil: parsed.data.validUntil ? new Date(parsed.data.validUntil) : undefined,
      notes: parsed.data.notes,
      termsAndConditions: parsed.data.termsAndConditions,
      ...(parsed.data.data && Object.keys(parsed.data.data).length
        ? { data: parsed.data.data as Prisma.InputJsonValue }
        : {}),
      baseCost: totals.baseCost,
      markupAmount: totals.markupAmount,
      discountAmount: totals.discountAmount,
      taxAmount: totals.taxAmount,
      grandTotal: totals.grandTotal,
      marginPct: totals.marginPct,
      profitAmount: totals.profitAmount,
      items: {
        create: parsed.data.items.map((i, idx) => {
          const base = i.unitCost * i.quantity;
          const afterMarkup = base * (1 + i.markupPct / 100);
          const afterDiscount = afterMarkup * (1 - i.discountPct / 100);
          const lineTotal = afterDiscount * (1 + i.taxPct / 100);
          return { ...i, position: idx, lineTotal };
        }),
      },
      positions: { create: parsed.data.positions },
    },
    include: { items: true, positions: true },
  });

  if (parsed.data.opportunityId) {
    await prisma.opportunity.update({
      where: { id: parsed.data.opportunityId },
      data: { stage: "QUOTATION_SENT", stageEnteredAt: new Date() },
    }).catch(() => null);
  }

  await recordAudit({
    organizationId: orgId,
    entityType: "QUOTATION",
    entityId: quotation.id,
    entityLabel: quotation.quotationNumber,
    action: "CREATED",
    summary: `Quotation created · grand total ${Number(quotation.grandTotal).toLocaleString("en-IN")} ${quotation.currency}`,
    actorId: session.user.id,
    actorName: session.user.name,
  });
  return NextResponse.json({ quotation });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = await requirePermission(session, "QUOTATIONS", "read");
  if (denied) return denied;
  const quotations = await prisma.quotation.findMany({
    where: { organizationId: session.user.organizationId },
    include: { customer: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ quotations });
}
