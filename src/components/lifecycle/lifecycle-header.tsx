"use client";

/**
 * LifecycleHeader — the three-row thread banner mounted atop every detail page.
 *
 *   Row 1  breadcrumbs (Home > module > ancestors > current)
 *   Row 2  the 7-station flow strip + prev/next navigation
 *   Row 3  governance bar (cancel action, or read-only banner + reopen)
 *
 * Client component: it POSTs to /api/lifecycle for cancel/reopen and refreshes.
 * It never widens the page — the flow strip scrolls horizontally on overflow.
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn, formatDate } from "@/lib/utils";
import {
  READ_ONLY_STATUSES,
  TONE_STYLES,
  type LifecycleThreadDTO,
  type ThreadStation,
} from "@/lib/lifecycle-status";

type CancelableEntity = "LEAD" | "OPPORTUNITY" | "RFQ" | "QUOTATION";

export type LifecycleHeaderEntity = {
  type: CancelableEntity | "PROJECT";
  id: string;
  status: string;
};

export type CancelInfo = {
  at: string;
  by: string | null;
  reason: string | null;
} | null;

export function LifecycleHeader({
  thread,
  entity,
  cancelInfo,
  canCancel = true,
  canReopen = true,
}: {
  thread: LifecycleThreadDTO;
  entity: LifecycleHeaderEntity;
  /** Retained for caller compatibility; reopen/cancel now flow via can* props. */
  viewerRole?: string;
  cancelInfo: CancelInfo;
  /** Server-computed CANCEL permission; false hides the Cancel button. */
  canCancel?: boolean;
  /** Server-computed REOPEN permission; false shows the "ask a manager" note. */
  canReopen?: boolean;
}): JSX.Element {
  const isReadOnly =
    entity.type !== "PROJECT" &&
    (READ_ONLY_STATUSES[entity.type]?.includes(entity.status) ?? false);

  const currentNumber =
    thread.stations.find((s) => s.isCurrent)?.record?.number ?? entity.type.toLowerCase();

  // Cancel lives in the strip's control cluster (no dedicated row = no dead
  // whitespace); only an actual cancellation earns its own banner row.
  const showCancel = !isReadOnly && entity.type !== "PROJECT" && canCancel;

  return (
    <div className="mb-4 space-y-2.5">
      <Breadcrumbs crumbs={thread.crumbs} />
      <FlowStrip
        stations={thread.stations}
        trailing={
          showCancel ? (
            <CancelDialog
              entity={{ type: entity.type as CancelableEntity, id: entity.id }}
              recordNumber={currentNumber}
            />
          ) : null
        }
      />
      {isReadOnly && (
        <CancelledBanner entity={entity} cancelInfo={cancelInfo} canReopen={canReopen} />
      )}
    </div>
  );
}

/* ----------------------------- Row 1: crumbs ----------------------------- */

function Breadcrumbs({ crumbs }: { crumbs: LifecycleThreadDTO["crumbs"] }) {
  if (!crumbs.length) return null;
  return (
    <nav className="flex items-center gap-1 text-xs text-muted-foreground" aria-label="Breadcrumb">
      {crumbs.map((c, i) => (
        <span key={`${c.label}-${i}`} className="flex min-w-0 items-center gap-1">
          {i > 0 ? <span className="text-muted-foreground/50">/</span> : null}
          {c.href ? (
            <Link href={c.href} className="max-w-[10rem] truncate hover:text-foreground">
              {c.label}
            </Link>
          ) : (
            <span className="max-w-[10rem] truncate font-medium text-foreground" aria-current="page">
              {c.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}

/* --------------------------- Row 2: flow strip --------------------------- */

function FlowStrip({
  stations,
  trailing,
}: {
  stations: ThreadStation[];
  trailing?: React.ReactNode;
}) {
  const currentIdx = stations.findIndex((s) => s.isCurrent);

  const prev = (() => {
    for (let i = currentIdx - 1; i >= 0; i--) {
      if (stations[i].record?.href) return stations[i];
    }
    return null;
  })();
  const next = (() => {
    if (currentIdx < 0) return null;
    for (let i = currentIdx + 1; i < stations.length; i++) {
      if (stations[i].record?.href) return stations[i];
    }
    return null;
  })();

  return (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1 overflow-x-auto">
        <ol className="flex min-w-max items-stretch gap-0">
          {stations.map((st, i) => (
            <li key={st.key} className="flex items-center">
              <StationChip station={st} />
              {i < stations.length - 1 ? (
                <span className="mx-1 h-px w-4 shrink-0 bg-border sm:w-6" aria-hidden />
              ) : null}
            </li>
          ))}
        </ol>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <NavButton station={prev} direction="prev" />
        <NavButton station={next} direction="next" />
        {trailing}
      </div>
    </div>
  );
}

function StationChip({ station }: { station: ThreadStation }) {
  const tone = station.tone;
  const isPending = tone === "pending";
  const dotClass = tone === "pending" ? "bg-muted-foreground/40" : TONE_STYLES[tone].dot;
  const badgeClass =
    tone === "pending" ? "border-border text-muted-foreground" : TONE_STYLES[tone].badge;

  const clickable = !!station.record?.href && !station.isCurrent;

  const body = (
    <div
      className={cn(
        "flex min-w-[6.5rem] flex-col gap-0.5 rounded-xl border px-3 py-1.5 transition-colors",
        station.isCurrent
          ? "border-blue-500/40 bg-blue-500/10 ring-2 ring-blue-500/40"
          : isPending
            ? "border-dashed border-border bg-transparent"
            : "border-border bg-card/60",
        clickable && "hover:bg-accent/50"
      )}
    >
      <div className="flex items-center gap-1.5">
        <StationDot tone={tone} dotClass={dotClass} />
        <span
          className={cn(
            "text-xs font-medium",
            isPending && !station.isCurrent ? "text-muted-foreground" : "text-foreground"
          )}
        >
          {station.label}
        </span>
        {station.isCurrent && station.record ? (
          <span
            className={cn(
              "ml-auto rounded-full border px-1.5 py-px text-[9px] font-medium uppercase tracking-wide",
              badgeClass
            )}
          >
            {station.record.status.toLowerCase().replace(/_/g, " ")}
          </span>
        ) : null}
      </div>
      {station.record ? (
        <span className="truncate text-[10px] text-muted-foreground">{station.record.number}</span>
      ) : null}
      {station.siblingNote ? (
        <span className="truncate text-[9px] text-muted-foreground/70">{station.siblingNote}</span>
      ) : null}
    </div>
  );

  if (clickable && station.record?.href) {
    return (
      <Link href={station.record.href} title={station.record.title} className="block">
        {body}
      </Link>
    );
  }
  return body;
}

function StationDot({
  tone,
  dotClass,
}: {
  tone: ThreadStation["tone"];
  dotClass: string;
}) {
  if (tone === "completed") {
    return (
      <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 text-white">
        <Check className="h-2.5 w-2.5" strokeWidth={3} />
      </span>
    );
  }
  if (tone === "cancelled") {
    return (
      <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-destructive text-destructive-foreground">
        <X className="h-2.5 w-2.5" strokeWidth={3} />
      </span>
    );
  }
  return <span className={cn("h-2.5 w-2.5 rounded-full", dotClass)} aria-hidden />;
}

function NavButton({
  station,
  direction,
}: {
  station: ThreadStation | null;
  direction: "prev" | "next";
}) {
  const label = direction === "prev" ? "Previous stage" : "Next stage";
  const icon =
    direction === "prev" ? (
      <ChevronLeft className="h-4 w-4" />
    ) : (
      <ChevronRight className="h-4 w-4" />
    );

  if (!station?.record?.href) {
    return (
      <Button variant="outline" size="icon" className="h-8 w-8" disabled aria-label={label}>
        {icon}
      </Button>
    );
  }
  return (
    <Button variant="outline" size="icon" className="h-8 w-8" asChild aria-label={label}>
      <Link href={station.record.href} title={`${label}: ${station.record.number}`}>
        {icon}
      </Link>
    </Button>
  );
}

/* --------------------- cancelled banner + cancel action ------------------ */

function CancelledBanner({
  entity,
  cancelInfo,
  canReopen,
}: {
  entity: LifecycleHeaderEntity;
  cancelInfo: CancelInfo;
  canReopen: boolean;
}) {
  const when = cancelInfo?.at ? formatDate(cancelInfo.at) : null;
  const who = cancelInfo?.by ?? "someone";
  const reason = cancelInfo?.reason;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between">
      <p className="min-w-0">
        <span className="font-medium">Cancelled</span>
        {when ? ` ${when}` : ""} by {who}
        {reason ? ` — ${reason}` : ""}. This record is read-only.
      </p>
      <div className="shrink-0">
        {canReopen ? (
          <ReopenButton entity={{ type: entity.type as CancelableEntity, id: entity.id }} />
        ) : (
          <span className="text-xs text-destructive/80">
            Ask someone with reopen access (e.g. your Sales Head or an admin).
          </span>
        )}
      </div>
    </div>
  );
}

function ReopenButton({ entity }: { entity: { type: CancelableEntity; id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function reopen() {
    setLoading(true);
    try {
      const res = await fetch("/api/lifecycle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reopen", entityType: entity.type, id: entity.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Failed to reopen");
        return;
      }
      toast.success("Record reopened");
      router.refresh();
    } catch {
      toast.error("Failed to reopen");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button size="sm" variant="outline" onClick={reopen} disabled={loading}>
      {loading ? "Reopening…" : "Reopen"}
    </Button>
  );
}

function CancelDialog({
  entity,
  recordNumber,
}: {
  entity: { type: CancelableEntity; id: string };
  recordNumber: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const valid = reason.trim().length >= 3;

  async function submit() {
    if (!valid) return;
    setLoading(true);
    try {
      const res = await fetch("/api/lifecycle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "cancel",
          entityType: entity.type,
          id: entity.id,
          reason: reason.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Failed to cancel");
        return;
      }
      toast.success("Record cancelled");
      setOpen(false);
      setReason("");
      router.refresh();
    } catch {
      toast.error("Failed to cancel");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={() => setOpen(true)}
      >
        <X className="h-4 w-4" /> Cancel
      </Button>
      <Dialog open={open} onOpenChange={(o) => (loading ? null : setOpen(o))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel {recordNumber}</DialogTitle>
            <DialogDescription>
              This marks the record as cancelled and read-only. Provide a reason (required).
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for cancellation…"
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Keep record
            </Button>
            <Button variant="destructive" onClick={submit} disabled={!valid || loading}>
              {loading ? "Cancelling…" : "Confirm cancel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
