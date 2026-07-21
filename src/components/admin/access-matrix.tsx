"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, Lock } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Role =
  | "ADMIN"
  | "SALES_EXEC"
  | "SALES_MANAGER"
  | "BUSINESS_HEAD"
  | "FINANCE"
  | "REVENUE_OWNER"
  | "VIEWER";

type PermField =
  | "canRead"
  | "canCreate"
  | "canUpdate"
  | "canDelete"
  | "canCancel"
  | "canReopen"
  | "canApprove";

type ModulePermissions = Record<PermField, boolean>;
type Matrix = Record<string, Record<string, ModulePermissions>>;
type ModuleDef = { key: string; label: string };

const ROLES: { value: Role; label: string }[] = [
  { value: "SALES_EXEC", label: "Sales Executive" },
  { value: "SALES_MANAGER", label: "Sales Manager" },
  { value: "BUSINESS_HEAD", label: "Business Head" },
  { value: "FINANCE", label: "Finance" },
  { value: "REVENUE_OWNER", label: "Revenue Owner" },
  { value: "VIEWER", label: "Viewer" },
  { value: "ADMIN", label: "Admin" },
];

const COLUMNS: { field: PermField; label: string }[] = [
  { field: "canRead", label: "Read" },
  { field: "canCreate", label: "Create" },
  { field: "canUpdate", label: "Update" },
  { field: "canDelete", label: "Delete" },
  { field: "canCancel", label: "Cancel" },
  { field: "canReopen", label: "Reopen" },
  { field: "canApprove", label: "Approve" },
];

export function AccessMatrix() {
  const [matrix, setMatrix] = useState<Matrix | null>(null);
  const [modules, setModules] = useState<ModuleDef[]>([]);
  const [role, setRole] = useState<Role>("SALES_EXEC");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/admin/permissions");
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(data.error ?? "Failed to load permissions");
          return;
        }
        if (!active) return;
        setMatrix(data.matrix as Matrix);
        setModules(data.modules as ModuleDef[]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function toggle(moduleKey: string, field: PermField, value: boolean) {
    if (role === "ADMIN" || !matrix) return;
    const key = `${moduleKey}:${field}`;
    const prev = matrix[role]?.[moduleKey]?.[field];

    // Optimistic update.
    setMatrix((m) => {
      if (!m) return m;
      const next: Matrix = { ...m, [role]: { ...m[role] } };
      next[role][moduleKey] = { ...next[role][moduleKey], [field]: value };
      return next;
    });
    setPending(key);

    try {
      const res = await fetch("/api/admin/permissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, module: moduleKey, field, value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Revert.
        setMatrix((m) => {
          if (!m) return m;
          const next: Matrix = { ...m, [role]: { ...m[role] } };
          next[role][moduleKey] = { ...next[role][moduleKey], [field]: prev ?? false };
          return next;
        });
        toast.error(data.error ?? "Failed to update permission");
      }
    } catch {
      setMatrix((m) => {
        if (!m) return m;
        const next: Matrix = { ...m, [role]: { ...m[role] } };
        next[role][moduleKey] = { ...next[role][moduleKey], [field]: prev ?? false };
        return next;
      });
      toast.error("Failed to update permission");
    } finally {
      setPending(null);
    }
  }

  const isAdminRole = role === "ADMIN";
  const rolePerms = matrix?.[role] ?? {};

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Access matrix
          </CardTitle>
          <CardDescription>
            Per-role permissions across every module. Changes save instantly.
          </CardDescription>
        </div>
        <Select value={role} onValueChange={(v) => setRole(v as Role)}>
          <SelectTrigger className="w-[200px]">
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
      </CardHeader>
      <CardContent>
        {isAdminRole && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
            <Lock className="h-4 w-4 text-primary" />
            <span>
              The Admin role always has full access and can&apos;t be edited — this keeps the
              organization from locking itself out.
            </span>
          </div>
        )}

        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading permissions…</p>
        ) : (
          <div className="min-w-0 overflow-x-auto">
            <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Module</TableHead>
                  {COLUMNS.map((c) => (
                    <TableHead key={c.field} className="text-center">
                      {c.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {modules.map((m) => {
                  const perms = rolePerms[m.key];
                  return (
                    <TableRow key={m.key}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {m.label}
                          {m.key === "ADMIN" && (
                            <Badge variant="soft" className="text-[10px]">
                              sensitive
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      {COLUMNS.map((c) => {
                        const checked = isAdminRole ? true : perms?.[c.field] ?? false;
                        const key = `${m.key}:${c.field}`;
                        return (
                          <TableCell key={c.field} className="text-center">
                            <div className="flex justify-center">
                              <Switch
                                checked={checked}
                                disabled={isAdminRole || pending === key}
                                onCheckedChange={(v) => toggle(m.key, c.field, v)}
                                aria-label={`${m.label} ${c.label}`}
                              />
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
