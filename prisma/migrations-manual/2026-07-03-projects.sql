-- ============================================================================
-- Manzil One — SAP Transformation Intelligence Hub (Projects & Roadmaps)
-- Additive migration: 8 new tables, zero changes to existing tables.
-- Paste into Supabase → SQL Editor → Run. Idempotent; safe for the live DB
-- (production code never queries these tables until the feature is merged).
-- ============================================================================

CREATE TABLE IF NOT EXISTS "Methodology" (
  "id"             TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "key"            TEXT NOT NULL,
  "name"           TEXT NOT NULL,
  "description"    TEXT,
  "active"         BOOLEAN NOT NULL DEFAULT true,
  "position"       INTEGER NOT NULL DEFAULT 0,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Methodology_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Methodology_organizationId_fkey" FOREIGN KEY ("organizationId")
    REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "Methodology_organizationId_key_key" ON "Methodology"("organizationId", "key");
CREATE INDEX IF NOT EXISTS "Methodology_organizationId_idx" ON "Methodology"("organizationId");

CREATE TABLE IF NOT EXISTS "MethodologyPhase" (
  "id"            TEXT NOT NULL,
  "methodologyId" TEXT NOT NULL,
  "name"          TEXT NOT NULL,
  "description"   TEXT,
  "color"         TEXT NOT NULL DEFAULT '#2563EB',
  "durationWeeks" INTEGER NOT NULL DEFAULT 4,
  "position"      INTEGER NOT NULL DEFAULT 0,
  "active"        BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "MethodologyPhase_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MethodologyPhase_methodologyId_fkey" FOREIGN KEY ("methodologyId")
    REFERENCES "Methodology"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "MethodologyPhase_methodologyId_idx" ON "MethodologyPhase"("methodologyId");

CREATE TABLE IF NOT EXISTS "MethodologyDeliverable" (
  "id"       TEXT NOT NULL,
  "phaseId"  TEXT NOT NULL,
  "name"     TEXT NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "active"   BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "MethodologyDeliverable_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MethodologyDeliverable_phaseId_fkey" FOREIGN KEY ("phaseId")
    REFERENCES "MethodologyPhase"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "MethodologyDeliverable_phaseId_idx" ON "MethodologyDeliverable"("phaseId");

CREATE TABLE IF NOT EXISTS "TransformationType" (
  "id"             TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "key"            TEXT NOT NULL,
  "name"           TEXT NOT NULL,
  "subtitle"       TEXT,
  "methodologyId"  TEXT,
  "active"         BOOLEAN NOT NULL DEFAULT true,
  "position"       INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "TransformationType_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TransformationType_organizationId_fkey" FOREIGN KEY ("organizationId")
    REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TransformationType_methodologyId_fkey" FOREIGN KEY ("methodologyId")
    REFERENCES "Methodology"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "TransformationType_organizationId_key_key" ON "TransformationType"("organizationId", "key");
CREATE INDEX IF NOT EXISTS "TransformationType_organizationId_idx" ON "TransformationType"("organizationId");

CREATE TABLE IF NOT EXISTS "Project" (
  "id"                   TEXT NOT NULL,
  "projectNumber"        TEXT NOT NULL,
  "organizationId"       TEXT NOT NULL,
  "name"                 TEXT NOT NULL,
  "status"               TEXT NOT NULL DEFAULT 'PLANNING',
  "opportunityId"        TEXT,
  "customerId"           TEXT,
  "transformationTypeId" TEXT,
  "methodologyId"        TEXT,
  "ownerId"              TEXT,
  "startDate"            TIMESTAMP(3),
  "targetEndDate"        TIMESTAMP(3),
  "notes"                TEXT,
  "data"                 JSONB,
  "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"            TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Project_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Project_organizationId_fkey" FOREIGN KEY ("organizationId")
    REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Project_opportunityId_fkey" FOREIGN KEY ("opportunityId")
    REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Project_customerId_fkey" FOREIGN KEY ("customerId")
    REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Project_transformationTypeId_fkey" FOREIGN KEY ("transformationTypeId")
    REFERENCES "TransformationType"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Project_methodologyId_fkey" FOREIGN KEY ("methodologyId")
    REFERENCES "Methodology"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Project_ownerId_fkey" FOREIGN KEY ("ownerId")
    REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "Project_projectNumber_key" ON "Project"("projectNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "Project_opportunityId_key" ON "Project"("opportunityId");
CREATE INDEX IF NOT EXISTS "Project_organizationId_status_idx" ON "Project"("organizationId", "status");
CREATE INDEX IF NOT EXISTS "Project_customerId_idx" ON "Project"("customerId");

CREATE TABLE IF NOT EXISTS "ProjectPhase" (
  "id"            TEXT NOT NULL,
  "projectId"     TEXT NOT NULL,
  "name"          TEXT NOT NULL,
  "color"         TEXT NOT NULL DEFAULT '#2563EB',
  "durationWeeks" INTEGER NOT NULL DEFAULT 4,
  "position"      INTEGER NOT NULL DEFAULT 0,
  "status"        TEXT NOT NULL DEFAULT 'NOT_STARTED',
  "startDate"     TIMESTAMP(3),
  "endDate"       TIMESTAMP(3),
  CONSTRAINT "ProjectPhase_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProjectPhase_projectId_fkey" FOREIGN KEY ("projectId")
    REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "ProjectPhase_projectId_idx" ON "ProjectPhase"("projectId");

CREATE TABLE IF NOT EXISTS "ProjectDeliverable" (
  "id"        TEXT NOT NULL,
  "phaseId"   TEXT NOT NULL,
  "name"      TEXT NOT NULL,
  "position"  INTEGER NOT NULL DEFAULT 0,
  "status"    TEXT NOT NULL DEFAULT 'PENDING',
  "priority"  TEXT NOT NULL DEFAULT 'MEDIUM',
  "ownerId"   TEXT,
  "startDate" TIMESTAMP(3),
  "endDate"   TIMESTAMP(3),
  CONSTRAINT "ProjectDeliverable_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProjectDeliverable_phaseId_fkey" FOREIGN KEY ("phaseId")
    REFERENCES "ProjectPhase"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ProjectDeliverable_ownerId_fkey" FOREIGN KEY ("ownerId")
    REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "ProjectDeliverable_phaseId_idx" ON "ProjectDeliverable"("phaseId");

-- Gantt fields — idempotent ALTERs so this script also upgrades an existing
-- installation created from an earlier version of this file.
ALTER TABLE "ProjectPhase"       ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP(3);
ALTER TABLE "ProjectPhase"       ADD COLUMN IF NOT EXISTS "endDate"   TIMESTAMP(3);
ALTER TABLE "ProjectDeliverable" ADD COLUMN IF NOT EXISTS "priority"  TEXT NOT NULL DEFAULT 'MEDIUM';
ALTER TABLE "ProjectDeliverable" ADD COLUMN IF NOT EXISTS "ownerId"   TEXT;
ALTER TABLE "ProjectDeliverable" ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP(3);
ALTER TABLE "ProjectDeliverable" ADD COLUMN IF NOT EXISTS "endDate"   TIMESTAMP(3);
DO $$ BEGIN
  ALTER TABLE "ProjectDeliverable" ADD CONSTRAINT "ProjectDeliverable_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "PipelineGateConfig" (
  "id"                        TEXT NOT NULL,
  "organizationId"            TEXT NOT NULL,
  "quoteRequiredStage"        TEXT,
  "projectRequiredStage"      TEXT,
  "sequentialPhases"          BOOLEAN NOT NULL DEFAULT false,
  "completeRequiresAllPhases" BOOLEAN NOT NULL DEFAULT true,
  "updatedAt"                 TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PipelineGateConfig_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PipelineGateConfig_organizationId_fkey" FOREIGN KEY ("organizationId")
    REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "PipelineGateConfig_organizationId_key" ON "PipelineGateConfig"("organizationId");
ALTER TABLE "PipelineGateConfig" ADD COLUMN IF NOT EXISTS "sequentialPhases"          BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PipelineGateConfig" ADD COLUMN IF NOT EXISTS "completeRequiresAllPhases" BOOLEAN NOT NULL DEFAULT true;
