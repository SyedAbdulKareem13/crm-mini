import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getHeroVersion } from "@/lib/app-config";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";
import { AdminClient } from "./admin-client";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.organizationId) redirect("/login");
  const orgId = session.user.organizationId;
  const role = session.user.role ?? "";
  // Admin surfaces: the three admin tiers edit config; everyone else only
  // reaches this page if their role's matrix grants ADMIN read.
  const isAdmin = ["SUPER_ADMIN", "SUPER_USER", "ADMIN"].includes(role);
  const canManageAccess = role === "SUPER_ADMIN";
  if (!isAdmin) {
    const { can } = await import("@/lib/permissions");
    if (!(await can(orgId, role, "ADMIN", "read"))) redirect("/app");
  }

  const [users, territories, businessUnits, approvalChains, heroVersion] = await Promise.all([
    prisma.user.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        lastLoginAt: true,
      },
    }),
    prisma.territory.findMany({ where: { organizationId: orgId }, orderBy: { name: "asc" } }),
    prisma.businessUnit.findMany({ where: { organizationId: orgId }, orderBy: { name: "asc" } }),
    prisma.approvalChain.findMany({
      where: { organizationId: orgId },
      include: { steps: { orderBy: { stepNumber: "asc" } } },
      orderBy: { name: "asc" },
    }),
    getHeroVersion(),
  ]);

  const chain = approvalChains[0]
    ? {
        id: approvalChains[0].id,
        name: approvalChains[0].name,
        appliesTo: approvalChains[0].appliesTo,
        steps: approvalChains[0].steps.map((s) => ({
          id: s.id,
          label: s.label,
          roleRequired: s.roleRequired,
        })),
      }
    : null;

  return (
    <>
      <PageHeader
        title="Admin"
        description="Users, roles, territories, business units & approval chains."
      />

      {!isAdmin && (
        <Card className="mb-6 border-warning/40 bg-warning/5">
          <CardContent className="flex items-center gap-3 py-4 text-sm">
            <ShieldAlert className="h-5 w-5 text-warning" />
            <span>
              You are viewing master data in read-only mode. Only administrators can make changes.
            </span>
          </CardContent>
        </Card>
      )}

      <AdminClient
        users={users}
        territories={territories}
        businessUnits={businessUnits}
        chain={chain}
        heroVersion={heroVersion}
        readOnly={!isAdmin}
        canManageAccess={canManageAccess}
      />
    </>
  );
}
