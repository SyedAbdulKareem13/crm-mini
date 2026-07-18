-- Manzil One · RAID register + working-day calendar
-- Idempotent — safe to run multiple times. Additive only.
-- Run in Supabase SQL Editor.

-- Working-day calendar on the org config row.
ALTER TABLE "PipelineGateConfig" ADD COLUMN IF NOT EXISTS "workingDays" TEXT NOT NULL DEFAULT '1,2,3,4,5';
ALTER TABLE "PipelineGateConfig" ADD COLUMN IF NOT EXISTS "holidays" JSONB;

-- Structured RAID register.
CREATE TABLE IF NOT EXISTS "ProjectRaidItem" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'RISK',
  "title" TEXT NOT NULL,
  "description" TEXT,
  "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
  "probability" TEXT,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "mitigation" TEXT,
  "ownerId" TEXT,
  "dueDate" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectRaidItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ProjectRaidItem_projectId_idx" ON "ProjectRaidItem"("projectId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProjectRaidItem_projectId_fkey') THEN
    ALTER TABLE "ProjectRaidItem"
      ADD CONSTRAINT "ProjectRaidItem_projectId_fkey"
      FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProjectRaidItem_ownerId_fkey') THEN
    ALTER TABLE "ProjectRaidItem"
      ADD CONSTRAINT "ProjectRaidItem_ownerId_fkey"
      FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
