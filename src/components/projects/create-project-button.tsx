"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FolderKanban, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Methodology = { id: string; name: string; key: string; active: boolean };
type TransformationType = {
  id: string;
  name: string;
  subtitle: string | null;
  active: boolean;
  methodology: { id: string; name: string; key: string } | null;
};

/**
 * Opportunity → Project conversion. Picks a transformation type from the
 * configurable SAP catalog; the type's default methodology pre-selects the
 * roadmap (still overridable). Creating instantiates the full roadmap.
 */
export function CreateProjectButton({
  opportunityId,
  opportunityName,
  project,
}: {
  opportunityId: string;
  opportunityName: string;
  project: { id: string; projectNumber: string } | null;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [name, setName] = React.useState(`${opportunityName} — Implementation`);
  const [types, setTypes] = React.useState<TransformationType[]>([]);
  const [methodologies, setMethodologies] = React.useState<Methodology[]>([]);
  const [typeId, setTypeId] = React.useState<string>("");
  const [methodologyId, setMethodologyId] = React.useState<string>("");
  const [startDate, setStartDate] = React.useState<string>("");

  React.useEffect(() => {
    if (!open) return;
    let alive = true;
    fetch("/api/admin/sap-config")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!alive || !data) return;
        const activeTypes = (data.transformationTypes as TransformationType[]).filter((t) => t.active);
        const activeMeth = (data.methodologies as Methodology[]).filter((m) => m.active);
        setTypes(activeTypes);
        setMethodologies(activeMeth);
        if (!methodologyId && activeMeth.length) setMethodologyId(activeMeth[0].id);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function pickType(id: string) {
    setTypeId(id);
    const t = types.find((x) => x.id === id);
    if (t?.methodology) setMethodologyId(t.methodology.id);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error("Give the project a name");
    if (!methodologyId) return toast.error("Pick a methodology");
    setLoading(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          opportunityId,
          transformationTypeId: typeId || undefined,
          methodologyId,
          startDate: startDate || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create project");
      toast.success(`Project ${data.project.projectNumber} created`);
      setOpen(false);
      router.push(`/app/projects/${data.project.id}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (project) {
    return (
      <Link href={`/app/projects/${project.id}`}>
        <Button variant="outline" size="sm">
          <FolderKanban className="h-4 w-4" />
          {project.projectNumber}
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </Link>
    );
  }

  return (
    <>
      <Button variant="gradient" size="sm" onClick={() => setOpen(true)}>
        <FolderKanban className="h-4 w-4" /> Create project
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create project from opportunity</DialogTitle>
            <DialogDescription>
              Pick the SAP transformation — the matching Activate roadmap (phases &amp; deliverables) is
              instantiated onto the project.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label htmlFor="project-name">
                Project name<span className="text-destructive"> *</span>
              </Label>
              <Input
                id="project-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5"
                autoComplete="off"
              />
            </div>
            <div>
              <Label>SAP transformation type</Label>
              <Select value={typeId} onValueChange={pickType}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder={types.length ? "Select transformation" : "Loading catalog…"} />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {types.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                      {t.subtitle ? ` — ${t.subtitle}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>
                Methodology / roadmap<span className="text-destructive"> *</span>
              </Label>
              <Select value={methodologyId} onValueChange={setMethodologyId}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select methodology" />
                </SelectTrigger>
                <SelectContent>
                  {methodologies.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Start date</Label>
              <div className="mt-1.5">
                <DatePicker value={startDate} onChange={setStartDate} placeholder="(Optional) planned start" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="gradient" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderKanban className="h-4 w-4" />}
                Create project
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
