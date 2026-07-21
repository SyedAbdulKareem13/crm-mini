import { cn } from "@/lib/utils";

/**
 * Manzil One — brand mark.
 * The mark is the "Najm" guiding star: a 4-point star rendered in a warm
 * amber-to-coral gradient, centered inside a dark metallic tile.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "logo-mark relative inline-flex items-center justify-center rounded-2xl shadow-[0_8px_22px_-10px_rgba(15,16,20,0.6)]",
        className
      )}
      style={{
        backgroundImage:
          "radial-gradient(120% 120% at 30% 20%, #2A2D34 0%, #14151A 55%, #0B0C10 100%)",
      }}
      aria-hidden
    >
      <svg
        viewBox="0 0 200 200"
        className="h-[62%] w-[62%]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="najmGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#FFE9C2" />
            <stop offset="0.45" stopColor="#FF8A65" />
            <stop offset="1" stopColor="#FF5C5C" />
          </linearGradient>
        </defs>
        <path
          d="M100 10 C108 72 128 92 190 100 C128 108 108 128 100 190 C92 128 72 108 10 100 C72 92 92 72 100 10 Z"
          fill="url(#najmGrad)"
        />
      </svg>
    </span>
  );
}

export function Logo({
  className,
  withUrdu = true,
  size = "md",
  crmSuiteLabel = "CRM Suite",
}: {
  className?: string;
  withUrdu?: boolean;
  size?: "sm" | "md" | "lg";
  /**
   * Localized "CRM Suite" tagline. Logo is a server-safe brand component (also
   * used on pre-auth surfaces), so it can't call the client i18n hook itself —
   * app chrome passes the translated string in; server callers keep the English
   * default.
   */
  crmSuiteLabel?: string;
}) {
  const mark = size === "lg" ? "h-11 w-11" : size === "sm" ? "h-8 w-8" : "h-9 w-9";
  const word = size === "lg" ? "text-xl" : size === "sm" ? "text-sm" : "text-base";

  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark className={mark} />
      <span className="flex flex-col leading-none">
        <span className="flex items-baseline gap-2">
          <span className={cn("font-semibold tracking-tight", word)}>
            Manzil <span className="text-gradient">One</span>
          </span>
          {withUrdu ? (
            <span
              dir="rtl"
              className="font-urdu text-[0.7rem] leading-none text-muted-foreground"
            >
              منزل ون
            </span>
          ) : null}
        </span>
        <span className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {crmSuiteLabel}
        </span>
      </span>
    </span>
  );
}
