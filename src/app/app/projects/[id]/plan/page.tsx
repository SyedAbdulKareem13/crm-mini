import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, FileDown } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PrintButton } from "@/components/print/print-trigger";

export const dynamic = "force-dynamic";

const DAY = 86_400_000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY);
const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

/** Print-optimized project plan (PDF export via the browser's print dialog). */
export default async function ProjectPlanPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.organizationId) redirect("/login");

  const project = await prisma.project.findFirst({
    where: { id, organizationId: session.user.organizationId },
    select: {
      id: true,
      name: true,
      projectNumber: true,
      status: true,
      startDate: true,
      customer: { select: { name: true } },
      methodology: { select: { name: true } },
      organization: { select: { name: true } },
      phases: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          name: true,
          color: true,
          status: true,
          durationWeeks: true,
          startDate: true,
          endDate: true,
          deliverables: {
            orderBy: { position: "asc" },
            select: {
              name: true,
              status: true,
              priority: true,
              progressPct: true,
              estimateHours: true,
              actualHours: true,
              startDate: true,
              endDate: true,
              owner: { select: { name: true } },
            },
          },
        },
      },
    },
  });
  if (!project) notFound();

  // Resolve windows the same way the Gantt derives them.
  let cursor = startOfDay(project.startDate ?? new Date());
  const phases = project.phases.map((phase) => {
    const start = phase.startDate ? startOfDay(phase.startDate) : cursor;
    const endRaw = phase.endDate ? startOfDay(phase.endDate) : addDays(start, Math.max(1, phase.durationWeeks) * 7);
    const end = endRaw <= start ? addDays(start, 7) : endRaw;
    cursor = end;
    const items = phase.deliverables.map((d) => {
      const ds = d.startDate ? startOfDay(d.startDate) : start;
      const deRaw = d.endDate ? startOfDay(d.endDate) : d.startDate ? addDays(ds, 7) : end;
      const de = deRaw < ds ? addDays(ds, 1) : deRaw;
      return { ...d, start: ds, end: de };
    });
    const pct = items.length
      ? Math.round(items.reduce((n, i) => n + (i.status === "DONE" ? 100 : i.progressPct ?? 0), 0) / items.length)
      : 0;
    return { ...phase, start, end, items, pct };
  });

  const t0 = phases[0]?.start.getTime() ?? Date.now();
  const t1 = Math.max(...phases.map((p) => p.end.getTime()), t0 + DAY);
  const span = t1 - t0;
  const pctX = (d: Date) => ((d.getTime() - t0) / span) * 100;

  return (
    <div className="print-root">
      <style>{printCss}</style>
      <div className="no-print toolbar">
        <Link href={`/app/projects/${project.id}`} className="toolbar-back">
          <ArrowLeft className="h-4 w-4" /> Back to project
        </Link>
        <PrintButton className="toolbar-print">
          <FileDown className="h-4 w-4" /> Download / Print PDF
        </PrintButton>
      </div>

      <div className="sheet">
        <header className="head">
          <div>
            <div className="kicker">Project Plan</div>
            <h1 className="title">{project.name}</h1>
            <div className="meta">
              {project.projectNumber} · {project.customer?.name ?? "—"} · {project.methodology?.name ?? "—"} ·{" "}
              {project.status.toLowerCase().replace("_", " ")}
            </div>
          </div>
          <div className="org">{project.organization.name}</div>
        </header>

        {/* Timeline overview */}
        <section className="timeline">
          {phases.map((p) => (
            <div key={p.id} className="tl-row">
              <div className="tl-name">{p.name}</div>
              <div className="tl-track">
                <div
                  className="tl-bar"
                  style={{
                    left: `${pctX(p.start)}%`,
                    width: `${Math.max(1.5, pctX(p.end) - pctX(p.start))}%`,
                    backgroundColor: `${p.color}55`,
                  }}
                >
                  <div className="tl-fill" style={{ width: `${p.pct}%`, backgroundColor: p.color }} />
                </div>
              </div>
              <div className="tl-dates">
                {fmt(p.start)} → {fmt(p.end)} · {p.pct}%
              </div>
            </div>
          ))}
        </section>

        {/* Detail per phase */}
        {phases.map((p) => (
          <section key={p.id} className="phase">
            <h2 className="phase-title">
              <span className="dot" style={{ backgroundColor: p.color }} />
              {p.name}
              <span className="phase-meta">
                {p.durationWeeks}wk · {p.status.toLowerCase().replace("_", " ")} · {p.pct}% complete
              </span>
            </h2>
            {p.items.length === 0 ? (
              <p className="empty">No tasks in this phase.</p>
            ) : (
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Status</th>
                    <th className="r">%</th>
                    <th>Priority</th>
                    <th>Assignee</th>
                    <th>Start</th>
                    <th>End</th>
                    <th className="r">Est. h</th>
                    <th className="r">Act. h</th>
                  </tr>
                </thead>
                <tbody>
                  {p.items.map((t, i) => (
                    <tr key={i}>
                      <td>{t.name}</td>
                      <td className="cap">{t.status.toLowerCase().replace("_", " ")}</td>
                      <td className="r">{t.status === "DONE" ? 100 : t.progressPct ?? 0}</td>
                      <td className="cap">{(t.priority ?? "MEDIUM").toLowerCase()}</td>
                      <td>{t.owner?.name ?? "—"}</td>
                      <td>{fmt(t.start)}</td>
                      <td>{fmt(t.end)}</td>
                      <td className="r">{t.estimateHours ?? "—"}</td>
                      <td className="r">{t.actualHours ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        ))}

        <footer className="foot">
          <span>{project.organization.name}</span>
          <span>{project.projectNumber} · Plan</span>
          <span>Generated {fmt(new Date())}</span>
        </footer>
      </div>
    </div>
  );
}

const printCss = `
  .print-root { --ink:#14151A; --soft:#5b606b; --line:#e3e5ea; background:#f4f5f7; min-height:100vh; color:var(--ink); }
  .print-root * { box-sizing:border-box; }
  .toolbar { position:sticky; top:0; z-index:10; display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px 16px; background:rgba(255,255,255,.9); backdrop-filter:blur(8px); border-bottom:1px solid var(--line); }
  .toolbar-back { display:inline-flex; align-items:center; gap:6px; font-size:13px; color:var(--soft); text-decoration:none; }
  .toolbar-print { display:inline-flex; align-items:center; gap:8px; font-size:13px; font-weight:600; color:#fff; border:0; border-radius:10px; padding:9px 16px; cursor:pointer; background:linear-gradient(135deg,#FF8A65,#FF5C5C); }
  .sheet { background:#fff; width:297mm; max-width:100%; margin:24px auto; padding:14mm; box-shadow:0 20px 60px -30px rgba(15,16,20,.45); border-radius:4px; font-family:ui-sans-serif,system-ui,sans-serif; font-size:11px; line-height:1.5; }
  .head { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid var(--ink); padding-bottom:10px; }
  .kicker { font-size:9px; font-weight:700; letter-spacing:.22em; text-transform:uppercase; color:#FF6B4A; }
  .title { font-size:20px; font-weight:700; margin:2px 0 0; }
  .meta { font-size:10px; color:var(--soft); margin-top:3px; text-transform:capitalize; }
  .org { font-size:12px; font-weight:600; }
  .timeline { margin-top:14px; }
  .tl-row { display:flex; align-items:center; gap:10px; margin-bottom:4px; }
  .tl-name { width:90px; font-size:10px; font-weight:600; }
  .tl-track { position:relative; flex:1; height:12px; background:#f4f5f7; border-radius:6px; }
  .tl-bar { position:absolute; top:0; height:12px; border-radius:6px; overflow:hidden; }
  .tl-fill { height:100%; opacity:.9; }
  .tl-dates { width:190px; text-align:right; font-size:9px; color:var(--soft); }
  .phase { margin-top:16px; page-break-inside:avoid; }
  .phase-title { display:flex; align-items:center; gap:6px; font-size:12px; font-weight:700; margin:0 0 5px; }
  .dot { width:8px; height:8px; border-radius:3px; display:inline-block; }
  .phase-meta { margin-left:auto; font-size:9px; font-weight:500; color:var(--soft); text-transform:capitalize; }
  .tbl { width:100%; border-collapse:collapse; }
  .tbl th { font-size:8px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--soft); text-align:left; padding:4px 6px; border-bottom:1.5px solid var(--ink); }
  .tbl td { font-size:10px; padding:4px 6px; border-bottom:1px solid var(--line); }
  .tbl tr:nth-child(even) td { background:#fafbfc; }
  .r { text-align:right; }
  .cap { text-transform:capitalize; }
  .empty { font-size:10px; color:var(--soft); }
  .foot { display:flex; justify-content:space-between; margin-top:20px; padding-top:8px; border-top:1px solid var(--line); font-size:8px; color:var(--soft); }
  @media print {
    .print-root { background:#fff; }
    .no-print { display:none !important; }
    .sheet { width:auto; margin:0; padding:0; box-shadow:none; }
    @page { size: A4 landscape; margin: 12mm; }
  }
`;
