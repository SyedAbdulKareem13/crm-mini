"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Filter, Pencil, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { OpportunityDialog, type OppForEdit } from "@/components/opportunities/opportunity-dialog";
import { OPP_STAGES } from "@/lib/constants";
import { cn, formatCompactCurrency, formatDate } from "@/lib/utils";
import { statusTone, TONE_STYLES } from "@/lib/lifecycle-status";
import { useI18n } from "@/components/i18n/provider";
import { stageKey } from "@/lib/i18n/labels";

/** Opportunity-stage pill — mirrors StatusBadge's tone styling but resolves the
 *  label through the `stages` i18n namespace (keyed on the enum value). */
function StageBadge({ stage, label }: { stage: string; label: string }) {
  const styles = TONE_STYLES[statusTone("OPPORTUNITY", stage)];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        styles.badge
      )}
    >
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", styles.dot)} />
      {label}
    </span>
  );
}

type Opp = {
  id: string;
  oppNumber: string;
  name: string;
  customerId: string;
  customer: { name: string };
  owner: { name: string | null } | null;
  expectedRevenue: string | number;
  probability: number;
  stage: string;
  expectedCloseDate: string | null;
  notes: string | null;
};

export function OpportunitiesClient({
  opps,
  customers,
}: {
  opps: Opp[];
  customers: { id: string; name: string }[];
}) {
  const { tx, loadNamespace } = useI18n();
  useEffect(() => {
    loadNamespace("opportunities");
    loadNamespace("filters");
    loadNamespace("table");
    loadNamespace("stages");
  }, [loadNamespace]);

  const [q, setQ] = useState("");
  const [stage, setStage] = useState("ALL");
  const [owner, setOwner] = useState("ALL");
  const [editOpp, setEditOpp] = useState<OppForEdit | null>(null);

  const owners = useMemo(() => {
    const set = new Set<string>();
    opps.forEach((o) => o.owner?.name && set.add(o.owner.name));
    return Array.from(set).sort();
  }, [opps]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return opps.filter((o) => {
      if (stage !== "ALL" && o.stage !== stage) return false;
      if (owner !== "ALL" && (o.owner?.name ?? "") !== owner) return false;
      if (term) {
        const hay = `${o.oppNumber} ${o.name} ${o.customer.name}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [opps, q, stage, owner]);

  return (
    <>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={tx("opportunities.searchPlaceholder", "Search opportunities…")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="ps-9"
          />
        </div>
        <div className="flex flex-1 items-center gap-2">
          <Filter className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" />
          <Select value={stage} onValueChange={setStage}>
            <SelectTrigger className="w-[170px]"><SelectValue placeholder={tx("filters.stage", "Stage")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{tx("filters.allStages", "All stages")}</SelectItem>
              {OPP_STAGES.map((s) => <SelectItem key={s.value} value={s.value}>{tx(stageKey(s.value), s.label)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={owner} onValueChange={setOwner}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder={tx("filters.owner", "Owner")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{tx("filters.allOwners", "All owners")}</SelectItem>
              {owners.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="ms-auto text-xs text-muted-foreground">
            {tx("common.countOf", "{shown} of {total}", { shown: filtered.length, total: opps.length })}
          </span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={tx("opportunities.noMatchTitle", "No matching opportunities")}
          description={tx("opportunities.noMatchDescription", "Adjust the search, stage or owner filters.")}
        />
      ) : (
        <div className="luxury-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tx("table.opportunity", "Opportunity")}</TableHead>
                <TableHead>{tx("table.customer", "Customer")}</TableHead>
                <TableHead>{tx("table.stage", "Stage")}</TableHead>
                <TableHead>{tx("table.owner", "Owner")}</TableHead>
                <TableHead className="text-end">{tx("table.expected", "Expected")}</TableHead>
                <TableHead className="text-end">{tx("table.probability", "Prob.")}</TableHead>
                <TableHead>{tx("table.close", "Close")}</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((o) => (
                <TableRow key={o.id}>
                  <TableCell>
                    <Link href={`/app/opportunities/${o.id}`} className="font-medium hover:underline">{o.name}</Link>
                    <div className="text-xs text-muted-foreground">{o.oppNumber}</div>
                  </TableCell>
                  <TableCell>{o.customer.name}</TableCell>
                  <TableCell>
                    <StageBadge
                      stage={o.stage}
                      label={tx(stageKey(o.stage), OPP_STAGES.find((s) => s.value === o.stage)?.label ?? o.stage)}
                    />
                  </TableCell>
                  <TableCell className="text-sm">{o.owner?.name ?? "—"}</TableCell>
                  <TableCell className="text-end font-medium">{formatCompactCurrency(Number(o.expectedRevenue))}</TableCell>
                  <TableCell className="text-end">{o.probability}%</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(o.expectedCloseDate)}</TableCell>
                  <TableCell className="text-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={tx("opportunities.editAria", "Edit opportunity")}
                      onClick={() =>
                        setEditOpp({
                          id: o.id,
                          name: o.name,
                          customerId: o.customerId,
                          expectedRevenue: o.expectedRevenue,
                          probability: o.probability,
                          expectedCloseDate: o.expectedCloseDate,
                          stage: o.stage,
                          notes: o.notes,
                        })
                      }
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {editOpp ? (
        <OpportunityDialog
          open={!!editOpp}
          onOpenChange={(v) => !v && setEditOpp(null)}
          customers={customers}
          opportunity={editOpp}
          onSaved={() => setEditOpp(null)}
        />
      ) : null}
    </>
  );
}
