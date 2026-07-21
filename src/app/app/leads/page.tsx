import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { can } from "@/lib/permissions";
import { LeadsPageClient } from "./leads-client";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const session = await auth();
  if (!session?.user?.organizationId) redirect("/login");
  const denied = !(await can(session.user.organizationId, session.user.role, "LEADS", "read"));
  if (denied) redirect("/app");
  const leads = await prisma.lead.findMany({
    where: { organizationId: session.user.organizationId },
    orderBy: { createdAt: "desc" },
    include: { owner: { select: { name: true, image: true } } },
    take: 200,
  });
  return <LeadsPageClient initialLeads={JSON.parse(JSON.stringify(leads))} />;
}
