import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActivityTypes } from "@/lib/field-config";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.organizationId) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (session.user.role !== "ADMIN") return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { orgId: session.user.organizationId };
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const types = await getActivityTypes(session.user.organizationId);
  return NextResponse.json({ types });
}

const patchSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).optional(),
  icon: z.string().min(1).optional(),
  color: z.string().min(1).optional(),
  active: z.boolean().optional(),
});

export async function PATCH(req: Request) {
  const a = await requireAdmin();
  if (a.error) return a.error;
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  const { id, ...rest } = parsed.data;
  const row = await prisma.activityTypeConfig.findFirst({ where: { id, organizationId: a.orgId }, select: { id: true } });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const type = await prisma.activityTypeConfig.update({ where: { id }, data: rest });
  return NextResponse.json({ type });
}

const reorderSchema = z.object({ order: z.array(z.string()).min(1) });

export async function POST(req: Request) {
  const a = await requireAdmin();
  if (a.error) return a.error;
  const parsed = reorderSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  await prisma.$transaction(
    parsed.data.order.map((id, i) =>
      prisma.activityTypeConfig.updateMany({ where: { id, organizationId: a.orgId }, data: { position: i } })
    )
  );
  return NextResponse.json({ ok: true });
}
