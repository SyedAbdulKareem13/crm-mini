"use client";

import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n/provider";

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

export function PageHeader({
  title,
  description,
  actions,
  urdu,
  tKey,
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
  className?: string;
}) {
  const { t, ts, secondary } = useI18n();

  const heading = tKey ? t(tKey) : title;

  // Secondary (beside) script + its direction/font.
  //  • tKey path  → localized secondary from the DB (ts); font/dir keyed off the
  //    configured secondary language (Urdu webfont vs. Arabic system stack).
  //  • no-tKey    → the owner Urdu-map fallback, always RTL Nastaliq.
  const secondaryText = tKey
    ? ts(tKey)
    : urdu ??
      TITLE_URDU[title] ??
      (title.startsWith("Welcome back") ? "خوش آمدید" : undefined);

  // Mirrors the Bilingual helper: bilingual secondaries are RTL scripts
  // (Urdu/Arabic); anything else renders LTR. The no-tKey fallback is Urdu.
  const secondaryDir =
    tKey && !(secondary === "ur" || secondary === "ar") ? "ltr" : "rtl";
  const secondaryFont = tKey
    ? secondary === "ur"
      ? "font-urdu"
      : "font-arabic"
    : "font-urdu";

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
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
