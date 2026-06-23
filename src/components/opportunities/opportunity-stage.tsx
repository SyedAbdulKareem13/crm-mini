"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { OPP_STAGES } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Interactive pipeline-stage indicator for the opportunity detail page.
 * Shows every stage; the current one is highlighted and clicking any stage
 * moves the deal (optimistic, with rollback on failure).
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
  const currentIdx = OPP_STAGES.findIndex((s) => s.value === current);

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
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Pipeline stage
        </span>
        <span className="text-[11px] text-muted-foreground">Click a stage to move the deal</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {OPP_STAGES.map((s, i) => {
          const active = s.value === current;
          const done = i < currentIdx && current !== "LOST";
          const isLost = s.value === "LOST";
          return (
            <button
              key={s.value}
              type="button"
              onClick={() => change(s.value)}
              disabled={saving}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-60",
                active && !isLost && "btn-gradient border-transparent text-white shadow-sm",
                active && isLost && "border-transparent bg-destructive text-destructive-foreground",
                !active && done && "border-primary/20 bg-primary/10 text-primary",
                !active &&
                  !done &&
                  "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
              )}
            >
              {done ? <Check className="h-3 w-3" /> : null}
              {s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
