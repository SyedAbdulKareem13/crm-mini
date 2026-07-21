"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Ban, Check, Trophy, X } from "lucide-react";
import { OPP_STAGES } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Pipeline-stage control — a professional horizontal path stepper:
 * a continuous rail of numbered nodes (green = completed, brand ring =
 * current, muted = upcoming) with the terminal Won / Lost outcomes kept
 * beside the header. Clicking a node moves the deal (optimistic, with
 * rollback); the server enforces gates and read-only rules.
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
  const isCancelled = current === "CANCELLED";
  const isTerminal = isWon || isLost || isCancelled;
  const currentLabel = OPP_STAGES.find((s) => s.value === current)?.label ?? current;

  async function change(value: string) {
    if (value === current || saving || isCancelled) return;
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
      {/* Header: title + state on the left, outcomes on the right */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Pipeline stage
          </span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-semibold",
              isWon
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                : isLost || isCancelled
                  ? "bg-destructive/10 text-destructive"
                  : "bg-blue-500/15 text-blue-600 dark:text-blue-400"
            )}
          >
            {isWon ? "Won" : isLost ? "Lost" : isCancelled ? "Cancelled" : currentLabel}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => change("WON")}
            disabled={saving || isCancelled}
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
            disabled={saving || isCancelled}
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

      {/* Horizontal path stepper — scrolls internally, never widens the page */}
      <div className="min-w-0 overflow-x-auto pb-1">
        <ol className="flex min-w-max items-start">
          {TRACK.map((s, i) => {
            const done = isWon ? true : isLost || isCancelled ? i < currentIdx : i < currentIdx;
            const active = !isWon && i === currentIdx;
            const railDone = isWon ? true : i < currentIdx;
            return (
              <li key={s.value} className="flex items-start">
                {/* connector before every node except the first */}
                {i > 0 && (
                  <span
                    aria-hidden
                    className={cn(
                      "mt-[13px] h-0.5 w-6 shrink-0 rounded-full sm:w-9",
                      railDone ? "bg-emerald-500/70" : "bg-border"
                    )}
                  />
                )}
                <button
                  type="button"
                  onClick={() => change(s.value)}
                  disabled={saving || isCancelled}
                  aria-current={active ? "step" : undefined}
                  title={`${s.label} · ${s.probability}%`}
                  className={cn(
                    "group flex w-[76px] flex-col items-center gap-1.5 rounded-lg px-1 pb-1 pt-0.5 text-center transition-colors sm:w-[86px]",
                    !isTerminal && "hover:bg-muted/50",
                    "disabled:cursor-not-allowed"
                  )}
                >
                  <span
                    className={cn(
                      "grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-semibold transition-all",
                      done
                        ? "bg-emerald-500 text-white"
                        : active
                          ? cn(
                              "text-white ring-4",
                              isLost || isCancelled
                                ? "bg-destructive ring-destructive/20"
                                : "bg-primary ring-primary/20 shadow-[0_4px_12px_-2px_hsl(var(--primary)/0.45)]"
                            )
                          : "border-2 border-border bg-background text-muted-foreground group-hover:border-primary/40"
                    )}
                  >
                    {done ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : active && (isLost || isCancelled) ? (
                      <Ban className="h-3.5 w-3.5" />
                    ) : (
                      <span className="tabular-nums">{i + 1}</span>
                    )}
                  </span>
                  <span className="min-w-0">
                    <span
                      className={cn(
                        "block truncate text-[11px] font-medium leading-tight",
                        active ? "text-foreground" : done ? "text-foreground/75" : "text-muted-foreground"
                      )}
                    >
                      {s.label}
                    </span>
                    <span className="block text-[10px] tabular-nums text-muted-foreground/80">
                      {s.probability}%
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      {isCancelled ? (
        <p className="mt-2 text-[11px] text-muted-foreground">
          This opportunity is cancelled and read-only — reopen it to move stages.
        </p>
      ) : (
        <p className="mt-2 hidden text-[11px] text-muted-foreground sm:block">
          Click a stage to move the deal — configured gates apply automatically.
        </p>
      )}
    </div>
  );
}
