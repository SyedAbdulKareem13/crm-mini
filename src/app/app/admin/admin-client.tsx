"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, GripVertical, Save, Sparkles, Check } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials, formatDate } from "@/lib/utils";
import { ConfigurationManager } from "./configuration-manager";

type Role =
  | "ADMIN"
  | "SALES_EXEC"
  | "SALES_MANAGER"
  | "BUSINESS_HEAD"
  | "FINANCE"
  | "REVENUE_OWNER"
  | "VIEWER";

const ROLES: { value: Role; label: string }[] = [
  { value: "ADMIN", label: "Admin" },
  { value: "SALES_EXEC", label: "Sales Executive" },
  { value: "SALES_MANAGER", label: "Sales Manager" },
  { value: "BUSINESS_HEAD", label: "Business Head" },
  { value: "FINANCE", label: "Finance" },
  { value: "REVENUE_OWNER", label: "Revenue Owner" },
  { value: "VIEWER", label: "Viewer" },
];

const roleLabel = (r: string) => ROLES.find((x) => x.value === r)?.label ?? r;

type AdminUser = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: Role;
  isActive: boolean;
  lastLoginAt: string | Date | null;
};
type Territory = { id: string; name: string; region: string | null };
type BusinessUnit = { id: string; name: string; code: string | null };
type ChainStep = { id?: string; label: string; roleRequired: Role };
type Chain = { id: string; name: string; appliesTo: string; steps: ChainStep[] };
type HeroVersion = "v1" | "v2";

export function AdminClient({
  users,
  territories,
  businessUnits,
  chain,
  heroVersion,
  readOnly = false,
}: {
  users: AdminUser[];
  territories: Territory[];
  businessUnits: BusinessUnit[];
  chain: Chain | null;
  heroVersion: HeroVersion;
  readOnly?: boolean;
}) {
  const router = useRouter();

  return (
    <Tabs defaultValue="users">
      <TabsList>
        <TabsTrigger value="users">Users</TabsTrigger>
        <TabsTrigger value="territories">Territories</TabsTrigger>
        <TabsTrigger value="bus">Business units</TabsTrigger>
        <TabsTrigger value="chain">Approval chain</TabsTrigger>
        <TabsTrigger value="config">Configuration</TabsTrigger>
        <TabsTrigger value="landing">Landing</TabsTrigger>
      </TabsList>

      <TabsContent value="users">
        <UsersTab users={users} readOnly={readOnly} onChanged={() => router.refresh()} />
      </TabsContent>
      <TabsContent value="territories">
        <TerritoriesTab territories={territories} readOnly={readOnly} onChanged={() => router.refresh()} />
      </TabsContent>
      <TabsContent value="bus">
        <BusinessUnitsTab businessUnits={businessUnits} readOnly={readOnly} onChanged={() => router.refresh()} />
      </TabsContent>
      <TabsContent value="chain">
        <ApprovalChainTab chain={chain} readOnly={readOnly} onChanged={() => router.refresh()} />
      </TabsContent>
      <TabsContent value="config">
        <ConfigurationManager />
      </TabsContent>
      <TabsContent value="landing">
        <LandingTab heroVersion={heroVersion} readOnly={readOnly} onChanged={() => router.refresh()} />
      </TabsContent>
    </Tabs>
  );
}

/* ----------------------------- Landing ------------------------------ */

function LandingTab({
  heroVersion,
  readOnly,
  onChanged,
}: {
  heroVersion: HeroVersion;
  readOnly: boolean;
  onChanged: () => void;
}) {
  const [current, setCurrent] = useState<HeroVersion>(heroVersion);
  const [saving, setSaving] = useState<HeroVersion | null>(null);

  const options: {
    value: HeroVersion;
    title: string;
    sub: string;
    points: string[];
  }[] = [
    {
      value: "v1",
      title: "v1 · Classic",
      sub: "The current refined landing",
      points: ["Static gradient mesh + grid", "Live metrics strip", "Minimal, fast, calm"],
    },
    {
      value: "v2",
      title: "v2 · Immersive",
      sub: "WebGL destination hero",
      points: ["3D beacon + traveling deals", "Drag-to-win interaction", "Particle stream + confetti"],
    },
  ];

  async function choose(v: HeroVersion) {
    if (readOnly || v === current) return;
    setSaving(v);
    try {
      const res = await fetch("/api/admin/app-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ heroVersion: v }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(data.error ?? "Failed to update");
      setCurrent(data.heroVersion as HeroVersion);
      toast.success(`Landing hero set to ${v.toUpperCase()}`);
      onChanged();
    } finally {
      setSaving(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Landing hero</CardTitle>
        <CardDescription>
          Choose which hero the public landing page (/) shows. Applies to every visitor.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          {options.map((o) => {
            const active = current === o.value;
            return (
              <button
                key={o.value}
                type="button"
                disabled={readOnly || saving !== null}
                onClick={() => choose(o.value)}
                className={`group relative rounded-2xl border p-5 text-left transition-all ${
                  active
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "hover:border-foreground/20 hover:bg-accent/40"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className={`h-4 w-4 ${active ? "text-primary" : "text-muted-foreground"}`} />
                    <span className="font-semibold">{o.title}</span>
                  </div>
                  {active ? (
                    <Badge variant="success" className="gap-1">
                      <Check className="h-3 w-3" /> Live
                    </Badge>
                  ) : saving === o.value ? (
                    <Badge variant="soft">Saving…</Badge>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{o.sub}</p>
                <ul className="mt-3 space-y-1.5">
                  {o.points.map((p) => (
                    <li key={p} className="flex items-center gap-2 text-sm">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary/60" />
                      {p}
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>
        {readOnly ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Only administrators can switch the landing hero.
          </p>
        ) : (
          <p className="mt-4 text-xs text-muted-foreground">
            Tip: this is stored in Supabase (<code className="font-mono">AppConfig.heroVersion</code>) and can
            also be flipped directly from the Supabase table editor.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------- Users ------------------------------- */

function UsersTab({
  users,
  readOnly,
  onChanged,
}: {
  users: AdminUser[];
  readOnly: boolean;
  onChanged: () => void;
}) {
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function patch(id: string, payload: { role?: Role; isActive?: boolean }) {
    setPendingId(id);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...payload }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(data.error ?? "Failed to update user");
      toast.success("User updated");
      onChanged();
    } finally {
      setPendingId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Users</CardTitle>
        <CardDescription>{users.length} users in your organization</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Active</TableHead>
              <TableHead>Last login</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id} data-pending={pendingId === u.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      {u.image ? <AvatarImage src={u.image} alt="" /> : null}
                      <AvatarFallback className="text-[10px]">{initials(u.name)}</AvatarFallback>
                    </Avatar>
                    <span>{u.name ?? "—"}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{u.email}</TableCell>
                <TableCell>
                  {readOnly ? (
                    <Badge variant="soft">{roleLabel(u.role)}</Badge>
                  ) : (
                    <Select
                      value={u.role}
                      disabled={pendingId === u.id}
                      onValueChange={(v) => patch(u.id, { role: v as Role })}
                    >
                      <SelectTrigger className="h-8 w-[170px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </TableCell>
                <TableCell>
                  {readOnly ? (
                    <Badge variant={u.isActive ? "success" : "secondary"}>
                      {u.isActive ? "active" : "inactive"}
                    </Badge>
                  ) : (
                    <Switch
                      checked={u.isActive}
                      disabled={pendingId === u.id}
                      onCheckedChange={(v) => patch(u.id, { isActive: v })}
                      aria-label="Toggle active"
                    />
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(u.lastLoginAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/* ---------------------------- Territories ---------------------------- */

function TerritoriesTab({
  territories,
  readOnly,
  onChanged,
}: {
  territories: Territory[];
  readOnly: boolean;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function add(form: FormData) {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/territories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(form.entries())),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(data.error ?? "Failed");
      toast.success("Territory added");
      setOpen(false);
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    const res = await fetch("/api/admin/territories", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return toast.error(data.error ?? "Failed");
    }
    toast.success("Territory removed");
    onChanged();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Territories</CardTitle>
          <CardDescription>{territories.length} territories</CardDescription>
        </div>
        {!readOnly && (
          <Button size="sm" variant="gradient" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {territories.length === 0 ? (
          <EmptyState title="No territories" description="Add sales territories to assign leads and opportunities." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Region</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {territories.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell>{t.region ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    {!readOnly && (
                      <Button size="icon" variant="ghost" onClick={() => remove(t.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={(v) => !v && setOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New territory</DialogTitle>
            <DialogDescription>Group leads and opportunities by geography.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              add(new FormData(e.currentTarget));
            }}
            className="grid gap-3"
          >
            <div>
              <Label htmlFor="t-name">Name</Label>
              <Input id="t-name" name="name" required className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="t-region">Region</Label>
              <Input id="t-region" name="region" className="mt-1.5" />
            </div>
            <DialogFooter>
              <Button variant="gradient" type="submit" disabled={saving}>Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/* -------------------------- Business units --------------------------- */

function BusinessUnitsTab({
  businessUnits,
  readOnly,
  onChanged,
}: {
  businessUnits: BusinessUnit[];
  readOnly: boolean;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function add(form: FormData) {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/business-units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(form.entries())),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(data.error ?? "Failed");
      toast.success("Business unit added");
      setOpen(false);
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    const res = await fetch("/api/admin/business-units", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return toast.error(data.error ?? "Failed");
    }
    toast.success("Business unit removed");
    onChanged();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Business units</CardTitle>
          <CardDescription>{businessUnits.length} business units</CardDescription>
        </div>
        {!readOnly && (
          <Button size="sm" variant="gradient" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {businessUnits.length === 0 ? (
          <EmptyState title="No business units" description="Define the practices or divisions opportunities roll up to." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {businessUnits.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.name}</TableCell>
                  <TableCell>{b.code ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    {!readOnly && (
                      <Button size="icon" variant="ghost" onClick={() => remove(b.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={(v) => !v && setOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New business unit</DialogTitle>
            <DialogDescription>e.g. SAP Practice, Cloud, Analytics.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              add(new FormData(e.currentTarget));
            }}
            className="grid gap-3"
          >
            <div>
              <Label htmlFor="b-name">Name</Label>
              <Input id="b-name" name="name" required className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="b-code">Code</Label>
              <Input id="b-code" name="code" className="mt-1.5" />
            </div>
            <DialogFooter>
              <Button variant="gradient" type="submit" disabled={saving}>Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/* -------------------------- Approval chain --------------------------- */

function ApprovalChainTab({
  chain,
  readOnly,
  onChanged,
}: {
  chain: Chain | null;
  readOnly: boolean;
  onChanged: () => void;
}) {
  const [name, setName] = useState(chain?.name ?? "Default Quotation Approval");
  const [steps, setSteps] = useState<ChainStep[]>(
    chain?.steps.map((s) => ({ label: s.label, roleRequired: s.roleRequired })) ?? []
  );
  const [isPending, startTransition] = useTransition();

  function updateStep(i: number, patch: Partial<ChainStep>) {
    setSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }
  function addStep() {
    setSteps((prev) => [...prev, { label: "", roleRequired: "SALES_MANAGER" }]);
  }
  function removeStep(i: number) {
    setSteps((prev) => prev.filter((_, idx) => idx !== i));
  }
  function move(i: number, dir: -1 | 1) {
    setSteps((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function save() {
    if (steps.length === 0) return toast.error("Add at least one step");
    if (steps.some((s) => !s.label.trim())) return toast.error("Every step needs a label");
    startTransition(async () => {
      const res = await fetch("/api/admin/approval-chain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: chain?.id,
          name,
          appliesTo: chain?.appliesTo ?? "QUOTATION",
          steps: steps.map((s) => ({ label: s.label.trim(), roleRequired: s.roleRequired })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Failed to save chain");
        return;
      }
      toast.success("Approval chain saved");
      onChanged();
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Approval chain</CardTitle>
          <CardDescription>Ordered approval steps applied to quotations.</CardDescription>
        </div>
        {!readOnly && (
          <Button size="sm" variant="gradient" onClick={save} disabled={isPending}>
            <Save className="h-4 w-4" /> Save
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {!readOnly && (
          <div className="max-w-sm">
            <Label htmlFor="chain-name">Chain name</Label>
            <Input
              id="chain-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5"
            />
          </div>
        )}

        <div className="space-y-2">
          {steps.length === 0 ? (
            <EmptyState title="No steps" description="Add the approvers that must sign off, in order." />
          ) : (
            steps.map((s, i) => (
              <div key={i} className="flex items-center gap-2 rounded-xl border p-2">
                <Badge variant="soft" className="h-6 w-6 justify-center p-0">{i + 1}</Badge>
                {readOnly ? (
                  <>
                    <span className="flex-1 font-medium">{s.label}</span>
                    <Badge variant="outline">{roleLabel(s.roleRequired)}</Badge>
                  </>
                ) : (
                  <>
                    <div className="flex flex-col">
                      <button
                        type="button"
                        aria-label="Move up"
                        className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                        disabled={i === 0}
                        onClick={() => move(i, -1)}
                      >
                        <GripVertical className="h-4 w-4" />
                      </button>
                    </div>
                    <Input
                      value={s.label}
                      placeholder="Step label"
                      onChange={(e) => updateStep(i, { label: e.target.value })}
                      className="flex-1"
                    />
                    <Select
                      value={s.roleRequired}
                      onValueChange={(v) => updateStep(i, { roleRequired: v as Role })}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center">
                      <Button size="icon" variant="ghost" onClick={() => move(i, 1)} disabled={i === steps.length - 1} aria-label="Move down">
                        <GripVertical className="h-4 w-4 rotate-180" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => removeStep(i)} aria-label="Remove step">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        {!readOnly && (
          <Button size="sm" variant="outline" onClick={addStep}>
            <Plus className="h-4 w-4" /> Add step
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
