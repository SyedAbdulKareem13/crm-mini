/**
 * Schedule exports (item 7) — pure string builders, generated client-side
 * from the Gantt's computed schedule:
 *  - MSPDI XML  → opens in Microsoft Project (phases as summary tasks,
 *    finish-to-start predecessor links, resources + assignments)
 *  - SpreadsheetML → opens in Excel (.xls) with a styled schedule sheet
 */

type ExportTask = {
  id: string;
  name: string;
  status: string;
  priority?: string;
  ownerName?: string | null;
  progressPct?: number;
  estimateHours?: number | null;
  actualHours?: number | null;
  predecessorIds?: string[];
  start: Date;
  end: Date;
};
type ExportPhase = {
  id: string;
  name: string;
  status: string;
  pct: number;
  start: Date;
  end: Date;
  items: ExportTask[];
};

const DAY = 86_400_000;
const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const mspDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T08:00:00`;
const days = (a: Date, b: Date) => Math.max(1, Math.round((b.getTime() - a.getTime()) / DAY));
const fmtDate = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

/** Microsoft Project Data Interchange (MSPDI) XML. */
export function buildMspdiXml(projectName: string, projectNumber: string, phases: ExportPhase[]): string {
  // UID map: 0 = project summary, then phases/tasks in outline order.
  const uid = new Map<string, number>();
  let next = 1;
  for (const p of phases) {
    uid.set(p.id, next++);
    for (const t of p.items) uid.set(t.id, next++);
  }

  const owners = [...new Set(phases.flatMap((p) => p.items.map((t) => t.ownerName)).filter(Boolean))] as string[];
  const resUid = new Map(owners.map((o, i) => [o, i + 1]));

  const taskXml: string[] = [];
  for (const p of phases) {
    taskXml.push(
      `<Task><UID>${uid.get(p.id)}</UID><ID>${uid.get(p.id)}</ID><Name>${esc(p.name)}</Name>` +
        `<OutlineLevel>1</OutlineLevel><Summary>1</Summary>` +
        `<Start>${mspDate(p.start)}</Start><Finish>${mspDate(p.end)}</Finish>` +
        `<Duration>PT${days(p.start, p.end) * 8}H0M0S</Duration><DurationFormat>7</DurationFormat>` +
        `<PercentComplete>${p.pct}</PercentComplete></Task>`
    );
    for (const t of p.items) {
      const links = (t.predecessorIds ?? [])
        .filter((pid) => uid.has(pid))
        .map((pid) => `<PredecessorLink><PredecessorUID>${uid.get(pid)}</PredecessorUID><Type>1</Type></PredecessorLink>`)
        .join("");
      const pct = t.status === "DONE" ? 100 : t.progressPct ?? 0;
      taskXml.push(
        `<Task><UID>${uid.get(t.id)}</UID><ID>${uid.get(t.id)}</ID><Name>${esc(t.name)}</Name>` +
          `<OutlineLevel>2</OutlineLevel><Summary>0</Summary>` +
          `<Start>${mspDate(t.start)}</Start><Finish>${mspDate(t.end)}</Finish>` +
          `<Duration>PT${days(t.start, t.end) * 8}H0M0S</Duration><DurationFormat>7</DurationFormat>` +
          `<PercentComplete>${pct}</PercentComplete>` +
          (t.estimateHours != null ? `<Work>PT${Math.round(t.estimateHours)}H0M0S</Work>` : "") +
          `${links}</Task>`
      );
    }
  }

  const resourceXml = owners
    .map((o) => `<Resource><UID>${resUid.get(o)}</UID><ID>${resUid.get(o)}</ID><Name>${esc(o)}</Name></Resource>`)
    .join("");
  let aUid = 1;
  const assignmentXml = phases
    .flatMap((p) => p.items)
    .filter((t) => t.ownerName && resUid.has(t.ownerName))
    .map(
      (t) =>
        `<Assignment><UID>${aUid++}</UID><TaskUID>${uid.get(t.id)}</TaskUID><ResourceUID>${resUid.get(t.ownerName!)}</ResourceUID><Units>1</Units></Assignment>`
    )
    .join("");

  const start = phases[0]?.start ?? new Date();
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Project xmlns="http://schemas.microsoft.com/project">` +
    `<Name>${esc(projectNumber)}.xml</Name><Title>${esc(projectName)}</Title>` +
    `<ScheduleFromStart>1</ScheduleFromStart><StartDate>${mspDate(start)}</StartDate>` +
    `<Tasks>${taskXml.join("")}</Tasks>` +
    `<Resources>${resourceXml}</Resources>` +
    `<Assignments>${assignmentXml}</Assignments>` +
    `</Project>`
  );
}

/** Excel SpreadsheetML (opens in Excel as .xls). */
export function buildExcelXml(
  projectName: string,
  projectNumber: string,
  phases: ExportPhase[],
  taskName: (id: string) => string
): string {
  const cell = (v: string | number, style?: string, type: "String" | "Number" = typeof v === "number" ? "Number" : "String") =>
    `<Cell${style ? ` ss:StyleID="${style}"` : ""}><Data ss:Type="${type}">${typeof v === "string" ? esc(v) : v}</Data></Cell>`;
  const rows: string[] = [];

  rows.push(`<Row>${cell(`${projectNumber} — ${projectName}`, "title")}</Row>`);
  rows.push(`<Row></Row>`);
  rows.push(
    `<Row>${["Type", "Phase", "Task", "Status", "% Complete", "Priority", "Assignee", "Start", "End", "Duration (days)", "Est. hours", "Actual hours", "Predecessors"]
      .map((h) => cell(h, "head"))
      .join("")}</Row>`
  );
  for (const p of phases) {
    rows.push(
      `<Row>${[
        cell("Phase", "phase"), cell(p.name, "phase"), cell("", "phase"), cell(p.status, "phase"),
        cell(p.pct, "phase"), cell("", "phase"), cell("", "phase"),
        cell(fmtDate(p.start), "phase"), cell(fmtDate(p.end), "phase"), cell(days(p.start, p.end), "phase"),
        cell("", "phase"), cell("", "phase"), cell("", "phase"),
      ].join("")}</Row>`
    );
    for (const t of p.items) {
      rows.push(
        `<Row>${[
          cell("Task"), cell(p.name), cell(t.name), cell(t.status),
          cell(t.status === "DONE" ? 100 : t.progressPct ?? 0),
          cell(t.priority ?? "MEDIUM"), cell(t.ownerName ?? ""),
          cell(fmtDate(t.start)), cell(fmtDate(t.end)), cell(days(t.start, t.end)),
          t.estimateHours != null ? cell(t.estimateHours) : cell(""),
          t.actualHours != null ? cell(t.actualHours) : cell(""),
          cell((t.predecessorIds ?? []).map(taskName).join("; ")),
        ].join("")}</Row>`
      );
    }
  }

  return (
    `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>` +
    `<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">` +
    `<Styles>` +
    `<Style ss:ID="title"><Font ss:Bold="1" ss:Size="14"/></Style>` +
    `<Style ss:ID="head"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#14151A" ss:Pattern="Solid"/></Style>` +
    `<Style ss:ID="phase"><Font ss:Bold="1"/><Interior ss:Color="#F2F2F2" ss:Pattern="Solid"/></Style>` +
    `</Styles>` +
    `<Worksheet ss:Name="Schedule"><Table>${rows.join("")}</Table></Worksheet>` +
    `</Workbook>`
  );
}

export function downloadText(filename: string, mime: string, content: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
