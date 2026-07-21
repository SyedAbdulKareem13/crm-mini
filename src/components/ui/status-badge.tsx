import { cn } from "@/lib/utils";
import {
  statusLabel,
  statusTone,
  TONE_STYLES,
  type LifecycleEntity,
} from "@/lib/lifecycle-status";

/**
 * StatusBadge — the app-wide requirement #9 status colour system.
 *
 * A small pill that maps any lifecycle status to its semantic tone
 * (green completed / blue current / yellow in progress / orange pending
 * approval / red cancelled / grey draft) via `statusTone` + `TONE_STYLES`,
 * with a leading tone dot and the humanised `statusLabel`.
 */
export function StatusBadge({
  entity,
  status,
  className,
}: {
  entity: LifecycleEntity;
  status: string;
  className?: string;
}) {
  const tone = statusTone(entity, status);
  const styles = TONE_STYLES[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        styles.badge,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", styles.dot)} />
      {statusLabel(status)}
    </span>
  );
}
