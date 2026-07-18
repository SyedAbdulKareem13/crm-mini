import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { buildProposal } from "@/lib/proposal";
import { getGeminiKey, getGeminiModel } from "@/lib/app-config";
import { geminiGenerate } from "@/lib/ai";
import type { EstimatorInputs, EstimateResult } from "@/lib/estimator";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** POST — assemble the client-ready proposal from the saved estimate and
 *  persist it into Project.data.proposal. Gemini (optional) polishes the
 *  executive summary; everything else is deterministic. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = session.user.organizationId;

  const project = await prisma.project.findFirst({
    where: { id, organizationId: orgId },
    select: {
      id: true,
      name: true,
      projectNumber: true,
      data: true,
      customer: { select: { name: true } },
      organization: { select: { name: true } },
      methodology: { select: { name: true } },
      transformationType: { select: { name: true } },
      phases: {
        orderBy: { position: "asc" },
        select: { name: true, deliverables: { orderBy: { position: "asc" }, select: { name: true } } },
      },
    },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const prevData =
    project.data && typeof project.data === "object" && !Array.isArray(project.data)
      ? (project.data as Record<string, unknown>)
      : {};
  const est = prevData.estimator as { inputs: EstimatorInputs; result: EstimateResult } | undefined;
  if (!est?.result?.roles?.length) {
    return NextResponse.json(
      { error: "Run the estimator first — the proposal is assembled from the saved estimate." },
      { status: 422 }
    );
  }

  // Open risks from the live RAID register, most severe first, to lead the
  // proposal's risk table.
  const SEVERITY_RANK: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
  const raidRisksRaw = await prisma.projectRaidItem.findMany({
    where: { projectId: project.id, type: "RISK", NOT: { status: "CLOSED" } },
    select: { title: true, mitigation: true, severity: true },
  });
  const raidRisks = raidRisksRaw
    .sort((a, b) => (SEVERITY_RANK[b.severity] ?? 0) - (SEVERITY_RANK[a.severity] ?? 0))
    .map((r) => ({ title: r.title, mitigation: r.mitigation, severity: r.severity }));

  const proposal = buildProposal({
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
  proposal.generatedAt = new Date().toISOString();

  // Optional AI polish of the executive summary (silently falls back).
  try {
    const key = await getGeminiKey();
    if (key) {
      const polished = await geminiGenerate({
        apiKey: key,
        model: await getGeminiModel(),
        system:
          "You are Manz AI inside a CRM. Rewrite the given proposal executive summary as one crisp, confident, client-ready paragraph (4-6 sentences). Keep every fact and number exactly as given. No preamble, no markdown.",
        prompt: proposal.executiveSummary,
        temperature: 0.4,
      });
      if (polished && polished.trim().length > 80) {
        proposal.executiveSummary = polished.trim();
        proposal.aiSummary = true;
      }
    }
  } catch {
    /* deterministic summary already in place */
  }

  await prisma.project.update({
    where: { id: project.id },
    data: { data: { ...prevData, proposal } as Prisma.InputJsonValue },
  });

  await recordAudit({
    organizationId: orgId,
    entityType: "PROJECT",
    entityId: project.id,
    entityLabel: project.projectNumber,
    action: "UPDATED",
    summary: `Proposal generated${proposal.aiSummary ? " (AI executive summary)" : ""}`,
    actorId: session.user.id,
    actorName: session.user.name,
  });

  return NextResponse.json({ ok: true });
}
