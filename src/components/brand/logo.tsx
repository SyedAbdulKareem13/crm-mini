import { cn } from "@/lib/utils";

/**
 * Manzil One — brand mark.
 * The mark is an Urdu monogram (م, the first letter of منزل = "destination")
 * set in Noto Nastaliq Urdu inside a soft gradient tile.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "logo-mark relative inline-flex items-center justify-center rounded-2xl text-white shadow-[0_8px_22px_-8px_hsl(var(--primary)/0.6)]",
        className
      )}
      aria-hidden
    >
      <span
        dir="rtl"
        className="font-urdu select-none leading-none"
        style={{ fontSize: "0.62em", marginTop: "-0.06em" }}
      >
        م
      </span>
    </span>
  );
}

export function Logo({
  className,
  withUrdu = true,
  size = "md",
}: {
  className?: string;
  withUrdu?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const mark =
    size === "lg" ? "h-11 w-11 text-3xl" : size === "sm" ? "h-8 w-8 text-2xl" : "h-9 w-9 text-[1.7rem]";
  const word = size === "lg" ? "text-xl" : size === "sm" ? "text-sm" : "text-base";

  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark className={mark} />
      <span className="flex flex-col leading-none">
        <span className={cn("font-semibold tracking-tight", word)}>
          Manzil <span className="text-gradient">One</span>
        </span>
        {withUrdu ? (
          <span dir="rtl" className="font-urdu mt-0.5 text-[0.7rem] leading-none text-muted-foreground">
            منزل ون
          </span>
        ) : null}
      </span>
    </span>
  );
}
