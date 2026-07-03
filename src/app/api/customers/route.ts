import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().min(1),
  industry: z.string().optional(),
  billingAddress: z.string().optional(),
  shippingAddress: z.string().optional(),
  gstNumber: z.string().optional(),
  country: z.string().optional(),
  region: z.string().optional(),
  website: z.string().optional(),
  data: z.record(z.unknown()).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const customers = await prisma.customer.findMany({
    where: { organizationId: session.user.organizationId },
    include: { _count: { select: { opportunities: true, rfqs: true, quotations: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ customers });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  const { data: customData, ...core } = parsed.data;
  const customer = await prisma.customer.create({
    data: {
      ...core,
      ...(customData && Object.keys(customData).length
        ? { data: customData as Prisma.InputJsonValue }
        : {}),
      organizationId: session.user.organizationId,
    },
  });
  return NextResponse.json({ customer });
}
