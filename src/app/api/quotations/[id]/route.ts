import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeQuotation } from "@/lib/quotation-engine";
import { recordAudit, diffFields } from "@/lib/audit";
import { mergeCustomData } from "@/lib/field-config";
import { requirePermission } from "@/lib/permissions";

const itemSchema = z.object({
  itemType: z.enum(["MANPOWER", "NON_MANPOWER", "LICENSE"]),
  description: z.string().min(1),
  quantity: z.coerce.number().nonnegative().default(1),
  uom: z.string().optional().nullable(),
  unitCost: z.coerce.number().nonnegative(),
  markupPct: z.coerce.number().default(0),
  discountPct: z.coerce.number().default(0),
  taxPct: z.coerce.number().default(0),
  manpowerGrade: z.string().optional().nullable(),
  manpowerExperience: z.string().optional().nullable(),
  licenseProduct: z.string().optional().nullable(),
  licenseDuration: z.string().optional().nullable(),
});

const schema = z.object({
  notes: z.string().optional().nullable(),
  termsAndConditions: z.string().optional().nullable(),
  validUntil: z.string().optional().nullable(),
  items: z.array(itemSchema).min(1, "Add at least one line item"),
  data: z.record(z.unknown()).optional(),
});

// A quote can be edited while it is still being worked — not after it is
// approved / sent / accepted, to keep the approved record immutable.
const EDITABLE = new Set(["DRAFT", "PENDING_APPROVAL", "REJECTED"]);

function lineTotalOf(i: { unitCost: number; quantity: number; markupPct: number; discountPct: number; taxPct: number }) {
  const base = i.unitCost * i.quantity;
  const afterMarkup = base * (1 + i.markupPct / 100);
  const afterDiscount = afterMarkup * (1 - i.discountPct / 100);
  return afterDiscount * (1 + i.taxPct / 100);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = await requirePermission(session, "QUOTATIONS", "update");
  if (denied) return denied;
  const orgId = session.user.organizationId;

  const existing = await prisma.quotation.findFirst({
    where: { id, organizationId: orgId },
    include: { items: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // Lifecycle governance: a cancelled record is read-only until reopened.
  if (existing.status === "CANCELLED") {
    const who = existing.cancelledByName ?? "a user";
    const when = existing.cancelledAt
      ? new Date(existing.cancelledAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
      : "an earlier date";
    return NextResponse.json(
      { error: `This quotation was cancelled by ${who} on ${when} and is read-only — reopen it to make changes.`, code: "cancelled" },
      { status: 409 }
    );
  }
  if (!EDITABLE.has(existing.status)) {
    return NextResponse.json(
      { error: `A ${existing.status.toLowerCase().replace("_", " ")} quotation can't be edited. Create a new version instead.` },
      { status: 409 }
    );
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });
  }
  const { notes, termsAndConditions, validUntil, items } = parsed.data;
  const mergedData = mergeCustomData(existing.data, parsed.data.data);

  const totals = computeQuotation(
    items.map((i) => ({ unitCost: i.unitCost, quantity: i.quantity, markupPct: i.markupPct, discountPct: i.discountPct, taxPct: i.taxPct }))
  );
  const newValidUntil = validUntil ? new Date(validUntil) : null;

  const updated = await prisma.$transaction(async (tx) => {
    await tx.quotationItem.deleteMany({ where: { quotationId: id } });
    return tx.quotation.update({
      where: { id },
      data: {
        notes: notes ?? null,
        termsAndConditions: termsAndConditions ?? null,
        validUntil: newValidUntil,
        ...(mergedData !== undefined ? { data: mergedData as Prisma.InputJsonValue } : {}),
        baseCost: totals.baseCost,
        markupAmount: totals.markupAmount,
        discountAmount: totals.discountAmount,
        taxAmount: totals.taxAmount,
        grandTotal: totals.grandTotal,
        marginPct: totals.marginPct,
        profitAmount: totals.profitAmount,
        items: {
          create: items.map((i, idx) => ({
            itemType: i.itemType,
            description: i.description,
            quantity: i.quantity,
            uom: i.uom ?? null,
            unitCost: i.unitCost,
            markupPct: i.markupPct,
            discountPct: i.discountPct,
            taxPct: i.taxPct,
            manpowerGrade: i.manpowerGrade ?? null,
            manpowerExperience: i.manpowerExperience ?? null,
            licenseProduct: i.licenseProduct ?? null,
            licenseDuration: i.licenseDuration ?? null,
            position: idx,
            lineTotal: lineTotalOf(i),
          })),
        },
      },
      select: { id: true, quotationNumber: true, grandTotal: true, marginPct: true, currency: true },
    });
  });

  // Transparent, field-level audit (human-readable keys).
  const before = {
    "Notes": existing.notes ?? "",
    "Terms": existing.termsAndConditions ?? "",
    "Valid until": existing.validUntil ?? null,
    "Grand total": Math.round(Number(existing.grandTotal)),
    "Margin %": Number(Number(existing.marginPct).toFixed(2)),
    "Line items": existing.items.length,
  };
  const after = {
    "Notes": notes ?? "",
    "Terms": termsAndConditions ?? "",
    "Valid until": newValidUntil,
    "Grand total": Math.round(totals.grandTotal),
    "Margin %": Number(totals.marginPct.toFixed(2)),
    "Line items": items.length,
  };
  const changes = diffFields(before, after, Object.keys(after));

  await recordAudit({
    organizationId: orgId,
    entityType: "QUOTATION",
    entityId: id,
    entityLabel: existing.quotationNumber,
    action: "UPDATED",
    summary: `Quotation edited · ${items.length} line item${items.length === 1 ? "" : "s"} · grand total ${Math.round(totals.grandTotal).toLocaleString("en-IN")} ${updated.currency} (${totals.marginPct.toFixed(1)}% margin)`,
    changes,
    actorId: session.user.id,
    actorName: session.user.name,
  });

  return NextResponse.json({ quotation: updated });
}
