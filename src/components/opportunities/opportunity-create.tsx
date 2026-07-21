"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n/provider";
import { OpportunityDialog } from "./opportunity-dialog";

export function OpportunityCreate({ customers }: { customers: { id: string; name: string }[] }) {
  const { tx } = useI18n();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);

  // Auto-open when navigated to with ?new=1 (dashboard / command palette / "New" links)
  useEffect(() => {
    if (params.get("new") === "1") setOpen(true);
  }, [params]);

  return (
    <>
      <Button variant="gradient" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> {tx("common.new", "New")}
      </Button>
      <OpportunityDialog open={open} onOpenChange={setOpen} customers={customers} />
    </>
  );
}
