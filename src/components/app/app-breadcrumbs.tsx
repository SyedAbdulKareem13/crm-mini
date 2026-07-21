"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/components/i18n/provider";

/**
 * Global breadcrumbs for every app page. The five lifecycle detail pages
 * (lead/opportunity/RFQ/quotation/project) render their own richer trail with
 * record numbers via LifecycleHeader — this component stays silent there so
 * crumbs never appear twice.
 */

/**
 * Path segment → i18n key (`nav` namespace, server-hydrated). Segments with a
 * key localize via t(); the rest fall back to SEGMENT_LABELS below. Home is
 * handled separately (nav.home).
 */
const SEGMENT_KEYS: Record<string, string> = {
  leads: "nav.leads",
  opportunities: "nav.opportunities",
  pipeline: "nav.pipeline",
  rfqs: "nav.rfqs",
  quotations: "nav.quotations",
  projects: "nav.projects",
  customers: "nav.customers",
  activities: "nav.activities",
  "rate-cards": "nav.rateCards",
  approvals: "nav.approvals",
  reports: "nav.reports",
  audit: "nav.audit",
  releases: "nav.releases",
  admin: "nav.admin",
  workload: "nav.workload",
  // Previously un-keyed segments — these render via the chrome/common
  // namespaces so they localize instead of falling back to raw English.
  ai: "chrome.manzAi",
  settings: "common.settings",
  proposal: "chrome.breadcrumbProposal",
  plan: "chrome.breadcrumbPlan",
  new: "common.new",
  print: "common.print",
};

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
  const { t, tx } = useI18n();
  if (!pathname?.startsWith("/app")) return null;
  if (pathname === "/app") return null; // dashboard — no trail needed
  if (LIFECYCLE_DETAIL.test(pathname)) return null; // LifecycleHeader owns it

  const segments = pathname.split("/").filter(Boolean).slice(1); // drop "app"
  const crumbs: { label: string; href: string | null }[] = [
    { label: t("nav.home"), href: "/app" },
  ];
  let path = "/app";
  for (const seg of segments) {
    path += `/${seg}`;
    const navKey = SEGMENT_KEYS[seg];
    const fallback = SEGMENT_LABELS[seg];
    if (!navKey && !fallback) continue; // opaque ids — the trail skips them
    crumbs.push({ label: navKey ? tx(navKey, fallback ?? t(navKey)) : fallback!, href: path });
  }
  if (crumbs.length < 2) return null;
  crumbs[crumbs.length - 1].href = null; // current page is plain text

  return (
    <nav
      aria-label={tx("chrome.breadcrumbLabel", "Breadcrumb")}
      className="mb-3 flex items-center gap-1 text-xs text-muted-foreground"
    >
      {crumbs.map((c, i) => (
        <span key={`${c.label}-${i}`} className="flex min-w-0 items-center gap-1">
          {/* rtl-flip mirrors the "/" to "\" so it leans with the reading
              direction; the flex row itself already reverses crumb order. */}
          {i > 0 ? <span className="text-muted-foreground/50 rtl-flip">/</span> : null}
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
