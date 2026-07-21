import { RecentQuotationsView } from "./recent-quotations-view";

export function RecentQuotations({
  quotations,
}: {
  quotations: Array<{
    id: string;
    quotationNumber: string;
    status: string;
    grandTotal: any;
    createdAt: Date;
    customer: { name: string };
  }>;
}) {
  // This stays a Server Component: `grandTotal` arrives as a Prisma.Decimal
  // (a class instance) which cannot cross the RSC → Client boundary. We flatten
  // it to a plain, serializable shape here, then hand off to the client view
  // that does the localized rendering (titles / empty state / currency).
  const items = quotations.map((q) => ({
    id: q.id,
    quotationNumber: q.quotationNumber,
    status: q.status,
    grandTotal: Number(q.grandTotal),
    createdAt: q.createdAt,
    customerName: q.customer.name,
  }));
  return <RecentQuotationsView items={items} />;
}
