-- Manzil One · RBAC, admin identity (MERGE variant) + dummy cleanup — v2
-- Replaces 2026-07-21-rbac-and-identity.sql, which failed because an account
-- with syedabdulkareem.13@gmail.com already exists (auto-created by a Google
-- sign-in). This version MERGES that account into the admin: its Google OAuth
-- link moves to the admin user, so "Continue with Google" signs into admin.
-- Idempotent — safe to run multiple times. Run in Supabase SQL Editor.

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

-- 3) Merge the pre-existing Gmail account into the admin, then rename admin.
DO $$
DECLARE
  admin_id TEXT;
  admin_org TEXT;
  g_id TEXT;
  g_org TEXT;
  g_org_users INT;
BEGIN
  SELECT "id", "organizationId" INTO admin_id, admin_org FROM "User" WHERE "email" = 'admin@nova.crm' LIMIT 1;
  SELECT "id", "organizationId" INTO g_id, g_org FROM "User" WHERE "email" = 'syedabdulkareem.13@gmail.com' LIMIT 1;

  IF admin_id IS NULL AND g_id IS NOT NULL THEN
    -- Already merged on a previous run: just enforce name/role/verified.
    UPDATE "User" SET "name" = 'Syed Abdul Kareem', "role" = 'ADMIN',
      "emailVerified" = COALESCE("emailVerified", CURRENT_TIMESTAMP), "isActive" = true
    WHERE "id" = g_id;
    RAISE NOTICE 'Admin already migrated — identity re-asserted';
    RETURN;
  END IF;
  IF admin_id IS NULL THEN
    RAISE NOTICE 'No admin@nova.crm user found — nothing to do';
    RETURN;
  END IF;

  IF g_id IS NOT NULL THEN
    -- Move the Google OAuth link (and anything it owns) onto the admin user.
    UPDATE "Account" SET "userId" = admin_id WHERE "userId" = g_id;
    DELETE FROM "Session" WHERE "userId" = g_id;
    DELETE FROM "Notification" WHERE "userId" = g_id;
    UPDATE "Lead" SET "ownerId" = admin_id WHERE "ownerId" = g_id;
    UPDATE "Opportunity" SET "ownerId" = admin_id WHERE "ownerId" = g_id;
    UPDATE "Opportunity" SET "revenueOwnerId" = admin_id WHERE "revenueOwnerId" = g_id;
    UPDATE "Activity" SET "ownerId" = admin_id WHERE "ownerId" = g_id;
    UPDATE "Project" SET "ownerId" = admin_id WHERE "ownerId" = g_id;
    UPDATE "ProjectDeliverable" SET "ownerId" = admin_id WHERE "ownerId" = g_id;
    UPDATE "ProjectRaidItem" SET "ownerId" = admin_id WHERE "ownerId" = g_id;
    DELETE FROM "User" WHERE "id" = g_id;

    -- If the Google sign-in auto-created its own (now-empty) organization,
    -- remove it — cascades clean its seeded config.
    IF g_org IS NOT NULL AND g_org <> admin_org THEN
      SELECT COUNT(*) INTO g_org_users FROM "User" WHERE "organizationId" = g_org;
      IF g_org_users = 0 THEN
        DELETE FROM "Organization" WHERE "id" = g_org;
        RAISE NOTICE 'Removed empty auto-created organization %', g_org;
      END IF;
    END IF;
  END IF;

  UPDATE "User"
  SET "email" = 'syedabdulkareem.13@gmail.com',
      "name" = 'Syed Abdul Kareem',
      "emailVerified" = COALESCE("emailVerified", CURRENT_TIMESTAMP)
  WHERE "id" = admin_id;
  RAISE NOTICE 'Admin identity updated (Google link merged: %)', g_id IS NOT NULL;
END $$;

-- 4) Dummy employee cleanup: reassign to admin, then delete.
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

  DELETE FROM "Notification" WHERE "userId" = ANY(dummy_ids);
  DELETE FROM "Account" WHERE "userId" = ANY(dummy_ids);
  DELETE FROM "Session" WHERE "userId" = ANY(dummy_ids);
  DELETE FROM "User" WHERE "id" = ANY(dummy_ids);
  RAISE NOTICE 'Removed % dummy user(s)', array_length(dummy_ids, 1);
END $$;
