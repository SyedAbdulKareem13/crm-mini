"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { ArrowRight, Filter, Pencil, Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { LeadDialog } from "@/components/leads/lead-dialog";
import { formatRelativeTime, initials } from "@/lib/utils";
import { useI18n } from "@/components/i18n/provider";

type Lead = {
  id: string;
  leadNumber: string;
  name: string;
  company: string;
  contactPerson: string | null;
  email: string | null;
  mobile: string | null;
  source: string;
  industry: string | null;
  status: string;
  notes: string | null;
  expectedRevenue: string | number | null;
  createdAt: string;
  owner: { name: string | null; image: string | null } | null;
};

export function LeadsPageClient({ initialLeads }: { initialLeads: Lead[] }) {
  const router = useRouter();
  const { tx, formatNumber } = useI18n();
  const [leads, setLeads] = useState(initialLeads);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [openDialog, setOpenDialog] = useState(false);
  const [editLead, setEditLead] = useState<Lead | null>(null);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return leads.filter((l) => {
      const matchesStatus = statusFilter === "ALL" || l.status === statusFilter;
      const haystack = `${l.leadNumber} ${l.name} ${l.company} ${l.email ?? ""}`.toLowerCase();
      return matchesStatus && (term === "" || haystack.includes(term));
    });
  }, [leads, q, statusFilter]);

  async function convert(leadId: string) {
    const res = await fetch(`/api/leads/${leadId}/convert`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? tx("leads.convertError", "Failed to convert"));
      return;
    }
    toast.success(tx("leads.convertSuccess", "Converted to opportunity"));
    router.push(`/app/opportunities/${data.opportunity.id}`);
  }

  return (
    <>
      <PageHeader
        title="Leads"
        description="Capture every inbound interest and convert into pipeline-ready opportunities."
        descriptionKey="leads.subtitle"
        actions={
          <Button variant="gradient" onClick={() => setOpenDialog(true)}>
            <Plus className="h-4 w-4" /> {tx("leads.newButton", "New lead")}
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={tx("leads.searchPlaceholder", "Search leads…")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="ps-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
            <Filter className="h-3 w-3" /> {tx("filters.statusLabel", "Status:")}
          </span>
          {["ALL", "NEW", "CONTACTED", "QUALIFIED", "CONVERTED", "LOST"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                statusFilter === s
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {s.toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={tx("leads.emptyTitle", "No leads yet")}
          description={tx("leads.emptyDesc", "Capture your first lead — its activities, notes and documents will carry forward when you convert it.")}
          action={
            <Button variant="gradient" onClick={() => setOpenDialog(true)}>
              <Plus className="h-4 w-4" /> {tx("leads.createFirst", "Create your first lead")}
            </Button>
          }
        />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="luxury-card overflow-hidden"
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tx("table.col.lead", "Lead")}</TableHead>
                <TableHead>{tx("table.col.company", "Company")}</TableHead>
                <TableHead>{tx("table.col.source", "Source")}</TableHead>
                <TableHead>{tx("table.col.owner", "Owner")}</TableHead>
                <TableHead>{tx("table.col.status", "Status")}</TableHead>
                <TableHead className="text-end">{tx("table.col.expected", "Expected")}</TableHead>
                <TableHead>{tx("table.col.added", "Added")}</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((lead) => (
                <TableRow key={lead.id} className="group">
                  <TableCell>
                    <Link href={`/app/leads/${lead.id}`} className="block">
                      <div className="font-medium">{lead.name}</div>
                      <div className="text-xs text-muted-foreground">{lead.leadNumber} · {lead.email ?? lead.mobile ?? "—"}</div>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{lead.company}</div>
                    <div className="text-xs text-muted-foreground">{lead.industry ?? "—"}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {lead.source.toLowerCase().replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        {lead.owner?.image ? <AvatarImage src={lead.owner.image} alt="" /> : null}
                        <AvatarFallback className="text-[10px]">
                          {initials(lead.owner?.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{lead.owner?.name ?? tx("common.unassigned", "Unassigned")}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge entity="LEAD" status={lead.status} />
                  </TableCell>
                  <TableCell className="text-end font-medium">
                    {formatNumber(lead.expectedRevenue ? Number(lead.expectedRevenue) : 0, {
                      style: "currency",
                      currency: "INR",
                      notation: "compact",
                      maximumFractionDigits: 1,
                    })}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatRelativeTime(lead.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setEditLead(lead)} aria-label={tx("leads.editAria", "Edit lead")}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {lead.status !== "CONVERTED" ? (
                        <Button size="sm" variant="ghost" onClick={() => convert(lead.id)}>
                          {tx("leads.convert", "Convert")} <ArrowRight className="h-3.5 w-3.5 rtl:-scale-x-100" />
                        </Button>
                      ) : (
                        <Badge variant="success">{tx("leads.converted", "Converted")}</Badge>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </motion.div>
      )}

      <LeadDialog
        open={openDialog}
        onOpenChange={setOpenDialog}
        onCreated={(lead) => setLeads((prev) => [lead, ...prev])}
      />
      {editLead ? (
        <LeadDialog
          open={!!editLead}
          onOpenChange={(v) => !v && setEditLead(null)}
          lead={editLead}
          onSaved={(updated) => {
            setLeads((prev) => prev.map((l) => (l.id === updated.id ? { ...l, ...updated } : l)));
            setEditLead(null);
          }}
        />
      ) : null}
    </>
  );
}
