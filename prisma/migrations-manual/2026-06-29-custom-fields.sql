-- ============================================================================
-- Manzil One — additive migration: per-activity-type field scoping + custom
-- field value storage on every module.
-- Paste into Supabase → SQL Editor → Run. Idempotent; safe on the live DB
-- (running prod code selects explicit columns, so new columns are ignored
-- until the new build is deployed).
-- ============================================================================

ALTER TABLE "FieldConfig"  ADD COLUMN IF NOT EXISTS "appliesTo" JSONB;
ALTER TABLE "Lead"         ADD COLUMN IF NOT EXISTS "data"      JSONB;
ALTER TABLE "Opportunity"  ADD COLUMN IF NOT EXISTS "data"      JSONB;
ALTER TABLE "Customer"     ADD COLUMN IF NOT EXISTS "data"      JSONB;
ALTER TABLE "RFQ"          ADD COLUMN IF NOT EXISTS "data"      JSONB;
ALTER TABLE "Quotation"    ADD COLUMN IF NOT EXISTS "data"      JSONB;
