-- Manzil One · Role taxonomy — PART 1 of 2 (enum values)
-- Run this FIRST, on its own. Postgres cannot add an enum value and use it in
-- the same transaction, so part 2 must be run as a SEPARATE execution.

ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SUPER_USER';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SALES_OWNER';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SALES_HEAD';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'FINANCE_ANALYST';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'FINANCE_HEAD';
