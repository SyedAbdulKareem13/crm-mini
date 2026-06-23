"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { toast } from "sonner";
import { GripVertical } from "lucide-react";
import { OPP_STAGES } from "@/lib/constants";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, formatCompactCurrency, initials } from "@/lib/utils";

type Opp = {
  id: string;
  oppNumber: string;
  name: string;
  customer: { name: string };
  owner: { name: string | null; image: string | null } | null;
  expectedRevenue: string | number;
  probability: number;
  stage: string;
  stageEnteredAt: string;
  activities: { subject: string; createdAt: string }[];
};

/**
 * Distinct accent hex per stage (kept local to this file by request).
 * qualification slate, discovery blue, requirement cyan, proposal teal,
 * rfq emerald, quotation lime, negotiation amber, mgmt orange,
 * verbal fuchsia, won green, lost rose.
 */
const STAGE_COLOR: Record<string, string> = {
  QUALIFICATION: "#64748b", // slate
  DISCOVERY: "#3b82f6", // blue
  REQUIREMENT_ANALYSIS: "#06b6d4", // cyan
  PROPOSAL_SUBMITTED: "#14b8a6", // teal
  RFQ_RECEIVED: "#10b981", // emerald
  QUOTATION_SENT: "#84cc16", // lime
  NEGOTIATION: "#f59e0b", // amber
  MANAGEMENT_APPROVAL: "#f97316", // orange
  VERBAL_CONFIRMATION: "#d946ef", // fuchsia
  WON: "#22c55e", // green
  LOST: "#f43f5e", // rose
};

const FALLBACK_COLOR = "#64748b";

function hexToRgba(hex: string, alpha: number) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function PipelineBoard({ initialOpportunities }: { initialOpportunities: Opp[] }) {
  const [opps, setOpps] = useState(initialOpportunities);
  const [dragging, setDragging] = useState<string | null>(null);
  const [hoverStage, setHoverStage] = useState<string | null>(null);

  async function moveTo(id: string, stage: string) {
    const target = opps.find((o) => o.id === id);
    if (target && target.stage === stage) return;
    const prev = opps;
    setOpps((cur) =>
      cur.map((o) => (o.id === id ? { ...o, stage, stageEnteredAt: new Date().toISOString() } : o))
    );
    const res = await fetch(`/api/opportunities/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    });
    if (!res.ok) {
      setOpps(prev);
      toast.error("Move failed");
    } else {
      const label = OPP_STAGES.find((s) => s.value === stage)?.label ?? stage;
      toast.success(`Moved to ${label}`);
    }
  }

  return (
    <div className="flex h-[calc(100dvh-13rem)] items-stretch gap-4 overflow-x-auto pb-3 pt-1 scrollbar-thin">
      {OPP_STAGES.map((stage) => {
        const color = STAGE_COLOR[stage.value] ?? FALLBACK_COLOR;
        const items = opps.filter((o) => o.stage === stage.value);
        const totalValue = items.reduce((a, b) => a + Number(b.expectedRevenue), 0);
        const isHover = hoverStage === stage.value;

        return (
          <div
            key={stage.value}
            className={cn(
              "flex h-full w-[304px] shrink-0 flex-col overflow-hidden rounded-2xl border bg-card/70 shadow-sm transition-all duration-200",
              isHover && "shadow-md"
            )}
            style={
              isHover
                ? {
                    borderColor: hexToRgba(color, 0.55),
                    boxShadow: `0 0 0 3px ${hexToRgba(color, 0.16)}, 0 12px 28px -12px ${hexToRgba(color, 0.35)}`,
                  }
                : undefined
            }
            onDragOver={(e) => {
              e.preventDefault();
              setHoverStage((s) => (s === stage.value ? s : stage.value));
            }}
            onDragLeave={(e) => {
              // Only clear when leaving the column entirely, not when moving over children.
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                setHoverStage((s) => (s === stage.value ? null : s));
              }
            }}
            onDrop={() => {
              if (dragging) {
                moveTo(dragging, stage.value);
                setDragging(null);
                setHoverStage(null);
              }
            }}
          >
            {/* Colored top accent bar */}
            <div className="h-1 w-full shrink-0" style={{ backgroundColor: color }} />

            {/* Sticky header */}
            <div
              className="sticky top-0 z-10 border-b bg-card/85 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-card/70"
              style={{ borderColor: hexToRgba(color, 0.18) }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{
                      backgroundColor: color,
                      boxShadow: `0 0 0 3px ${hexToRgba(color, 0.22)}`,
                    }}
                  />
                  <span className="truncate text-[11px] font-bold uppercase tracking-[0.08em] text-foreground">
                    {stage.label}
                  </span>
                  <span
                    className="ml-0.5 shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold tabular-nums"
                    style={{
                      color,
                      borderColor: hexToRgba(color, 0.3),
                      backgroundColor: hexToRgba(color, 0.08),
                    }}
                  >
                    {items.length}
                  </span>
                </div>
                <span className="shrink-0 text-[10px] font-medium text-muted-foreground">
                  {stage.probability}%
                </span>
              </div>
              <div className="mt-1.5 text-[13px] font-semibold tabular-nums text-foreground/90">
                {formatCompactCurrency(totalValue)}
              </div>
            </div>

            {/* Cards */}
            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2.5 scrollbar-thin">
              <AnimatePresence>
                {items.map((o) => {
                  const ageDays = Math.max(
                    0,
                    Math.floor((Date.now() - new Date(o.stageEnteredAt).getTime()) / 86400000)
                  );
                  return (
                    <motion.div
                      key={o.id}
                      layout="position"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      draggable
                      onDragStart={() => setDragging(o.id)}
                      onDragEnd={() => {
                        setDragging(null);
                        setHoverStage(null);
                      }}
                      className={cn(
                        "group relative cursor-grab overflow-hidden rounded-xl border bg-background pl-3.5 pr-3 py-3 shadow-sm transition-[transform,box-shadow] duration-200 will-change-transform hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing",
                        dragging === o.id && "opacity-40"
                      )}
                    >
                      {/* Left color stripe */}
                      <span
                        className="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-r"
                        style={{ backgroundColor: color }}
                      />

                      <div className="flex items-start gap-2">
                        <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/app/opportunities/${o.id}`}
                            className="block truncate text-sm font-semibold leading-tight hover:underline"
                          >
                            {o.name}
                          </Link>
                          <div className="mt-0.5 truncate text-xs text-muted-foreground">
                            {o.customer.name} · {o.oppNumber}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-2 border-t border-dashed pt-2.5">
                        <div className="flex items-center gap-2 text-[10px] font-medium tabular-nums text-muted-foreground">
                          <span
                            className="rounded px-1.5 py-0.5"
                            style={{ backgroundColor: hexToRgba(color, 0.1), color }}
                          >
                            {o.probability}%
                          </span>
                          <span>{ageDays}d in stage</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold tabular-nums text-foreground">
                            {formatCompactCurrency(Number(o.expectedRevenue))}
                          </span>
                          <Avatar className="h-6 w-6">
                            {o.owner?.image ? <AvatarImage src={o.owner.image} alt="" /> : null}
                            <AvatarFallback className="text-[10px]">
                              {initials(o.owner?.name)}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {items.length === 0 ? (
                <div
                  className="flex flex-1 items-center justify-center rounded-xl border border-dashed py-8 text-center text-xs text-muted-foreground transition-colors"
                  style={isHover ? { borderColor: hexToRgba(color, 0.5), color } : undefined}
                >
                  Drop a deal here
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
