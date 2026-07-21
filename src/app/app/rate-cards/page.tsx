import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/app/page-header";
import { can } from "@/lib/permissions";
import { RateCardsClient } from "./rate-cards-client";

export const dynamic = "force-dynamic";

export default async function RateCardsPage() {
  const session = await auth();
  if (!session?.user?.organizationId) redirect("/login");
  const denied = !(await can(session.user.organizationId, session.user.role, "RATE_CARDS", "read"));
  if (denied) redirect("/app");
  const orgId = session.user.organizationId;

  const [manpower, nonManpower, license] = await Promise.all([
    prisma.manpowerRateCard.findMany({ where: { organizationId: orgId }, orderBy: { designation: "asc" } }),
    prisma.nonManpowerRateCard.findMany({ where: { organizationId: orgId }, orderBy: { category: "asc" } }),
    prisma.licenseRateCard.findMany({ where: { organizationId: orgId }, orderBy: { product: "asc" } }),
  ]);

  return (
    <>
      <PageHeader
        title="Rate cards"
        description="Master pricing for manpower, non-manpower & licenses — power the quotation builder."
      />
      <RateCardsClient
        manpower={JSON.parse(JSON.stringify(manpower))}
        nonManpower={JSON.parse(JSON.stringify(nonManpower))}
        license={JSON.parse(JSON.stringify(license))}
      />
    </>
  );
}
