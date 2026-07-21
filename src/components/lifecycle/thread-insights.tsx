"use client";

/**
 * Thread insights — stage timeline + merged activity history.
 *
 * CONTRACT (do not change signatures — other components mount these):
 *   <ThreadTimeline entityType="OPPORTUNITY" entityId={id} />
 *   <ThreadHistory  entityType="OPPORTUNITY" entityId={id} />
 * Both are self-contained: they fetch GET /api/lifecycle/thread?type=&id=
 * ({ thread, milestones, history }) and render their card.
 */

import * as React from "react";
import {
  Building2,
  FileText,
  FolderKanban,
  ReceiptText,
  Target,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n/provider";
import type { LifecycleEntity } from "@/lib/lifecycle-status";

export type ThreadInsightsProps = {
  entityType: Exclude<LifecycleEntity, "APPROVAL">;
  entityId: string;
};

/* ------------------------------- types -------------------------------- */

type Milestone = { label: string; at: string; by: string | null; entityNumber: string };
type HistoryEntry = {
  at: string;
  by: string | null;
  entityType: string;
  entityNumber: string;
  action: string;
  summary: string;
};

/* ------------------------------ helpers ------------------------------- */

const dtf = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

/** "18 Jul 2026, 3:15 pm" */
function formatMoment(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return dtf.format(d).replace(/\bAM\b/, "am").replace(/\bPM\b/, "pm");
}

/** Tiny per-entity icon so the merged trail is scannable across the chain. */
function EntityIcon({ type, className }: { type: string; className?: string }) {
  const Icon =
    type === "LEAD"
      ? UserRound
      : type === "OPPORTUNITY"
        ? Target
        : type === "RFQ"
          ? FileText
          : type === "QUOTATION"
            ? ReceiptText
            : type === "PROJECT"
              ? FolderKanban
              : Building2;
  return <Icon className={cn("h-3.5 w-3.5", className)} />;
}

/** Shared fetch hook — each component mounts its own, per the contract. */
function useThread<T extends object>(
  entityType: ThreadInsightsProps["entityType"],
  entityId: string
): { data: T | null; loading: boolean; error: boolean } {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    fetch(`/api/lifecycle/thread?type=${entityType}&id=${encodeURIComponent(entityId)}`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((json) => {
        if (!cancelled) setData(json as T);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [entityType, entityId]);

  return { data, loading, error };
}

/* --------------------------- stage timeline --------------------------- */

export function ThreadTimeline({ entityType, entityId }: ThreadInsightsProps) {
  const { tx } = useI18n();
  const { data, loading, error } = useThread<{ milestones: Milestone[] }>(entityType, entityId);

  if (error) return null;

  return (
    <Card className="luxury-card">
      <CardHeader>
        <CardTitle className="text-base">{tx("common.stageTimeline", "Stage timeline")}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="mt-1 h-2.5 w-2.5 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-40" />
                  <Skeleton className="h-3 w-28" />
                </div>
              </div>
            ))}
          </div>
        ) : !data || data.milestones.length === 0 ? (
          <p className="text-sm text-muted-foreground">{tx("common.noStageActivity", "No stage activity recorded yet.")}</p>
        ) : (
          <ol className="relative space-y-5 ps-1">
            {data.milestones.map((m, i) => {
              const last = i === data.milestones.length - 1;
              return (
                <li key={`${m.entityNumber}-${m.at}-${i}`} className="relative flex gap-3">
                  <div className="relative flex flex-col items-center">
                    <span
                      className={cn(
                        "z-10 mt-1 h-2.5 w-2.5 shrink-0 rounded-full ring-4 ring-background",
                        last ? "bg-primary" : "bg-primary/40"
                      )}
                    />
                    {!last && (
                      <span className="absolute top-2 h-[calc(100%+1.25rem)] w-px bg-border" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 pb-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{m.label}</span>
                      <span className="rounded-md border bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
                        {m.entityNumber}
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {formatMoment(m.at)}
                      {m.by ? ` · ${tx("common.byName", "by {name}", { name: m.by })}` : ""}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

/* -------------------------- lifecycle history ------------------------- */

const INITIAL_COUNT = 12;

export function ThreadHistory({ entityType, entityId }: ThreadInsightsProps) {
  const { tx } = useI18n();
  const { data, loading, error } = useThread<{ history: HistoryEntry[] }>(entityType, entityId);
  const [showAll, setShowAll] = React.useState(false);

  if (error) return null;

  const history = data?.history ?? [];
  const visible = showAll ? history : history.slice(0, INITIAL_COUNT);

  return (
    <Card className="luxury-card">
      <CardHeader>
        <CardTitle className="text-base">{tx("common.lifecycleHistory", "Lifecycle history")}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-6 w-6 shrink-0 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-48" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : history.length === 0 ? (
          <p className="text-sm text-muted-foreground">{tx("common.noLifecycleActivity", "No lifecycle activity yet.")}</p>
        ) : (
          <>
            <ul className="space-y-4">
              {visible.map((h, i) => (
                <li key={`${h.entityNumber}-${h.at}-${i}`} className="flex gap-3">
                  <span
                    className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border bg-muted/50 text-muted-foreground"
                    title={h.entityType}
                  >
                    <EntityIcon type={h.entityType} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm">
                      <span className="font-medium tabular-nums">{h.entityNumber}</span>
                      <span className="text-muted-foreground"> · {h.summary}</span>
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {formatMoment(h.at)}
                      {h.by ? ` · ${h.by}` : ""}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            {history.length > INITIAL_COUNT && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-3 h-8 text-xs text-muted-foreground"
                onClick={() => setShowAll((v) => !v)}
              >
                {showAll
                  ? tx("common.showLess", "Show less")
                  : tx("common.showAllCount", "Show all {count}", { count: history.length })}
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
