import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { estimate, ESTIMATOR_FIELDS, type EstimatorInputs } from "@/lib/estimator";
import { computeCalibration } from "@/lib/estimator-calibration";

const inputsSchema = z.object(
  Object.fromEntries(
    ESTIMATOR_FIELDS.map((f) => [f.key, z.coerce.number().min(0).max(100000).default(0)])
  ) as Record<string, z.ZodDefault<z.ZodNumber>>
);

/** POST — run the estimator for a project and persist inputs + results into
 *  Project.data.estimator (JSON; no schema change needed). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = session.user.organizationId;

  const parsed = inputsSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid characteristics" }, { status: 400 });
  const inputs = parsed.data as EstimatorInputs;

  const project = await prisma.project.findFirst({
    where: { id, organizationId: orgId },
    select: {
      id: true,
      projectNumber: true,
      data: true,
      phases: { select: { name: true, durationWeeks: true }, orderBy: { position: "asc" } },
    },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [cards, calibration] = await Promise.all([
    prisma.manpowerRateCard.findMany({
      where: { organizationId: orgId },
      select: { designation: true, monthlyRate: true },
    }),
    computeCalibration(orgId),
  ]);

  const result = estimate(inputs, project.phases, cards, calibration);

  const prevData =
    project.data && typeof project.data === "object" && !Array.isArray(project.data)
      ? (project.data as Record<string, unknown>)
      : {};
  await prisma.project.update({
    where: { id: project.id },
    data: {
      data: {
        ...prevData,
        estimator: { inputs, result, updatedAt: new Date().toISOString() },
      } as Prisma.InputJsonValue,
    },
  });

  await recordAudit({
    organizationId: orgId,
    entityType: "PROJECT",
    entityId: project.id,
    entityLabel: project.projectNumber,
    action: "UPDATED",
    summary: `Estimate run · ${result.durationWeeks}wk · ${result.totalEffortPM} PM · price ${result.totals.customerPrice.toLocaleString("en-IN")}`,
    actorId: session.user.id,
    actorName: session.user.name,
  });

  return NextResponse.json({ inputs, result });
}
