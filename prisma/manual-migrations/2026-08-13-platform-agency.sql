-- Platform-level agencies: Agency.tenantId becomes nullable.
-- null tenantId = platform agency that books across all ACTIVE tenants.
-- Additive + idempotent; existing rows keep their tenant scoping.
ALTER TABLE "Agency" ALTER COLUMN "tenantId" DROP NOT NULL;
