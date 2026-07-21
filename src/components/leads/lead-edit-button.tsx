"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LeadDialog, type LeadForEdit } from "@/components/leads/lead-dialog";
import { useI18n } from "@/components/i18n/provider";

export function LeadEditButton({ lead }: { lead: LeadForEdit }) {
  const { tx } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Pencil className="h-3.5 w-3.5" /> {tx("common.edit", "Edit")}
      </Button>
      <LeadDialog open={open} onOpenChange={setOpen} lead={lead} />
    </>
  );
}
