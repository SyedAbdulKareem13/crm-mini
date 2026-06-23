"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomerDialog } from "./customer-dialog";

export function CustomerCreate() {
  const params = useSearchParams();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (params.get("new") === "1") setOpen(true);
  }, [params]);

  return (
    <>
      <Button variant="gradient" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> New customer
      </Button>
      <CustomerDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
