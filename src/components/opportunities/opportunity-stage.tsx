"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Trophy, X } from "lucide-react";
import { OPP_STAGES } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Horizontal pipeline-stage stepper for the opportunity detail page.
 * Evenly-spaced nodes on a single connected track: completed nodes filled,
 * the current node emphasized (brand gradient), upcoming muted. Clicking a
 * node moves the deal (optimistic, with rollback). WON / LOST are terminal.
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
      if (!res.ok) throw new Error();
      const label = OPP_STAGES.find((s) => s.value === value)?.label ?? value;
      toast.success(`Moved to ${label}`);
      router.refresh();
    } catch {
      setCurrent(prev);
      toast.error("Couldn't change stage");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border bg-card/60 p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Pipeline stage
        </span>
        <span className="hidden text-[11px] text-muted-foreground sm:inline">
          Click a stage to move the deal
        </span>
      </div>

      {/* Stepper track */}
      <div className="overflow-x-auto pb-1 scrollbar-thin">
        <div className="flex min-w-max">
          {TRACK.map((s, i) => {
            const done = isTerminal ? true : i < currentIdx;
            const active = !isTerminal && i === currentIdx;
            const last = i === TRACK.length - 1;
            const segmentFilled = isTerminal || i < currentIdx;
            return (
              <div key={s.value} className="relative flex w-[92px] flex-col items-center">
                {/* Connector to the next node — sits behind the nodes, centered on them */}
                {!last ? (
                  <span
                    className={cn(
                      "absolute left-1/2 top-4 z-0 h-0.5 w-full -translate-y-1/2 transition-colors",
                      segmentFilled ? "bg-primary" : "bg-border"
                    )}
                  />
                ) : null}

                {/* Node */}
                <button
                  type="button"
                  onClick={() => change(s.value)}
                  disabled={saving}
                  title={s.label}
                  aria-current={active ? "step" : undefined}
                  className={cn(
                    "relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 text-[11px] font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-70",
                    active && "btn-gradient scale-110 border-transparent text-white shadow-md ring-4 ring-primary/20",
                    !active && done && "border-primary bg-primary/15 text-primary hover:bg-primary/25",
                    !active && !done && "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground"
                  )}
                >
                  {done && !active ? <Check className="h-3.5 w-3.5" /> : <span className="tabular-nums">{i + 1}</span>}
                </button>

                {/* Label */}
                <button
                  type="button"
                  onClick={() => change(s.value)}
                  disabled={saving}
                  className={cn(
                    "mt-2 w-full px-1 text-center text-[10px] font-medium leading-tight transition-colors disabled:cursor-not-allowed",
                    active ? "text-foreground" : done ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {s.label}
                </button>
              </div>
            );
          })}
        </div>
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
