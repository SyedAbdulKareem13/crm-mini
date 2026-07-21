-- Manzil One · Role taxonomy — PART 2 of 2 (assignments)
-- Run AFTER part 1, as a separate execution.

-- You are the Super Admin (works whether or not the identity merge ran yet).
UPDATE "User" SET "role" = 'SUPER_ADMIN'
WHERE "email" IN ('syedabdulkareem.13@gmail.com', 'admin@nova.crm');

-- Map any remaining legacy roles onto the new taxonomy.
UPDATE "User" SET "role" = 'SALES_OWNER'     WHERE "role" = 'SALES_EXEC';
UPDATE "User" SET "role" = 'SALES_HEAD'      WHERE "role" = 'SALES_MANAGER';
UPDATE "User" SET "role" = 'FINANCE_ANALYST' WHERE "role" = 'FINANCE';
UPDATE "User" SET "role" = 'SALES_OWNER'     WHERE "role" = 'REVENUE_OWNER';

-- Drop matrix rows seeded for legacy roles (the new roles re-seed on first
-- read with the new defaults).
DELETE FROM "RolePermission"
WHERE "role" IN ('SALES_EXEC', 'SALES_MANAGER', 'FINANCE', 'REVENUE_OWNER', 'VIEWER');
