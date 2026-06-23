"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OpportunityDialog, type OppForEdit } from "./opportunity-dialog";

export function OpportunityEditButton({
  opportunity,
  customers,
}: {
  opportunity: OppForEdit;
  customers: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Pencil className="h-3.5 w-3.5" /> Edit
      </Button>
      <OpportunityDialog
        open={open}
        onOpenChange={setOpen}
        customers={customers}
        opportunity={opportunity}
      />
    </>
  );
}
