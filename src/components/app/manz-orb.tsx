import { cn } from "@/lib/utils";
import type { CSSProperties } from "react";

/**
 * The Manz AI orb — the same drifting gradient blob used as the hero in the
 * AI workspace. CSS lives in globals.css (.manz-orb / .manz-orb-blob /
 * .manz-orb-spec) so it can be used anywhere, including the top-bar launcher.
 */
export function ManzOrb({
  size,
  className,
  style,
}: {
  size: number;
  className?: string;
  style?: CSSProperties;
}) {
  const radius = Math.round(size * 0.3);
  return (
    <div
      className={cn("manz-orb shrink-0", className)}
      style={{ width: size, height: size, borderRadius: radius, ...style }}
      aria-hidden
    >
      <div className="manz-orb-blob" />
      <div className="manz-orb-spec" />
    </div>
  );
}

export default ManzOrb;
