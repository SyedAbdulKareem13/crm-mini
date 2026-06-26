"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { WandSparkles, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";

const EXAMPLES = [
  "3-month Salesforce CRM implementation for a healthcare provider; 1 PM, 2 Developers, 1 QA; Fixed Price.",
  "6-month SAP S/4HANA rollout for a Dubai real-estate group; 1 PM, 2 Functional Consultants, 1 Basis Consultant; T&M.",
  "12-month data engineering engagement for a Fortune 500 retail client; 1 Tech Lead, 3 Data Engineers, 1 QA; T&M.",
  "8-month cloud migration project for an insurance company; 1 Cloud Architect, 3 DevOps Engineers, 1 Project Manager; Fixed Price.",
  "1-year application maintenance for an e-commerce platform; 1 Delivery Lead, 4 Full Stack Developers, 2 QA Engineers; Managed Services.",
];

export function DraftWithAiButton() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [prompt, setPrompt] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function generate() {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/ai/create-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Could not draft the quotation.");
        return;
      }
      toast.success(`Created ${data.quotationNumber}`);
      setOpen(false);
      setPrompt("");
      router.push(`/app/quotations/${data.id}`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <WandSparkles className="h-4 w-4 text-primary" /> Draft with AI
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-[hsl(var(--chart-1))/.3] to-[hsl(var(--chart-5))/.3] text-primary">
              <Sparkles className="h-4 w-4" />
            </span>
            Draft a quotation with AI
          </DialogTitle>
          <DialogDescription>
            Describe the engagement in plain English. Manzil AI builds the team, line items, pricing &amp; margin — then creates the quotation.
          </DialogDescription>
        </DialogHeader>

        <Textarea
          autoFocus
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          placeholder="e.g. 3-month Salesforce CRM implementation for a healthcare provider; 1 PM, 2 Developers, 1 QA; Fixed Price."
          className="resize-y"
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") generate();
          }}
        />

        <div>
          <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">Try one</div>
          <div className="flex flex-col gap-1.5">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setPrompt(ex)}
                className="rounded-lg border bg-background/50 px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>Cancel</Button>
          <Button variant="gradient" onClick={generate} disabled={loading || !prompt.trim()} className="gap-2">
            {loading ? (
              <><Sparkles className="h-4 w-4 animate-pulse" /> Drafting…</>
            ) : (
              <>Generate quotation <ArrowRight className="h-4 w-4" /></>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
