-- Manzil One · Access fixes + team consolidation
-- Idempotent — safe to run multiple times. Run in Supabase SQL Editor.

-- 1) Admin area is for the admin tiers only: strip ADMIN-module access from
--    every other role's already-seeded matrix rows (hides the Admin nav item).
UPDATE "RolePermission"
SET "canRead" = false, "canCreate" = false, "canUpdate" = false, "canDelete" = false,
    "canCancel" = false, "canReopen" = false, "canApprove" = false
WHERE "module" = 'ADMIN'
  AND "role" NOT IN ('ADMIN', 'SUPER_ADMIN', 'SUPER_USER');

-- 2) The two colleagues who signed up (each auto-created their own empty
--    organization) join YOUR organization as Sales Owners — adjust their
--    roles afterwards in Admin -> Users.
DO $$
DECLARE
  my_org TEXT;
  moved_user RECORD;
  old_org TEXT;
  remaining INT;
BEGIN
  SELECT "organizationId" INTO my_org FROM "User"
  WHERE "email" = 'syedabdulkareem.13@gmail.com' LIMIT 1;
  IF my_org IS NULL THEN
    RAISE NOTICE 'Super Admin not found — skipping';
    RETURN;
  END IF;

  FOR moved_user IN
    SELECT "id", "organizationId", "email" FROM "User"
    WHERE "email" IN ('irshadbaig@digiwareconnect.com', 'syedazeeem.13@gmail.com')
      AND "organizationId" <> my_org
  LOOP
    old_org := moved_user."organizationId";
    UPDATE "User"
    SET "organizationId" = my_org, "role" = 'SALES_OWNER', "isActive" = true
    WHERE "id" = moved_user."id";
    -- Their notifications belonged to the old org — drop to avoid cross-org rows.
    DELETE FROM "Notification" WHERE "userId" = moved_user."id";
    RAISE NOTICE 'Moved % into your organization as SALES_OWNER', moved_user."email";

    -- Remove the now-empty auto-created org (cascades clean its seeded config).
    SELECT COUNT(*) INTO remaining FROM "User" WHERE "organizationId" = old_org;
    IF remaining = 0 THEN
      DELETE FROM "Organization" WHERE "id" = old_org;
      RAISE NOTICE 'Deleted empty organization %', old_org;
    END IF;
  END LOOP;
END $$;
