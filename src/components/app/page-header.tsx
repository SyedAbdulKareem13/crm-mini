import { cn } from "@/lib/utils";

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
  className,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  urdu?: string;
  className?: string;
}) {
  const urduText =
    urdu ??
    TITLE_URDU[title] ??
    (title.startsWith("Welcome back") ? "خوش آمدید" : undefined);

  return (
    <div className={cn("mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div>
        <div className="flex items-baseline gap-3 flex-wrap">
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
          {urduText ? (
            <span dir="rtl" className="font-urdu text-2xl text-muted-foreground leading-none">{urduText}</span>
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
