"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { UserPlus, Copy, Check, KeyRound, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Role =
  | "SUPER_USER"
  | "SUPER_ADMIN"
  | "ADMIN"
  | "SALES_OWNER"
  | "SALES_HEAD"
  | "BUSINESS_HEAD"
  | "FINANCE_ANALYST"
  | "FINANCE_HEAD";

const ROLES: { value: Role; label: string }[] = [
  { value: "SALES_OWNER", label: "Sales Owner" },
  { value: "SALES_HEAD", label: "Sales Head" },
  { value: "BUSINESS_HEAD", label: "Business Head" },
  { value: "FINANCE_ANALYST", label: "Finance Analyst" },
  { value: "FINANCE_HEAD", label: "Finance Head" },
  { value: "ADMIN", label: "Admin" },
  { value: "SUPER_USER", label: "Super User" },
  { value: "SUPER_ADMIN", label: "Super Admin" },
];

export function OnboardEmployee({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("SALES_OWNER");
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [createdEmail, setCreatedEmail] = useState<string>("");
  const [copied, setCopied] = useState(false);

  function reset() {
    setName("");
    setEmail("");
    setRole("SALES_OWNER");
    setTempPassword(null);
    setCreatedEmail("");
    setCopied(false);
  }

  function onOpenChange(v: boolean) {
    if (!v) {
      // If we created someone, refresh the list as the dialog closes.
      if (tempPassword) onCreated();
      reset();
    }
    setOpen(v);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Failed to onboard employee");
        return;
      }
      setCreatedEmail(data.user?.email ?? email);
      setTempPassword(data.tempPassword as string);
      toast.success("Employee onboarded");
    } finally {
      setSaving(false);
    }
  }

  async function copy() {
    if (!tempPassword) return;
    try {
      await navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy — select and copy manually");
    }
  }

  return (
    <>
      <Button size="sm" variant="gradient" onClick={() => setOpen(true)}>
        <UserPlus className="h-4 w-4" /> Onboard employee
      </Button>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          {tempPassword ? (
            <>
              <DialogHeader>
                <DialogTitle>Employee created</DialogTitle>
                <DialogDescription>
                  {createdEmail} can now sign in with this temporary password.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Temporary password</Label>
                  <div className="mt-1.5 flex items-center gap-2">
                    <code className="flex-1 select-all break-all rounded-lg border bg-muted px-3 py-2 font-mono text-sm">
                      {tempPassword}
                    </code>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={copy}
                      aria-label="Copy password"
                    >
                      {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <p className="flex items-start gap-2 text-sm text-muted-foreground">
                  <KeyRound className="mt-0.5 h-4 w-4 shrink-0" />
                  Share this securely — it is shown only once. They must change it on first sign-in.
                </p>
              </div>
              <DialogFooter>
                <Button variant="gradient" onClick={() => onOpenChange(false)}>
                  Done
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Onboard employee</DialogTitle>
                <DialogDescription>
                  Create an account. A one-time password is generated for their first sign-in.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={submit} className="grid gap-3">
                <div>
                  <Label htmlFor="onboard-name">Full name</Label>
                  <Input
                    id="onboard-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    minLength={2}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="onboard-email">Email</Label>
                  <Input
                    id="onboard-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="onboard-role">Role</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                    <SelectTrigger id="onboard-role" className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button variant="gradient" type="submit" disabled={saving}>
                    {saving ? "Creating…" : "Create account"}
                  </Button>
                </DialogFooter>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Fixed top banner shown app-wide while the signed-in user still has a
 * mustChangePassword flag. Server layout can't read the pathname, so this
 * renders on every page until they set their own password (which clears the
 * flag). Exported here to avoid creating an extra file.
 */
export function MustChangePasswordBanner() {
  return (
    <div className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-warning px-4 py-2 text-center text-sm font-medium text-warning-foreground">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span>Set your own password to continue.</span>
      <Link href="/app/settings" className="underline underline-offset-2 hover:opacity-80">
        Go to security settings
      </Link>
    </div>
  );
}
