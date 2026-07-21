-- Manzil One · Sales lifecycle governance: cancellation, reopen, chain gates
-- Idempotent — safe to run multiple times. Additive only.
-- Run in Supabase SQL Editor.

-- CANCELLED status values (RFQStatus already has it).
ALTER TYPE "LeadStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
ALTER TYPE "OpportunityStage" ADD VALUE IF NOT EXISTS 'CANCELLED';
ALTER TYPE "QuotationStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

-- Controlled-cancellation fields on the four lifecycle entities.
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3);
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "cancelledById" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "cancelledByName" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "cancelReason" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "statusBeforeCancel" TEXT;

ALTER TABLE "Opportunity" ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3);
ALTER TABLE "Opportunity" ADD COLUMN IF NOT EXISTS "cancelledById" TEXT;
ALTER TABLE "Opportunity" ADD COLUMN IF NOT EXISTS "cancelledByName" TEXT;
ALTER TABLE "Opportunity" ADD COLUMN IF NOT EXISTS "cancelReason" TEXT;
ALTER TABLE "Opportunity" ADD COLUMN IF NOT EXISTS "statusBeforeCancel" TEXT;

ALTER TABLE "RFQ" ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3);
ALTER TABLE "RFQ" ADD COLUMN IF NOT EXISTS "cancelledById" TEXT;
ALTER TABLE "RFQ" ADD COLUMN IF NOT EXISTS "cancelledByName" TEXT;
ALTER TABLE "RFQ" ADD COLUMN IF NOT EXISTS "cancelReason" TEXT;
ALTER TABLE "RFQ" ADD COLUMN IF NOT EXISTS "statusBeforeCancel" TEXT;

ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3);
ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "cancelledById" TEXT;
ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "cancelledByName" TEXT;
ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "cancelReason" TEXT;
ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "statusBeforeCancel" TEXT;

-- Lifecycle chain validation toggles (default OFF).
ALTER TABLE "PipelineGateConfig" ADD COLUMN IF NOT EXISTS "oppRequiresLead" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PipelineGateConfig" ADD COLUMN IF NOT EXISTS "rfqRequiresOpportunity" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PipelineGateConfig" ADD COLUMN IF NOT EXISTS "quoteRequiresRfq" BOOLEAN NOT NULL DEFAULT false;
