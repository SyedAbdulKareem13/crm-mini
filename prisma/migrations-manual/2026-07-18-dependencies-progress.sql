-- Manzil One · Projects: task dependencies + progress/effort fields
-- Idempotent — safe to run multiple times. Additive only; prod code never
-- touches these columns/tables, so running it does not affect production.
-- Run in Supabase SQL Editor.

-- Item 4: % complete + effort hours on deliverables/tasks.
ALTER TABLE "ProjectDeliverable" ADD COLUMN IF NOT EXISTS "progressPct" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ProjectDeliverable" ADD COLUMN IF NOT EXISTS "estimateHours" DOUBLE PRECISION;
ALTER TABLE "ProjectDeliverable" ADD COLUMN IF NOT EXISTS "actualHours" DOUBLE PRECISION;

-- Backfill: completed tasks read as 100%.
UPDATE "ProjectDeliverable" SET "progressPct" = 100 WHERE "status" = 'DONE' AND "progressPct" = 0;

-- Index for the workload view (per-member allocation lookups).
CREATE INDEX IF NOT EXISTS "ProjectDeliverable_ownerId_idx" ON "ProjectDeliverable"("ownerId");

-- Item 3: finish-to-start dependency links.
CREATE TABLE IF NOT EXISTS "ProjectTaskDependency" (
  "id" TEXT NOT NULL,
  "predecessorId" TEXT NOT NULL,
  "successorId" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'FS',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectTaskDependency_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProjectTaskDependency_predecessorId_successorId_key"
  ON "ProjectTaskDependency"("predecessorId", "successorId");
CREATE INDEX IF NOT EXISTS "ProjectTaskDependency_successorId_idx"
  ON "ProjectTaskDependency"("successorId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ProjectTaskDependency_predecessorId_fkey'
  ) THEN
    ALTER TABLE "ProjectTaskDependency"
      ADD CONSTRAINT "ProjectTaskDependency_predecessorId_fkey"
      FOREIGN KEY ("predecessorId") REFERENCES "ProjectDeliverable"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ProjectTaskDependency_successorId_fkey'
  ) THEN
    ALTER TABLE "ProjectTaskDependency"
      ADD CONSTRAINT "ProjectTaskDependency_successorId_fkey"
      FOREIGN KEY ("successorId") REFERENCES "ProjectDeliverable"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
