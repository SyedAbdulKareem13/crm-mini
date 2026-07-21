import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { APPROVAL_CHAIN_DEFAULT } from "@/lib/constants";

// Roles assignable to approval-chain steps (active taxonomy; legacy enum
// values remain valid in old rows but aren't offered).
const ROLES = [
  "SUPER_USER",
  "SUPER_ADMIN",
  "ADMIN",
  "SALES_OWNER",
  "SALES_HEAD",
  "BUSINESS_HEAD",
  "FINANCE_ANALYST",
  "FINANCE_HEAD",
  // legacy (accepted for existing chains)
  "SALES_EXEC",
  "SALES_MANAGER",
  "FINANCE",
  "REVENUE_OWNER",
  "VIEWER",
] as const;

const DEFAULT_CHAIN_NAME = "Default Quotation Approval";

const upsertSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).default(DEFAULT_CHAIN_NAME),
  appliesTo: z.string().min(1).default("QUOTATION"),
  steps: z
    .array(
      z.object({
        label: z.string().min(1),
        roleRequired: z.enum(ROLES),
      })
    )
    .min(1),
});

async function ensureDefaultChain(orgId: string) {
  const existing = await prisma.approvalChain.findFirst({
    where: { organizationId: orgId },
    include: { steps: { orderBy: { stepNumber: "asc" } } },
    orderBy: { name: "asc" },
  });
  if (existing) return existing;

  return prisma.approvalChain.create({
    data: {
      organizationId: orgId,
      name: DEFAULT_CHAIN_NAME,
      appliesTo: "QUOTATION",
      steps: {
        create: APPROVAL_CHAIN_DEFAULT.map((s) => ({
          stepNumber: s.stepNumber,
          label: s.label,
          roleRequired: s.roleRequired,
        })),
      },
    },
    include: { steps: { orderBy: { stepNumber: "asc" } } },
  });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["SUPER_ADMIN", "SUPER_USER", "ADMIN"].includes(session.user.role ?? "")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const chain = await ensureDefaultChain(session.user.organizationId);
  return NextResponse.json({ chain });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["SUPER_ADMIN", "SUPER_USER", "ADMIN"].includes(session.user.role ?? "")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const orgId = session.user.organizationId;
  const body = await req.json().catch(() => null);
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  const { name, appliesTo, steps } = parsed.data;

  // Resolve the chain we are editing: prefer an explicit id, otherwise the
  // org's existing chain, otherwise create a fresh one.
  let chainId = parsed.data.id;
  if (chainId) {
    const owned = await prisma.approvalChain.findFirst({
      where: { id: chainId, organizationId: orgId },
      select: { id: true },
    });
    if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });
  } else {
    const current = await ensureDefaultChain(orgId);
    chainId = current.id;
  }

  const chain = await prisma.$transaction(async (tx) => {
    await tx.approvalChain.update({
      where: { id: chainId },
      data: { name, appliesTo },
    });
    await tx.approvalChainStep.deleteMany({ where: { chainId } });
    await tx.approvalChainStep.createMany({
      data: steps.map((s, i) => ({
        chainId: chainId!,
        stepNumber: i + 1,
        label: s.label,
        roleRequired: s.roleRequired,
      })),
    });
    return tx.approvalChain.findUniqueOrThrow({
      where: { id: chainId },
      include: { steps: { orderBy: { stepNumber: "asc" } } },
    });
  });

  return NextResponse.json({ chain });
}
