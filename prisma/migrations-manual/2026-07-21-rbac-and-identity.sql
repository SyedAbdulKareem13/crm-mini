-- Manzil One · RBAC matrix, employee onboarding, admin identity, dummy cleanup
-- Idempotent — safe to run multiple times. Run in Supabase SQL Editor.
-- Order matters: identity update runs BEFORE dummy-user cleanup.

-- 1) Role-permission matrix table.
CREATE TABLE IF NOT EXISTS "RolePermission" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "role" "UserRole" NOT NULL,
  "module" TEXT NOT NULL,
  "canRead" BOOLEAN NOT NULL DEFAULT true,
  "canCreate" BOOLEAN NOT NULL DEFAULT false,
  "canUpdate" BOOLEAN NOT NULL DEFAULT false,
  "canDelete" BOOLEAN NOT NULL DEFAULT false,
  "canCancel" BOOLEAN NOT NULL DEFAULT false,
  "canReopen" BOOLEAN NOT NULL DEFAULT false,
  "canApprove" BOOLEAN NOT NULL DEFAULT false,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "RolePermission_organizationId_role_module_key"
  ON "RolePermission"("organizationId", "role", "module");
CREATE INDEX IF NOT EXISTS "RolePermission_organizationId_role_idx"
  ON "RolePermission"("organizationId", "role");
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RolePermission_organizationId_fkey') THEN
    ALTER TABLE "RolePermission"
      ADD CONSTRAINT "RolePermission_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- 2) Onboarding flag.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

-- 3) Admin identity: email + display name + verified.
UPDATE "User"
SET "email" = 'syedabdulkareem.13@gmail.com',
    "name" = 'Syed Abdul Kareem',
    "emailVerified" = COALESCE("emailVerified", CURRENT_TIMESTAMP)
WHERE "email" = 'admin@nova.crm';

-- 4) Dummy employee cleanup: reassign everything they own to the admin,
--    then delete them (all non-admin @nova.crm demo users).
DO $$
DECLARE
  admin_id TEXT;
  dummy_ids TEXT[];
BEGIN
  SELECT "id" INTO admin_id FROM "User" WHERE "email" = 'syedabdulkareem.13@gmail.com' LIMIT 1;
  IF admin_id IS NULL THEN
    RAISE NOTICE 'Admin user not found — skipping dummy cleanup';
    RETURN;
  END IF;

  SELECT COALESCE(array_agg("id"), '{}') INTO dummy_ids
  FROM "User"
  WHERE "email" LIKE '%@nova.crm' AND "id" <> admin_id;

  IF array_length(dummy_ids, 1) IS NULL THEN
    RAISE NOTICE 'No dummy users found';
    RETURN;
  END IF;

  -- Reassign ownership to the admin.
  UPDATE "Lead" SET "ownerId" = admin_id WHERE "ownerId" = ANY(dummy_ids);
  UPDATE "Opportunity" SET "ownerId" = admin_id WHERE "ownerId" = ANY(dummy_ids);
  UPDATE "Opportunity" SET "revenueOwnerId" = admin_id WHERE "revenueOwnerId" = ANY(dummy_ids);
  UPDATE "Activity" SET "ownerId" = admin_id WHERE "ownerId" = ANY(dummy_ids);
  UPDATE "Project" SET "ownerId" = admin_id WHERE "ownerId" = ANY(dummy_ids);
  UPDATE "ProjectDeliverable" SET "ownerId" = admin_id WHERE "ownerId" = ANY(dummy_ids);
  UPDATE "ProjectRaidItem" SET "ownerId" = admin_id WHERE "ownerId" = ANY(dummy_ids);
  UPDATE "ApprovalRequest" SET "requestedById" = admin_id WHERE "requestedById" = ANY(dummy_ids);
  UPDATE "ApprovalStep" SET "approverId" = NULL WHERE "approverId" = ANY(dummy_ids);
  UPDATE "Lead" SET "cancelledById" = admin_id WHERE "cancelledById" = ANY(dummy_ids);
  UPDATE "Opportunity" SET "cancelledById" = admin_id WHERE "cancelledById" = ANY(dummy_ids);
  UPDATE "RFQ" SET "cancelledById" = admin_id WHERE "cancelledById" = ANY(dummy_ids);
  UPDATE "Quotation" SET "cancelledById" = admin_id WHERE "cancelledById" = ANY(dummy_ids);

  -- Their personal rows go away with them.
  DELETE FROM "Notification" WHERE "userId" = ANY(dummy_ids);
  DELETE FROM "Account" WHERE "userId" = ANY(dummy_ids);
  DELETE FROM "Session" WHERE "userId" = ANY(dummy_ids);

  DELETE FROM "User" WHERE "id" = ANY(dummy_ids);
  RAISE NOTICE 'Removed % dummy user(s), ownership reassigned to admin', array_length(dummy_ids, 1);
END $$;
