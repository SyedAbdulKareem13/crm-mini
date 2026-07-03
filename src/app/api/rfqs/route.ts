import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nextRfqNumber } from "@/lib/numbering";

const lineItemSchema = z.object({
  lineType: z.enum(["MANPOWER", "NON_MANPOWER", "SOFTWARE_LICENSE", "HARDWARE", "SERVICE"]),
  description: z.string().min(1),
  quantity: z.coerce.number().nonnegative().default(1),
  uom: z.string().optional(),
  manpowerGrade: z.string().optional(),
  manpowerExperience: z.string().optional(),
  licenseProduct: z.string().optional(),
  notes: z.string().optional(),
});

const createSchema = z.object({
  customerId: z.string().min(1),
  opportunityId: z.string().optional(),
  dueDate: z.string().optional(),
  currency: z.string().default("INR"),
  terms: z.string().optional(),
  remarks: z.string().optional(),
  lineItems: z.array(lineItemSchema).default([]),
  data: z.record(z.unknown()).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid", details: parsed.error.flatten() }, { status: 400 });
  }
  const orgId = session.user.organizationId;
  const rfqNumber = await nextRfqNumber(orgId);
  const rfq = await prisma.rFQ.create({
    data: {
      rfqNumber,
      organizationId: orgId,
      customerId: parsed.data.customerId,
      opportunityId: parsed.data.opportunityId,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined,
      currency: parsed.data.currency,
      terms: parsed.data.terms,
      remarks: parsed.data.remarks,
      ...(parsed.data.data && Object.keys(parsed.data.data).length
        ? { data: parsed.data.data as Prisma.InputJsonValue }
        : {}),
      status: "RECEIVED",
      lineItems: {
        create: parsed.data.lineItems.map((item, idx) => ({ ...item, position: idx })),
      },
    },
    include: { lineItems: true },
  });

  if (parsed.data.opportunityId) {
    await prisma.opportunity.update({
      where: { id: parsed.data.opportunityId },
      data: { stage: "RFQ_RECEIVED", stageEnteredAt: new Date() },
    }).catch(() => null);
  }

  return NextResponse.json({ rfq });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rfqs = await prisma.rFQ.findMany({
    where: { organizationId: session.user.organizationId },
    include: {
      customer: { select: { name: true } },
      opportunity: { select: { name: true, oppNumber: true } },
      _count: { select: { lineItems: true, quotations: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ rfqs });
}
