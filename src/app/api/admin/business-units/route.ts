import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  name: z.string().min(1),
  code: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["SUPER_ADMIN", "SUPER_USER", "ADMIN"].includes(session.user.role ?? "")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const exists = await prisma.businessUnit.findFirst({
    where: { organizationId: session.user.organizationId, name: parsed.data.name },
    select: { id: true },
  });
  if (exists) return NextResponse.json({ error: "A business unit with that name already exists" }, { status: 409 });

  const businessUnit = await prisma.businessUnit.create({
    data: {
      name: parsed.data.name,
      code: parsed.data.code || null,
      organizationId: session.user.organizationId,
    },
  });
  return NextResponse.json({ businessUnit });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["SUPER_ADMIN", "SUPER_USER", "ADMIN"].includes(session.user.role ?? "")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await req.json().catch(() => ({ id: null }));
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const { count } = await prisma.businessUnit.deleteMany({
    where: { id, organizationId: session.user.organizationId },
  });
  if (count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
