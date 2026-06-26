import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nextQuotationNumber } from "@/lib/numbering";
import { computeQuotation } from "@/lib/quotation-engine";
import { recordAudit } from "@/lib/audit";
import { getGeminiKey, getGeminiModel } from "@/lib/app-config";
import { geminiGenerate } from "@/lib/ai";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MARKUP_PCT = 35;
const TAX_PCT = 18;

const schema = z.object({ prompt: z.string().min(8) });

type Role = { count: number; role: string };
type Parsed = { title: string; clientName: string; roles: Role[]; durationMonths: number; pricingModel: string };

function titleCase(s: string): string {
  return s
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((w) =>
      /^[A-Z0-9&/.+-]{2,}$/.test(w) || /\d/.test(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)
    )
    .join(" ");
}

/** Deterministic parser for the standard brief grammar:
 *  "<N>-month <scope> for a <client>; <c> <Role>, <c> <Role>; <PricingModel>." */
function parseBrief(text: string): Parsed {
  const t = text.replace(/\s+/g, " ").trim();

  let durationMonths = 0;
  const ym = t.match(/(\d+)\s*-?\s*year/i);
  const mm = t.match(/(\d+)\s*-?\s*month/i);
  if (ym) durationMonths = parseInt(ym[1], 10) * 12;
  else if (mm) durationMonths = parseInt(mm[1], 10);

  let pricingModel = "T&M";
  if (/fixed\s*price/i.test(t)) pricingModel = "Fixed Price";
  else if (/managed\s*services/i.test(t)) pricingModel = "Managed Services";
  else if (/t\s*&\s*m|time\s*(?:&|and)\s*material/i.test(t)) pricingModel = "T&M";

  // Scope / title + client (split on " for a/an ")
  let title = t;
  let clientName = "AI Draft Client";
  const forMatch = t.match(/\bfor an?\b/i);
  if (forMatch && forMatch.index !== undefined) {
    title = t.slice(0, forMatch.index).trim().replace(/[;,.]+$/, "");
    const after = t.slice(forMatch.index).replace(/^for an?\s+/i, "");
    const client = after.split(";")[0].trim().replace(/[;,.]+$/, "");
    if (client) clientName = titleCase(client);
  } else {
    title = t.split(";")[0].trim();
  }

  // Roles: pick the ";"-segment with the most "<n> <role>" comma-parts.
  const segs = t.split(";").map((s) => s.trim());
  let roles: Role[] = [];
  for (const seg of segs) {
    const parts = seg.split(",").map((p) => p.trim());
    const found: Role[] = [];
    for (const p of parts) {
      const m = p.match(/^(\d+)\s+(.+?)\s*$/);
      if (m) {
        const count = parseInt(m[1], 10);
        const role = m[2].replace(/[.]+$/, "").trim();
        if (count > 0 && role && !/month|year/i.test(role)) found.push({ count, role });
      }
    }
    if (found.length > roles.length) roles = found;
  }

  return { title: title || "AI-drafted engagement", clientName, roles, durationMonths, pricingModel };
}

/** Indicative monthly cost (INR) per role keyword. Order matters. */
function roleMonthlyRate(role: string): number {
  const r = role.toLowerCase();
  if (/(solution|cloud|enterprise)\s*architect|architect|tech(nical)?\s*lead|delivery (manager|lead)/.test(r)) return 450000;
  if (/project manager|program manager|\bpm\b|scrum master/.test(r)) return 350000;
  if (/data engineer|ai engineer|ml engineer/.test(r)) return 320000;
  if (/devops|sre|site reliability/.test(r)) return 300000;
  if (/consultant|business analyst|\bba\b|basis|functional/.test(r)) return 300000;
  if (/ui\/?ux|ux|designer/.test(r)) return 250000;
  if (/\bqa\b|test|quality/.test(r)) return 200000;
  if (/developer|engineer|programmer|full ?stack|back ?end|front ?end|flutter|servicenow|mobile/.test(r)) return 280000;
  return 280000;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = session.user.organizationId;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please enter a brief." }, { status: 400 });

  const brief = parseBrief(parsed.data.prompt);
  if (!brief.roles.length || !brief.durationMonths) {
    return NextResponse.json(
      {
        error:
          "Couldn't read the brief. Use a format like: \"3-month Salesforce CRM implementation for a healthcare provider; 1 PM, 2 Developers, 1 QA; Fixed Price.\"",
        code: "parse",
      },
      { status: 422 }
    );
  }

  // Build positions + line items.
  const months = brief.durationMonths;
  const positions = brief.roles.map((r) => {
    const monthlyRate = roleMonthlyRate(r.role);
    const monthlyBilling = Math.round(monthlyRate * (1 + MARKUP_PCT / 100));
    const cost = monthlyRate * r.count * months;
    const revenue = monthlyBilling * r.count * months;
    const margin = revenue - cost;
    const marginPct = revenue > 0 ? (margin / revenue) * 100 : 0;
    return {
      designation: titleCase(r.role),
      headcount: r.count,
      durationMonths: months,
      monthlyRate,
      monthlyBilling,
      cost,
      revenue,
      margin,
      marginPct,
    };
  });

  const items = brief.roles.map((r) => ({
    itemType: "MANPOWER" as const,
    description: `${r.count} × ${titleCase(r.role)} · ${months} mo`,
    quantity: r.count * months, // man-months
    uom: "man-month",
    unitCost: roleMonthlyRate(r.role),
    markupPct: MARKUP_PCT,
    discountPct: 0,
    taxPct: TAX_PCT,
  }));

  const totals = computeQuotation(
    items.map((i) => ({ unitCost: i.unitCost, quantity: i.quantity, markupPct: i.markupPct, discountPct: i.discountPct, taxPct: i.taxPct }))
  );

  // Optional: a polished scope narrative via Gemini (skipped silently if the key is rate-limited / unset).
  let scopeNote = "";
  try {
    const key = await getGeminiKey();
    if (key) {
      scopeNote = await geminiGenerate({
        apiKey: key,
        model: await getGeminiModel(),
        system: "You are Manzil AI inside a CRM. Write a crisp 2-3 sentence professional engagement scope. No preamble.",
        prompt: `Write the scope/approach paragraph for this engagement brief:\n"""${parsed.data.prompt}"""`,
        temperature: 0.5,
      });
    }
  } catch {
    /* AI optional — fall back to the structured note below */
  }

  // Find-or-create the customer from the brief's client descriptor.
  let customer = await prisma.customer.findFirst({
    where: { organizationId: orgId, name: brief.clientName },
    select: { id: true },
  });
  if (!customer) {
    customer = await prisma.customer.create({
      data: { organizationId: orgId, name: brief.clientName },
      select: { id: true },
    });
  }

  const quotationNumber = await nextQuotationNumber(orgId);
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 30);

  const notes = [
    brief.title,
    `Engagement: ${months} month${months === 1 ? "" : "s"} · ${brief.pricingModel}`,
    `Team: ${brief.roles.map((r) => `${r.count} ${titleCase(r.role)}`).join(", ")}`,
    scopeNote ? `\nScope: ${scopeNote}` : "",
    `\n— Drafted by Manzil AI`,
  ]
    .filter(Boolean)
    .join("\n");

  const quotation = await prisma.quotation.create({
    data: {
      quotationNumber,
      organizationId: orgId,
      customerId: customer.id,
      currency: "INR",
      status: "DRAFT",
      validUntil,
      notes,
      termsAndConditions: `Pricing model: ${brief.pricingModel}. Rates are indicative AI estimates; validate against rate cards before sending.`,
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
          const afterDiscount = afterMarkup * (1 - i.discountPct / 100);
          const lineTotal = afterDiscount * (1 + i.taxPct / 100);
          return { ...i, position: idx, lineTotal };
        }),
      },
      positions: { create: positions },
    },
    select: { id: true, quotationNumber: true, grandTotal: true, currency: true },
  });

  await recordAudit({
    organizationId: orgId,
    entityType: "QUOTATION",
    entityId: quotation.id,
    entityLabel: quotation.quotationNumber,
    action: "CREATED",
    summary: `Drafted by Manzil AI · ${brief.roles.reduce((n, r) => n + r.count, 0)} resources · ${months} mo · grand total ${Number(quotation.grandTotal).toLocaleString("en-IN")} ${quotation.currency}`,
    actorId: session.user.id,
    actorName: session.user.name,
  });

  return NextResponse.json({ id: quotation.id, quotationNumber: quotation.quotationNumber });
}
