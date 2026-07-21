"use client";

import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n/provider";
import { NO_SECONDARY } from "@/lib/i18n/config";

/**
 * Owner-authored Urdu fallback map — pre-existing content, kept as the
 * no-`tKey` fallback so every page that hasn't migrated yet renders exactly
 * as before. Do NOT extend this with Arabic: localized secondary script comes
 * from the DB via ts() when a `tKey` is supplied.
 */
const TITLE_URDU: Record<string, string> = {
  "Leads": "لیڈز",
  "Opportunities": "مواقع",
  "Pipeline": "پائپ لائن",
  "RFQs": "آر ایف کیو",
  "Quotations": "کوٹیشنز",
  "Customers": "گاہک",
  "Activities": "سرگرمیاں",
  "Rate cards": "ریٹ کارڈز",
  "Approvals": "منظوریاں",
  "Reports": "رپورٹس",
  "Admin": "ایڈمن",
  "Settings": "ترتیبات",
  "New RFQ": "نیا آر ایف کیو",
  "New quotation": "نئی کوٹیشن",
  "New opportunity": "نیا موقع",
  "RFQs ": "آر ایف کیو",
};

/**
 * English page title → i18n key. Lets standard pages localize their heading
 * (and its beside-script) through the config-driven system WITHOUT every page
 * having to pass an explicit `tKey`. In Full English this is a no-op (the key's
 * English value equals the title); in Full Arabic the heading becomes Arabic;
 * in the bilingual modes the beside-script comes from the DB. All keys map to
 * CORE (server-hydrated) namespaces, so headings are localized on first paint.
 */
const TITLE_KEY: Record<string, string> = {
  "Leads": "nav.leads",
  "Opportunities": "nav.opportunities",
  "Pipeline": "nav.pipeline",
  "RFQs": "nav.rfqs",
  "RFQs ": "nav.rfqs",
  "Quotations": "nav.quotations",
  "Projects": "nav.projects",
  "Customers": "nav.customers",
  "Activities": "nav.activities",
  "Rate cards": "nav.rateCards",
  "Approvals": "nav.approvals",
  "Reports": "nav.reports",
  "Audit Log": "nav.audit",
  "Admin": "nav.admin",
  "Workload": "nav.workload",
  "Settings": "common.settings",
};

export function PageHeader({
  title,
  description,
  actions,
  urdu,
  tKey,
  descriptionKey,
  className,
}: {
  /** English title — still required for backward-compat and as the fallback. */
  title: string;
  description?: string;
  actions?: React.ReactNode;
  urdu?: string;
  /**
   * Optional i18n key (e.g. "nav.leads"). When provided, the heading renders
   * t(tKey) as the localized primary and ts(tKey) beside it as the secondary
   * script (bilingual, from the DB). When absent, the component keeps its
   * original behaviour: English `title` + the owner Urdu-map fallback.
   */
  tKey?: string;
  /** Optional i18n key for the description line. When provided, the description
   *  is localized via t(descriptionKey); otherwise the raw `description` shows. */
  descriptionKey?: string;
  className?: string;
}) {
  const { t, ts, secondary } = useI18n();

  // Resolve a translation key for this heading: an explicit `tKey` wins,
  // otherwise fall back to the title→key map for standard pages. With a key,
  // the primary heading is localized (so Full Arabic shows Arabic, not English);
  // without one it stays the given English `title`.
  const key = tKey ?? TITLE_KEY[title];
  const heading = key ? t(key) : title;
  const descText = descriptionKey ? t(descriptionKey) : description;

  // The beside-heading script only appears when the user has actually chosen a
  // second script. When it's "none", NOTHING is shown — this is what fixes the
  // stale Urdu (ترتیبات) that used to render even with no secondary selected.
  const showSecondary = secondary !== NO_SECONDARY;

  // Secondary (beside) text, only when a second script is active:
  //  • key present → localized secondary straight from the DB via ts().
  //  • no key      → the legacy owner Urdu-map fallback, but ONLY when the
  //    chosen second script is Urdu (the map has no Arabic; Arabic must come
  //    from the DB, never a hardcoded guess).
  const secondaryText = !showSecondary
    ? undefined
    : key
    ? ts(key)
    : secondary === "ur"
    ? urdu ?? TITLE_URDU[title] ?? (title.startsWith("Welcome back") ? "خوش آمدید" : undefined)
    : undefined;

  // Urdu & Arabic are both RTL scripts; the font follows the active secondary
  // (Urdu Nastaliq webfont vs. the Arabic system stack).
  const secondaryDir = secondary === "ur" || secondary === "ar" ? "rtl" : "ltr";
  const secondaryFont = secondary === "ur" ? "font-urdu" : "font-arabic";

  return (
    <div
      className={cn(
        "mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      {/* rtl:text-right keeps the heading + description hugging the reading
          edge even in the mobile (flex-col) layout. */}
      <div className="rtl:text-right">
        <div className="flex items-baseline gap-3 flex-wrap">
          <h1 className="font-display text-3xl font-semibold tracking-tight">{heading}</h1>
          {secondaryText ? (
            <span
              dir={secondaryDir}
              className={cn("text-2xl text-muted-foreground leading-none", secondaryFont)}
            >
              {secondaryText}
            </span>
          ) : null}
        </div>
        {descText ? (
          <p className="mt-1 text-sm text-muted-foreground">{descText}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
