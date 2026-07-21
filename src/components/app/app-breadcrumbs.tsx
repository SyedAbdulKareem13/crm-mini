"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Global breadcrumbs for every app page. The five lifecycle detail pages
 * (lead/opportunity/RFQ/quotation/project) render their own richer trail with
 * record numbers via LifecycleHeader — this component stays silent there so
 * crumbs never appear twice.
 */

const SEGMENT_LABELS: Record<string, string> = {
  leads: "Leads",
  opportunities: "Opportunities",
  pipeline: "Pipeline",
  rfqs: "RFQs",
  quotations: "Quotations",
  projects: "Projects",
  customers: "Customers",
  activities: "Activities",
  "rate-cards": "Rate Cards",
  approvals: "Approvals",
  reports: "Reports",
  audit: "Audit Log",
  releases: "What's New",
  admin: "Admin",
  ai: "Manz AI",
  settings: "Settings",
  workload: "Workload",
  proposal: "Proposal",
  plan: "Plan",
  new: "New",
  print: "Print",
};

/** The lifecycle detail pages that carry their own breadcrumb trail. */
const LIFECYCLE_DETAIL = /^\/app\/(leads|opportunities|rfqs|quotations|projects)\/[^/]+$/;

export function AppBreadcrumbs() {
  const pathname = usePathname();
  if (!pathname?.startsWith("/app")) return null;
  if (pathname === "/app") return null; // dashboard — no trail needed
  if (LIFECYCLE_DETAIL.test(pathname)) return null; // LifecycleHeader owns it

  const segments = pathname.split("/").filter(Boolean).slice(1); // drop "app"
  const crumbs: { label: string; href: string | null }[] = [{ label: "Home", href: "/app" }];
  let path = "/app";
  for (const seg of segments) {
    path += `/${seg}`;
    const label = SEGMENT_LABELS[seg];
    if (!label) continue; // opaque ids — the trail skips them
    crumbs.push({ label, href: path });
  }
  if (crumbs.length < 2) return null;
  crumbs[crumbs.length - 1].href = null; // current page is plain text

  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-3 flex items-center gap-1 text-xs text-muted-foreground"
    >
      {crumbs.map((c, i) => (
        <span key={`${c.label}-${i}`} className="flex min-w-0 items-center gap-1">
          {i > 0 ? <span className="text-muted-foreground/50">/</span> : null}
          {c.href ? (
            <Link href={c.href} className="max-w-[10rem] truncate hover:text-foreground">
              {c.label}
            </Link>
          ) : (
            <span className="max-w-[10rem] truncate font-medium text-foreground" aria-current="page">
              {c.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
