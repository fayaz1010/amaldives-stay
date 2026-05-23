-- amaldives STAY: Multi-tenant memberships
--
-- Today User.tenantId is a single FK, so one email can only belong to one
-- STAY tenant. This migration adds a junction table so one user can be a
-- member of many tenants (with a different role per tenant). The owner
-- with three guesthouses no longer needs three separate email logins.
--
-- Strategy:
--   1. Create TenantMembership table.
--   2. Backfill from existing User.tenantId — every current user gets a
--      membership row matching their role and isDefault=true.
--   3. KEEP User.tenantId as the "active tenant in this session" pointer
--      so the thousands of existing queries (prisma.x.findMany({ where:
--      { tenantId } })) keep working without touching every call site.
--   4. A future POST /api/account/switch-tenant updates User.tenantId to
--      flip the active tenant for that user's session.
--
-- Idempotent: safe to re-run.

-- ── Table ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "TenantMembership" (
  "id"         TEXT NOT NULL PRIMARY KEY,
  "userId"     TEXT NOT NULL,
  "tenantId"   TEXT NOT NULL,
  "role"       TEXT NOT NULL,
  -- isDefault: if a session has no User.tenantId set (or it points at a
  -- tenant the user no longer has access to), the default-membership
  -- tenant is chosen as a fallback. Exactly one membership per user
  -- should be default; enforced in app code, not DB (PG can't express
  -- "exactly one" cheaply without partial indexes which complicate
  -- updates).
  "isDefault"  BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TenantMembership_user_fk" FOREIGN KEY ("userId")
    REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TenantMembership_tenant_fk" FOREIGN KEY ("tenantId")
    REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "TenantMembership_userId_tenantId_key"
  ON "TenantMembership" ("userId", "tenantId");
CREATE INDEX IF NOT EXISTS "TenantMembership_userId_idx"
  ON "TenantMembership" ("userId");
CREATE INDEX IF NOT EXISTS "TenantMembership_tenantId_idx"
  ON "TenantMembership" ("tenantId");

-- ── Backfill ─────────────────────────────────────────────────────────
-- For every existing User who has a tenantId, create a membership row
-- (role copied from User.role, marked as default). gen_random_uuid()
-- is available on Postgres ≥ 13; on Neon it's enabled by default.
INSERT INTO "TenantMembership" (
  "id", "userId", "tenantId", "role", "isDefault", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text   AS "id",
  u."id"                    AS "userId",
  u."tenantId"              AS "tenantId",
  u."role"::text            AS "role",
  TRUE                      AS "isDefault",
  u."createdAt"             AS "createdAt",
  u."updatedAt"             AS "updatedAt"
FROM "User" u
WHERE u."tenantId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "TenantMembership" m
    WHERE m."userId" = u."id" AND m."tenantId" = u."tenantId"
  );

-- ── Sanity check (informational) ─────────────────────────────────────
-- After this runs, every User with a tenantId should have exactly one
-- membership row marked isDefault=true. The runner script will report
-- the counts.
