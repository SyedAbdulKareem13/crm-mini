import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getModuleConfig, MODULES } from "@/lib/field-config";

const moduleEnum = z.enum(MODULES);

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.organizationId) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (session.user.role !== "ADMIN") return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { session, orgId: session.user.organizationId };
}

// GET ?module=LEAD — available to any authed user (forms read it).
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const m = new URL(req.url).searchParams.get("module") ?? "";
  const parsed = moduleEnum.safeParse(m);
  if (!parsed.success) return NextResponse.json({ error: "Invalid module" }, { status: 400 });
  const fields = await getModuleConfig(session.user.organizationId, parsed.data);
  return NextResponse.json({ fields });
}

const patchSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).optional(),
  active: z.boolean().optional(),
  required: z.boolean().optional(),
  helpText: z.string().nullable().optional(),
  options: z.array(z.string()).nullable().optional(),
});

export async function PATCH(req: Request) {
  const a = await requireAdmin();
  if (a.error) return a.error;
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  const { id, ...rest } = parsed.data;
  const row = await prisma.fieldConfig.findFirst({ where: { id, organizationId: a.orgId }, select: { id: true } });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const field = await prisma.fieldConfig.update({
    where: { id },
    data: {
      ...(rest.label !== undefined ? { label: rest.label } : {}),
      ...(rest.active !== undefined ? { active: rest.active } : {}),
      ...(rest.required !== undefined ? { required: rest.required } : {}),
      ...(rest.helpText !== undefined ? { helpText: rest.helpText } : {}),
      ...(rest.options !== undefined ? { options: rest.options ?? undefined } : {}),
    },
  });
  return NextResponse.json({ field });
}

// POST: add a custom field, OR reorder ({ module, order: id[] }).
const addSchema = z.object({
  module: moduleEnum,
  label: z.string().min(1),
  fieldType: z.enum(["text", "textarea", "number", "currency", "date", "email", "phone", "select"]).default("text"),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(),
});
const reorderSchema = z.object({ module: moduleEnum, order: z.array(z.string()).min(1) });

export async function POST(req: Request) {
  const a = await requireAdmin();
  if (a.error) return a.error;
  const body = await req.json().catch(() => null);

  const reorder = reorderSchema.safeParse(body);
  if (reorder.success) {
    await prisma.$transaction(
      reorder.data.order.map((id, i) =>
        prisma.fieldConfig.updateMany({
          where: { id, organizationId: a.orgId, module: reorder.data.module },
          data: { position: i },
        })
      )
    );
    return NextResponse.json({ ok: true });
  }

  const parsed = addSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  const slug =
    "custom_" +
    parsed.data.label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 32) +
    "_" +
    Math.random().toString(36).slice(2, 6);
  const max = await prisma.fieldConfig.aggregate({
    where: { organizationId: a.orgId, module: parsed.data.module },
    _max: { position: true },
  });
  const field = await prisma.fieldConfig.create({
    data: {
      organizationId: a.orgId,
      module: parsed.data.module,
      fieldKey: slug,
      label: parsed.data.label,
      fieldType: parsed.data.fieldType,
      required: parsed.data.required,
      options: parsed.data.options ?? undefined,
      isCustom: true,
      active: true,
      position: (max._max.position ?? 0) + 1,
    },
  });
  return NextResponse.json({ field });
}

export async function DELETE(req: Request) {
  const a = await requireAdmin();
  if (a.error) return a.error;
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const row = await prisma.fieldConfig.findFirst({ where: { id, organizationId: a.orgId }, select: { id: true, isCustom: true } });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!row.isCustom) return NextResponse.json({ error: "Only custom fields can be deleted" }, { status: 400 });
  await prisma.fieldConfig.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
