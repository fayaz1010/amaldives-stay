-- TenantMembership.role was created as plain TEXT (see
-- 2026-05-23-tenant-memberships.sql) but prisma/schema.prisma has always
-- declared it as the UserRole enum. Prisma therefore binds `role` filter
-- params as ::"UserRole", which Postgres refuses to compare against a text
-- column ("operator does not exist: text = UserRole") — silently breaking
-- every `where: { role: ... }` query against this table (e.g. the OTA email
-- review queue's staff-alert lookup could never find a TENANT_ADMIN).
-- Idempotent: if the column is already the UserRole enum, the cast is a
-- harmless no-op re-conversion.
DO $$
BEGIN
  ALTER TABLE "TenantMembership"
    ALTER COLUMN "role" TYPE "UserRole" USING "role"::text::"UserRole";
EXCEPTION
  WHEN invalid_text_representation THEN
    RAISE NOTICE 'TenantMembership.role has a value outside UserRole — skipping, fix data first';
END $$;
