"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { toast } from "sonner";
import { GripVertical } from "lucide-react";
import { OPP_STAGES } from "@/lib/constants";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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

export function PipelineBoard({ initialOpportunities }: { initialOpportunities: Opp[] }) {
  const [opps, setOpps] = useState(initialOpportunities);
  const [dragging, setDragging] = useState<string | null>(null);
  const [hoverStage, setHoverStage] = useState<string | null>(null);

  async function moveTo(id: string, stage: string) {
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
      toast.success(`Moved to ${stage.replace("_", " ").toLowerCase()}`);
    }
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-6 pt-1 scrollbar-thin">
        {OPP_STAGES.map((stage) => {
          const items = opps.filter((o) => o.stage === stage.value);
          const totalValue = items.reduce((a, b) => a + Number(b.expectedRevenue), 0);
          const isHover = hoverStage === stage.value;
          return (
            <div
              key={stage.value}
              className={cn(
                "flex w-[300px] shrink-0 flex-col rounded-2xl border bg-card/70 transition-colors",
                isHover && "ring-2 ring-primary/60"
              )}
              onDragOver={(e) => {
                e.preventDefault();
                setHoverStage((s) => (s === stage.value ? s : stage.value));
              }}
              onDragLeave={() => setHoverStage((s) => (s === stage.value ? null : s))}
              onDrop={() => {
                if (dragging) {
                  moveTo(dragging, stage.value);
                  setDragging(null);
                  setHoverStage(null);
                }
              }}
            >
              <div
                className={cn(
                  "flex items-center justify-between rounded-t-2xl bg-gradient-to-r px-4 py-3",
                  stage.tone
                )}
              >
                <div>
                  <div className="text-sm font-semibold">{stage.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {items.length} · {formatCompactCurrency(totalValue)}
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {stage.probability}%
                </Badge>
              </div>

              <div className="flex flex-1 flex-col gap-2 p-3 min-h-[120px]">
                <AnimatePresence>
                  {items.map((o) => {
                    const ageDays = Math.max(
                      0,
                      Math.floor(
                        (Date.now() - new Date(o.stageEnteredAt).getTime()) / 86400000
                      )
                    );
                    return (
                      <motion.div
                        key={o.id}
                        layout="position"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        draggable
                        onDragStart={() => setDragging(o.id)}
                        onDragEnd={() => setDragging(null)}
                        className={cn(
                          "group cursor-grab rounded-xl border bg-background/80 p-3 shadow-sm transition-transform duration-200 will-change-transform hover:-translate-y-0.5 hover:shadow-md",
                          dragging === o.id && "opacity-50"
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <GripVertical className="mt-0.5 h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100" />
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/app/opportunities/${o.id}`}
                              className="block truncate text-sm font-medium hover:underline"
                            >
                              {o.name}
                            </Link>
                            <div className="truncate text-xs text-muted-foreground">
                              {o.customer.name} · {o.oppNumber}
                            </div>
                          </div>
                        </div>

                        <div className="mt-2 flex items-center justify-between">
                          <div className="font-semibold text-sm">
                            {formatCompactCurrency(Number(o.expectedRevenue))}
                          </div>
                          <Avatar className="h-6 w-6">
                            {o.owner?.image ? (
                              <AvatarImage src={o.owner.image} alt="" />
                            ) : null}
                            <AvatarFallback className="text-[10px]">
                              {initials(o.owner?.name)}
                            </AvatarFallback>
                          </Avatar>
                        </div>

                        <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                          <span>{o.probability}% · {ageDays}d in stage</span>
                          {o.activities[0] ? (
                            <span className="truncate max-w-[120px]">
                              {o.activities[0].subject}
                            </span>
                          ) : null}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                {items.length === 0 ? (
                  <div className="rounded-lg border border-dashed py-6 text-center text-xs text-muted-foreground">
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
