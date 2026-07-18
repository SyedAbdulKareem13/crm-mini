import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, FileDown } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PrintButton } from "@/components/print/print-trigger";
import { buildProposal, type ProposalData } from "@/lib/proposal";
import type { EstimatorInputs, EstimateResult } from "@/lib/estimator";

export const dynamic = "force-dynamic";

export default async function ProjectProposalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.organizationId) redirect("/login");

  const project = await prisma.project.findFirst({
    where: { id, organizationId: session.user.organizationId },
    select: {
      id: true,
      name: true,
      projectNumber: true,
      data: true,
      customer: { select: { name: true, industry: true, billingAddress: true } },
      organization: { select: { name: true, industry: true, country: true } },
      methodology: { select: { name: true } },
      transformationType: { select: { name: true, subtitle: true } },
      phases: {
        orderBy: { position: "asc" },
        select: { name: true, deliverables: { orderBy: { position: "asc" }, select: { name: true } } },
      },
    },
  });
  if (!project) notFound();

  const data =
    project.data && typeof project.data === "object" && !Array.isArray(project.data)
      ? (project.data as Record<string, unknown>)
      : {};
  let draft = (data.proposal as ProposalData | undefined) ?? null;

  // No generated proposal yet — assemble a deterministic draft on the fly
  // when an estimate exists (the Generate button persists + AI-polishes it).
  if (!draft) {
    const est = data.estimator as { inputs: EstimatorInputs; result: EstimateResult } | undefined;
    if (est?.result?.roles?.length) {
      // Open RAID risks (most severe first) lead the risk table.
      const SEVERITY_RANK: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      const raidRisksRaw = await prisma.projectRaidItem.findMany({
        where: { projectId: project.id, type: "RISK", NOT: { status: "CLOSED" } },
        select: { title: true, mitigation: true, severity: true },
      });
      const raidRisks = raidRisksRaw
        .sort((a, b) => (SEVERITY_RANK[b.severity] ?? 0) - (SEVERITY_RANK[a.severity] ?? 0))
        .map((r) => ({ title: r.title, mitigation: r.mitigation, severity: r.severity }));

      draft = buildProposal({
        projectName: project.name,
        projectNumber: project.projectNumber,
        customerName: project.customer?.name ?? null,
        organizationName: project.organization.name,
        methodologyName: project.methodology?.name ?? null,
        transformationTypeName: project.transformationType?.name ?? null,
        inputs: est.inputs,
        result: est.result,
        phaseDeliverables: project.phases.map((p) => ({
          name: p.name,
          deliverables: p.deliverables.map((d) => d.name),
        })),
        raidRisks,
      });
      draft.generatedAt = new Date().toISOString();
    }
  }

  if (!draft) {
    return (
      <div className="mx-auto mt-16 max-w-md text-center">
        <p className="text-sm font-medium">No estimate on this project yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          The proposal is assembled from the saved estimate. Open the project, switch to the
          Estimator view and run an estimate first.
        </p>
        <Link
          href={`/app/projects/${project.id}`}
          className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to project
        </Link>
      </div>
    );
  }

  const proposal: ProposalData = draft;
  const fc = (v: number) => formatCurrency(v, proposal.commercials.currency || "INR");
  const totalWeeks = proposal.phases.reduce((n, p) => n + p.weeks, 0);

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
        {/* Letterhead */}
        <header className="letterhead">
          <div className="brand">
            <span className="najm-tile" aria-hidden>
              <svg viewBox="0 0 200 200" className="najm-svg" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="najmGradP" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#FFE9C2" />
                    <stop offset="0.45" stopColor="#FF8A65" />
                    <stop offset="1" stopColor="#FF5C5C" />
                  </linearGradient>
                </defs>
                <path
                  d="M100 10 C108 72 128 92 190 100 C128 108 108 128 100 190 C92 128 72 108 10 100 C72 92 92 72 100 10 Z"
                  fill="url(#najmGradP)"
                />
              </svg>
            </span>
            <div className="brand-text">
              <div className="brand-word">
                Manzil <span className="brand-one">One</span>
              </div>
              <div className="brand-sub">SAP Transformation Hub</div>
            </div>
          </div>
          <div className="org-block">
            <div className="org-name">{project.organization.name}</div>
            {project.organization.country ? <div className="org-line">{project.organization.country}</div> : null}
          </div>
        </header>

        <div className="doc-title-row">
          <div>
            <div className="doc-kicker">Proposal</div>
            <h1 className="doc-title">{project.name}</h1>
            <div className="doc-meta">
              {project.projectNumber}
              {project.transformationType ? ` · ${project.transformationType.name}` : ""}
              {project.methodology ? ` · ${project.methodology.name}` : ""}
            </div>
          </div>
          <table className="meta-mini">
            <tbody>
              <tr>
                <td className="mm-label">Date</td>
                <td className="mm-value">{formatDate(new Date(proposal.generatedAt))}</td>
              </tr>
              <tr>
                <td className="mm-label">Duration</td>
                <td className="mm-value">{totalWeeks} weeks</td>
              </tr>
              <tr>
                <td className="mm-label">Investment</td>
                <td className="mm-value">{fc(proposal.commercials.customerPrice)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Parties */}
        <section className="party-grid">
          <div className="party">
            <div className="party-label">Prepared for</div>
            <div className="party-name">{project.customer?.name ?? "—"}</div>
            {project.customer?.industry ? <div className="party-line">{project.customer.industry}</div> : null}
            {project.customer?.billingAddress ? (
              <div className="party-line party-address">{project.customer.billingAddress}</div>
            ) : null}
          </div>
          <div className="party">
            <div className="party-label">Prepared by</div>
            <div className="party-name">{project.organization.name}</div>
            {project.organization.industry ? <div className="party-line">{project.organization.industry}</div> : null}
            {project.organization.country ? <div className="party-line">{project.organization.country}</div> : null}
          </div>
        </section>

        {/* 1. Executive summary */}
        <Section n={1} title="Executive Summary">
          <p className="body-text">{proposal.executiveSummary}</p>
          {proposal.aiSummary ? <p className="fine">Summary drafted by Manz AI from the approved estimate.</p> : null}
        </Section>

        {/* 2. Scope */}
        <Section n={2} title="Scope">
          <div className="two-col">
            <div>
              <div className="sub-title">In scope</div>
              <ul className="tick-list">
                {proposal.scope.inScope.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="sub-title">Out of scope</div>
              <ul className="dash-list">
                {proposal.scope.outOfScope.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
              <div className="sub-title" style={{ marginTop: "12px" }}>Assumptions</div>
              <ul className="dash-list">
                {proposal.scope.assumptions.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          </div>
        </Section>

        {/* 3. Implementation approach + timeline */}
        <Section n={3} title="Implementation Approach & Timeline">
          {proposal.approach.map((p, i) => (
            <p key={i} className="body-text">{p}</p>
          ))}
          <table className="items" style={{ marginTop: "12px" }}>
            <thead>
              <tr>
                <th>Phase</th>
                <th className="c-r">Weeks</th>
                <th className="c-r">Effort (PM)</th>
                <th>Key deliverables</th>
              </tr>
            </thead>
            <tbody>
              {proposal.phases.map((p) => (
                <tr key={p.name}>
                  <td className="c-strong">{p.name}</td>
                  <td className="c-r">{p.weeks}</td>
                  <td className="c-r">{p.effortPM}</td>
                  <td>{p.deliverables.length ? p.deliverables.join(" · ") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="fine">{proposal.timelineLabel}</p>
        </Section>

        {/* 4. Resource plan */}
        <Section n={4} title="Resource Plan">
          <table className="items">
            <thead>
              <tr>
                <th>Role</th>
                <th className="c-r">Count</th>
                <th className="c-r">Months</th>
                <th className="c-r">Onsite</th>
                <th className="c-r">Offshore</th>
              </tr>
            </thead>
            <tbody>
              {proposal.resourcePlan.map((r) => (
                <tr key={r.role}>
                  <td>{r.role}</td>
                  <td className="c-r">{r.count}</td>
                  <td className="c-r">{r.months}</td>
                  <td className="c-r">{r.onsite}</td>
                  <td className="c-r">{r.offshore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        {/* 5. Commercials */}
        <Section n={5} title="Commercials">
          <div className="commercial-head">
            <div>
              <div className="fine">Total investment · {proposal.commercials.totalEffortPM} person-months over {proposal.commercials.durationMonths} months</div>
              <div className="price">{fc(proposal.commercials.customerPrice)}</div>
            </div>
          </div>
          <table className="items" style={{ marginTop: "10px" }}>
            <thead>
              <tr>
                <th>Payment milestone</th>
                <th className="c-r">%</th>
                <th className="c-r">Amount</th>
              </tr>
            </thead>
            <tbody>
              {proposal.commercials.paymentMilestones.map((m) => (
                <tr key={m.label}>
                  <td>{m.label}</td>
                  <td className="c-r">{m.pct}%</td>
                  <td className="c-r">{fc(Math.round(proposal.commercials.customerPrice * (m.pct / 100)))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        {/* 6. Risks */}
        <Section n={6} title="Risks & Mitigations">
          <table className="items">
            <thead>
              <tr>
                <th style={{ width: "42%" }}>Risk</th>
                <th>Mitigation</th>
              </tr>
            </thead>
            <tbody>
              {proposal.risks.map((r) => (
                <tr key={r.risk}>
                  <td>{r.risk}</td>
                  <td>{r.mitigation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        {/* 7. Acceptance criteria */}
        <Section n={7} title="Acceptance Criteria">
          <ul className="tick-list">
            {proposal.acceptanceCriteria.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </Section>

        <footer className="doc-footer">
          <span>{project.organization.name}</span>
          <span>{project.projectNumber} · Proposal</span>
          <span>Generated {formatDate(new Date(proposal.generatedAt))}</span>
        </footer>
      </div>
    </div>
  );
}

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="psec">
      <h2 className="psec-title">
        <span className="psec-num">{n}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

const printCss = `
  .print-root { --ink: #14151A; --soft: #5b606b; --line: #e3e5ea; --accent: #FF6B4A; --tile-a: #2A2D34; --tile-b: #0B0C10; }
  .print-root { background: #f4f5f7; min-height: 100vh; color: var(--ink); }
  .print-root * { box-sizing: border-box; }

  .toolbar { position: sticky; top: 0; z-index: 10; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 16px; background: rgba(255,255,255,0.9); backdrop-filter: blur(8px); border-bottom: 1px solid var(--line); }
  .toolbar-back { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: var(--soft); text-decoration: none; }
  .toolbar-back:hover { color: var(--ink); }
  .toolbar-print { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: #fff; border: 0; border-radius: 10px; padding: 9px 16px; cursor: pointer; background: linear-gradient(135deg, #FF8A65, #FF5C5C); box-shadow: 0 8px 20px -8px rgba(255,92,92,0.55); }

  .sheet { background: #fff; color: var(--ink); width: 210mm; max-width: 100%; margin: 24px auto; padding: 18mm; box-shadow: 0 20px 60px -30px rgba(15,16,20,0.45); border-radius: 4px; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; font-size: 12px; line-height: 1.55; }

  .letterhead { display: flex; align-items: flex-start; justify-content: space-between; padding-bottom: 14px; border-bottom: 2px solid var(--ink); }
  .brand { display: flex; align-items: center; gap: 12px; }
  .najm-tile { display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: 12px; background: radial-gradient(120% 120% at 30% 20%, var(--tile-a) 0%, #14151A 55%, var(--tile-b) 100%); }
  .najm-svg { width: 62%; height: 62%; }
  .brand-text { display: flex; flex-direction: column; line-height: 1.1; }
  .brand-word { font-size: 18px; font-weight: 700; letter-spacing: -0.01em; }
  .brand-one { color: var(--accent); }
  .brand-sub { font-size: 9px; font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase; color: var(--soft); margin-top: 3px; }
  .org-block { text-align: right; }
  .org-name { font-size: 13px; font-weight: 600; }
  .org-line { font-size: 11px; color: var(--soft); }

  .doc-title-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; margin-top: 18px; }
  .doc-kicker { font-size: 10px; font-weight: 700; letter-spacing: 0.22em; text-transform: uppercase; color: var(--accent); }
  .doc-title { font-size: 24px; font-weight: 700; letter-spacing: -0.02em; margin: 2px 0 0; }
  .doc-meta { font-size: 11px; color: var(--soft); margin-top: 4px; }
  .meta-mini { border-collapse: collapse; font-size: 11px; }
  .meta-mini td { padding: 2px 0; }
  .mm-label { color: var(--soft); padding-right: 14px; text-transform: uppercase; letter-spacing: 0.08em; font-size: 9px; }
  .mm-value { text-align: right; font-weight: 600; white-space: nowrap; }

  .party-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 20px; }
  .party { border: 1px solid var(--line); border-radius: 8px; padding: 12px 14px; }
  .party-label { font-size: 9px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: var(--soft); }
  .party-name { font-size: 13px; font-weight: 600; margin-top: 4px; }
  .party-line { font-size: 11px; color: var(--soft); margin-top: 2px; }
  .party-address { white-space: pre-wrap; }

  .psec { margin-top: 24px; }
  .psec-title { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; letter-spacing: -0.01em; margin: 0 0 8px; padding-bottom: 6px; border-bottom: 1px solid var(--line); }
  .psec-num { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 6px; background: var(--ink); color: #fff; font-size: 10px; font-weight: 700; }
  .sub-title { font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--soft); margin-bottom: 6px; }
  .body-text { font-size: 11.5px; margin: 0 0 8px; }
  .fine { font-size: 10px; color: var(--soft); margin: 6px 0 0; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }

  .tick-list, .dash-list { margin: 0; padding: 0; list-style: none; }
  .tick-list li, .dash-list li { font-size: 11px; padding: 3px 0 3px 16px; position: relative; }
  .tick-list li::before { content: "✓"; position: absolute; left: 0; color: var(--accent); font-weight: 700; }
  .dash-list li::before { content: "—"; position: absolute; left: 0; color: var(--soft); }

  .items { width: 100%; border-collapse: collapse; }
  .items thead th { font-size: 9px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--soft); text-align: left; padding: 7px 8px; border-bottom: 1.5px solid var(--ink); }
  .items tbody td { font-size: 11px; padding: 7px 8px; border-bottom: 1px solid var(--line); vertical-align: top; }
  .items tbody tr:nth-child(even) td { background: #fafbfc; }
  .c-r { text-align: right; white-space: nowrap; }
  .c-strong { font-weight: 700; }

  .commercial-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; }
  .price { font-size: 22px; font-weight: 700; letter-spacing: -0.02em; margin-top: 2px; }

  .doc-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 28px; padding-top: 10px; border-top: 1px solid var(--line); font-size: 9px; color: var(--soft); }

  @media print {
    .print-root { background: #fff; }
    .no-print { display: none !important; }
    .sheet { width: auto; margin: 0; padding: 0; box-shadow: none; border-radius: 0; }
    .psec { page-break-inside: avoid; }
    .items tbody tr { page-break-inside: avoid; }
    @page { size: A4; margin: 16mm; }
  }
`;
