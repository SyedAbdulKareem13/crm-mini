import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type SearchResult = {
  type: "lead" | "opportunity" | "customer" | "rfq" | "quotation";
  id: string;
  title: string;
  subtitle: string;
  href: string;
};

/** Global record search across the org's leads / opportunities / customers / RFQs / quotations. */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const orgId = session.user.organizationId;
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] as SearchResult[] });

  const contains = { contains: q, mode: "insensitive" as const };
  const [leads, opps, customers, rfqs, quotations] = await Promise.all([
    prisma.lead.findMany({
      where: {
        organizationId: orgId,
        OR: [{ name: contains }, { company: contains }, { email: contains }, { leadNumber: contains }],
      },
      select: { id: true, name: true, company: true, leadNumber: true },
      take: 5,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.opportunity.findMany({
      where: { organizationId: orgId, OR: [{ name: contains }, { oppNumber: contains }] },
      select: { id: true, name: true, oppNumber: true, stage: true },
      take: 5,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.customer.findMany({
      where: { organizationId: orgId, OR: [{ name: contains }, { industry: contains }] },
      select: { id: true, name: true, industry: true },
      take: 5,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.rFQ.findMany({
      where: { organizationId: orgId, rfqNumber: contains },
      select: { id: true, rfqNumber: true, status: true },
      take: 3,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.quotation.findMany({
      where: { organizationId: orgId, quotationNumber: contains },
      select: { id: true, quotationNumber: true, status: true },
      take: 3,
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const results: SearchResult[] = [
    ...leads.map((l) => ({
      type: "lead" as const,
      id: l.id,
      title: l.name,
      subtitle: `${l.leadNumber} · ${l.company}`,
      href: `/app/leads/${l.id}`,
    })),
    ...opps.map((o) => ({
      type: "opportunity" as const,
      id: o.id,
      title: o.name,
      subtitle: `${o.oppNumber} · ${o.stage.toLowerCase().replace(/_/g, " ")}`,
      href: `/app/opportunities/${o.id}`,
    })),
    ...customers.map((c) => ({
      type: "customer" as const,
      id: c.id,
      title: c.name,
      subtitle: c.industry ?? "Customer",
      href: `/app/customers/${c.id}`,
    })),
    ...rfqs.map((r) => ({
      type: "rfq" as const,
      id: r.id,
      title: r.rfqNumber,
      subtitle: `RFQ · ${r.status.toLowerCase()}`,
      href: `/app/rfqs/${r.id}`,
    })),
    ...quotations.map((qt) => ({
      type: "quotation" as const,
      id: qt.id,
      title: qt.quotationNumber,
      subtitle: `Quotation · ${qt.status.toLowerCase().replace(/_/g, " ")}`,
      href: `/app/quotations/${qt.id}`,
    })),
  ];

  return NextResponse.json({ results });
}
