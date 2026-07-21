"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, ChevronRight, ShieldCheck, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatRelativeTime } from "@/lib/utils";

type Step = {
  id: string;
  stepNumber: number;
  label: string;
  status: string;
  comments: string | null;
  actedAt: string | null;
};

type Request = {
  id: string;
  status: string;
  currentStep: number;
  steps: Step[];
};

export function ApprovalPanel({
  quotationId,
  status,
  request,
}: {
  quotationId: string;
  status: string;
  request: Request | null;
}) {
  const router = useRouter();
  const [comments, setComments] = useState("");
  const [loading, setLoading] = useState(false);

  async function act(action: "SUBMIT" | "APPROVE" | "REJECT") {
    setLoading(true);
    const res = await fetch(`/api/quotations/${quotationId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, comments }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Failed");
      return;
    }
    toast.success(action === "SUBMIT" ? "Submitted for approval" : action === "APPROVE" ? "Approved" : "Rejected");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" /> Approval workflow
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Approval pipeline — the same path language as the pipeline stepper:
            green = approved, orange = awaiting this step, red = rejected,
            grey = not reached. */}
        <div className="min-w-0 overflow-x-auto pb-1">
          <ol className="flex min-w-max items-start">
            {(request?.steps ?? []).map((step, i) => {
              const approved = step.status === "APPROVED";
              const rejected = step.status === "REJECTED";
              const active =
                !!request && request.status === "PENDING" && step.stepNumber === request.currentStep;
              return (
                <li key={step.id} className="flex items-start">
                  {i > 0 && (
                    <span
                      aria-hidden
                      className={`mt-[13px] h-0.5 w-5 shrink-0 rounded-full ${
                        approved || rejected || active ? "bg-emerald-500/60" : "bg-border"
                      }`}
                    />
                  )}
                  <div className="flex w-[84px] flex-col items-center gap-1.5 px-1 text-center">
                    <span
                      className={`grid h-7 w-7 place-items-center rounded-full text-[11px] font-semibold transition-all ${
                        approved
                          ? "bg-emerald-500 text-white"
                          : rejected
                            ? "bg-destructive text-white"
                            : active
                              ? "bg-orange-500 text-white ring-4 ring-orange-500/20"
                              : "border-2 border-border bg-background text-muted-foreground"
                      }`}
                    >
                      {approved ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : rejected ? (
                        <X className="h-3.5 w-3.5" />
                      ) : (
                        <span className="tabular-nums">{step.stepNumber}</span>
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[11px] font-medium leading-tight">
                        {step.label}
                      </span>
                      <span className="block text-[10px] text-muted-foreground">
                        {approved ? "Approved" : rejected ? "Rejected" : active ? "Awaiting" : "Pending"}
                      </span>
                    </span>
                  </div>
                </li>
              );
            })}
            {/* terminal node */}
            <li className="flex items-start">
              {(request?.steps.length ?? 0) > 0 && (
                <span
                  aria-hidden
                  className={`mt-[13px] h-0.5 w-5 shrink-0 rounded-full ${
                    request?.status === "APPROVED" ? "bg-emerald-500/60" : "bg-border"
                  }`}
                />
              )}
              <div className="flex w-[84px] flex-col items-center gap-1.5 px-1 text-center">
                <span
                  className={`grid h-7 w-7 place-items-center rounded-full transition-all ${
                    request?.status === "APPROVED"
                      ? "bg-emerald-500 text-white"
                      : request?.status === "REJECTED"
                        ? "bg-destructive text-white"
                        : "border-2 border-dashed border-border bg-background text-muted-foreground"
                  }`}
                >
                  {request?.status === "REJECTED" ? (
                    <X className="h-3.5 w-3.5" />
                  ) : (
                    <ShieldCheck className="h-3.5 w-3.5" />
                  )}
                </span>
                <span className="block text-[11px] font-medium leading-tight">
                  {request?.status === "REJECTED" ? "Rejected" : "Approved"}
                </span>
              </div>
            </li>
          </ol>
        </div>
        {!request && (
          <p className="text-xs text-muted-foreground">
            Not yet submitted — the configured approval chain runs once you submit.
          </p>
        )}

        {/* Decision detail — only steps someone has acted on or commented */}
        {request?.steps.some((s) => s.comments || s.actedAt) ? (
          <ul className="space-y-1.5 border-t pt-3">
            {request.steps
              .filter((s) => s.comments || s.actedAt)
              .map((s) => (
                <li key={s.id} className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{s.label}</span>
                  {s.status !== "PENDING" ? ` · ${s.status.toLowerCase()}` : ""}
                  {s.actedAt ? ` · ${formatRelativeTime(s.actedAt)}` : ""}
                  {s.comments ? ` — ${s.comments}` : ""}
                </li>
              ))}
          </ul>
        ) : null}

        {status !== "REJECTED" && request?.status !== "REJECTED" ? (
          <div className="space-y-2">
            <Textarea
              placeholder="Comments (optional)"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="text-sm"
            />
            {!request ? (
              <Button onClick={() => act("SUBMIT")} disabled={loading} className="w-full" variant="gradient">
                Submit for approval <ChevronRight className="h-4 w-4" />
              </Button>
            ) : request.status === "PENDING" ? (
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={() => act("REJECT")} disabled={loading} variant="destructive">
                  Reject
                </Button>
                <Button onClick={() => act("APPROVE")} disabled={loading} variant="gradient">
                  Approve step
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
