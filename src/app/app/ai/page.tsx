import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGeminiKey } from "@/lib/app-config";
import { PageHeader } from "@/components/app/page-header";
import { AiStudioClient } from "./ai-studio-client";

export const dynamic = "force-dynamic";

async function buildContext(orgId: string): Promise<string> {
  try {
    const [leads, openOpps, wonOpps, quotations, customers, pipeline] = await Promise.all([
      prisma.lead.count({ where: { organizationId: orgId } }),
      prisma.opportunity.count({ where: { organizationId: orgId, NOT: { stage: { in: ["WON", "LOST"] } } } }),
      prisma.opportunity.count({ where: { organizationId: orgId, stage: "WON" } }),
      prisma.quotation.count({ where: { organizationId: orgId } }),
      prisma.customer.count({ where: { organizationId: orgId } }),
      prisma.opportunity.aggregate({
        where: { organizationId: orgId, NOT: { stage: "LOST" } },
        _sum: { expectedRevenue: true },
      }),
    ]);
    const cr = (Number(pipeline._sum.expectedRevenue ?? 0) / 1e7).toFixed(2);
    return [
      `Open pipeline value: ₹${cr} Cr`,
      `Active opportunities: ${openOpps}`,
      `Closed-won: ${wonOpps}`,
      `Leads: ${leads}`,
      `Quotations: ${quotations}`,
      `Customers: ${customers}`,
    ].join(" · ");
  } catch {
    return "";
  }
}

export default async function AiStudioPage() {
  const session = await auth();
  if (!session?.user?.organizationId) redirect("/login");
  const [context, geminiKey] = await Promise.all([
    buildContext(session.user.organizationId),
    getGeminiKey(),
  ]);

  return (
    <>
      <PageHeader
        title="Manzil AI"
        description="Your AI copilot for RFQs, quotations, customers and outreach."
        urdu="منزل اے آئی"
      />
      <AiStudioClient
        configured={Boolean(geminiKey)}
        context={context}
        userName={session.user.name ?? null}
      />
    </>
  );
}
