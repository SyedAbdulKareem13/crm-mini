import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nextQuotationNumber } from "@/lib/numbering";
import { computeQuotation } from "@/lib/quotation-engine";
import { recordAudit } from "@/lib/audit";
import type { EstimateResult } from "@/lib/estimator";
import { requirePermission } from "@/lib/permissions";

const MARKUP_PCT = 35;
const TAX_PCT = 18;

/** POST — turn the project's saved estimate into a DRAFT quotation:
 *  one manpower line + position per estimated role, totals via the same
 *  engine the manual builder uses. Completes the PPT presales thread
 *  (estimate → costing → quotation). */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // This turns a saved estimate into a DRAFT quotation → gate on QUOTATIONS/create.
  const denied = await requirePermission(session, "QUOTATIONS", "create");
  if (denied) return denied;
  const orgId = session.user.organizationId;

  const project = await prisma.project.findFirst({
    where: { id, organizationId: orgId },
    select: {
      id: true,
      name: true,
      projectNumber: true,
      customerId: true,
      opportunityId: true,
      data: true,
      methodology: { select: { name: true } },
    },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!project.customerId) {
    return NextResponse.json({ error: "The project has no customer to quote." }, { status: 400 });
  }

  const est = (project.data as Record<string, unknown> | null)?.estimator as
    | { result: EstimateResult }
    | undefined;
  if (!est?.result?.roles?.length) {
    return NextResponse.json(
      { error: "Run the estimator first — there is no saved estimate on this project." },
      { status: 422 }
    );
  }
  const r = est.result;

  const items = r.roles.map((role) => ({
    itemType: "MANPOWER" as const,
    description: `${role.count} × ${role.role} · ${role.months} mo`,
    quantity: role.count * role.months,
    uom: "man-month",
    unitCost: role.monthlyRate,
    markupPct: MARKUP_PCT,
    discountPct: 0,
    taxPct: TAX_PCT,
  }));
  const totals = computeQuotation(
    items.map((i) => ({
      unitCost: i.unitCost,
      quantity: i.quantity,
      markupPct: i.markupPct,
      discountPct: i.discountPct,
      taxPct: i.taxPct,
    }))
  );

  const quotationNumber = await nextQuotationNumber(orgId);
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 30);

  const quotation = await prisma.quotation.create({
    data: {
      quotationNumber,
      organizationId: orgId,
      customerId: project.customerId,
      opportunityId: project.opportunityId,
      currency: "INR",
      status: "DRAFT",
      draftedByAi: true,
      validUntil,
      notes: [
        `Generated from Project Estimator · ${project.projectNumber} “${project.name}”`,
        `Methodology: ${project.methodology?.name ?? "—"} · ${r.durationWeeks} weeks · ${r.totalEffortPM} person-months`,
        `Complexity ${r.complexity}× · contingency included in estimate assumptions`,
      ].join("\n"),
      termsAndConditions:
        "Derived from the intelligent project estimate. Rates matched to manpower rate cards where designations matched; validate before sending.",
      baseCost: totals.baseCost,
      markupAmount: totals.markupAmount,
      discountAmount: totals.discountAmount,
      taxAmount: totals.taxAmount,
      grandTotal: totals.grandTotal,
      marginPct: totals.marginPct,
      profitAmount: totals.profitAmount,
      items: {
        create: items.map((i, idx) => {
          const base = i.unitCost * i.quantity;
          const afterMarkup = base * (1 + i.markupPct / 100);
          const lineTotal = afterMarkup * (1 + i.taxPct / 100);
          return { ...i, position: idx, lineTotal };
        }),
      },
      positions: {
        create: r.roles.map((role) => ({
          designation: role.role,
          headcount: role.count,
          durationMonths: role.months,
          monthlyRate: role.monthlyRate,
          monthlyBilling: Math.round(role.monthlyRate * (1 + MARKUP_PCT / 100)),
          cost: role.cost,
          revenue: Math.round(role.cost * (1 + MARKUP_PCT / 100)),
          margin: Math.round(role.cost * (MARKUP_PCT / 100)),
          marginPct: Math.round((MARKUP_PCT / (100 + MARKUP_PCT)) * 1000) / 10,
        })),
      },
    },
    select: { id: true, quotationNumber: true },
  });

  await recordAudit({
    organizationId: orgId,
    entityType: "QUOTATION",
    entityId: quotation.id,
    entityLabel: quotation.quotationNumber,
    action: "CREATED",
    summary: `Drafted from Project Estimator (${project.projectNumber}) · ${r.roles.length} roles · ${r.durationWeeks}wk`,
    actorId: session.user.id,
    actorName: session.user.name,
  });

  return NextResponse.json({ quotation });
}
