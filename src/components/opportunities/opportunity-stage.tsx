"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Trophy, X } from "lucide-react";
import { OPP_STAGES } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Pipeline-stage control for the opportunity detail page.
 * A responsive grid of stage cards (the design-system "stage rail" pattern):
 * completed stages are tinted + checked, the current stage glows with the
 * brand gradient, upcoming stages are muted. Clicking moves the deal
 * (optimistic, with rollback). WON / LOST are terminal outcomes.
 */
export function OpportunityStage({
  opportunityId,
  stage,
}: {
  opportunityId: string;
  stage: string;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(stage);
  const [saving, setSaving] = useState(false);

  const TRACK = OPP_STAGES.filter((s) => s.value !== "WON" && s.value !== "LOST");
  const currentIdx = TRACK.findIndex((s) => s.value === current);
  const isWon = current === "WON";
  const isLost = current === "LOST";
  const isTerminal = isWon || isLost;
  const currentLabel = OPP_STAGES.find((s) => s.value === current)?.label ?? current;

  async function change(value: string) {
    if (value === current || saving) return;
    const prev = current;
    setCurrent(value);
    setSaving(true);
    try {
      const res = await fetch(`/api/opportunities/${opportunityId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: value }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Couldn't change stage");
      }
      const label = OPP_STAGES.find((s) => s.value === value)?.label ?? value;
      toast.success(`Moved to ${label}`);
      router.refresh();
    } catch (err: any) {
      setCurrent(prev);
      toast.error(err?.message || "Couldn't change stage");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border bg-card/60 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Pipeline stage
          </span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
            {isWon ? "Won" : isLost ? "Lost" : currentLabel}
          </span>
        </div>
        <span className="hidden text-[11px] text-muted-foreground sm:inline">
          Click a stage to move the deal
        </span>
      </div>

      {/* Stage rail — responsive grid, wraps instead of overflowing */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {TRACK.map((s, i) => {
          const done = isTerminal ? true : i < currentIdx;
          const active = !isTerminal && i === currentIdx;
          return (
            <button
              key={s.value}
              type="button"
              onClick={() => change(s.value)}
              disabled={saving}
              aria-current={active ? "step" : undefined}
              className={cn(
                "group flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-70",
                active
                  ? "border-primary bg-primary/10 shadow-sm ring-2 ring-primary/15"
                  : done
                  ? "border-primary/25 bg-primary/[0.06] hover:bg-primary/10"
                  : "border-border bg-card hover:-translate-y-0.5 hover:border-primary/40 hover:bg-accent/40"
              )}
            >
              <span
                className={cn(
                  "grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-semibold transition-colors",
                  active
                    ? "btn-gradient text-white shadow-[0_4px_12px_-2px_hsl(var(--primary)/0.5)]"
                    : done
                    ? "bg-primary text-white"
                    : "border border-border bg-muted text-muted-foreground"
                )}
              >
                {done && !active ? <Check className="h-3.5 w-3.5" /> : <span className="tabular-nums">{i + 1}</span>}
              </span>
              <span className="min-w-0">
                <span
                  className={cn(
                    "block truncate text-[12px] font-medium leading-tight",
                    active ? "text-foreground" : done ? "text-foreground/80" : "text-muted-foreground"
                  )}
                >
                  {s.label}
                </span>
                <span className="block text-[10px] text-muted-foreground tabular-nums">{s.probability}%</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Terminal outcomes */}
      <div className="mt-4 flex items-center justify-between gap-2 border-t pt-3">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Outcome
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => change("WON")}
            disabled={saving}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-60",
              isWon
                ? "border-transparent bg-emerald-500 text-white shadow-sm ring-2 ring-emerald-500/25"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400"
            )}
          >
            <Trophy className="h-3.5 w-3.5" />
            Won
          </button>
          <button
            type="button"
            onClick={() => change("LOST")}
            disabled={saving}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-60",
              isLost
                ? "border-transparent bg-rose-500 text-white shadow-sm ring-2 ring-rose-500/25"
                : "border-rose-500/30 bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 dark:text-rose-400"
            )}
          >
            <X className="h-3.5 w-3.5" />
            Lost
          </button>
        </div>
      </div>
    </div>
  );
}
