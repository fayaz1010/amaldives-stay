-- Multi-property Phase 2: per-property tax/MIRA config + propertyId on finance models.
-- Idempotent (ADD COLUMN / CREATE INDEX IF NOT EXISTS) — safe to re-run.

-- Per-property MIRA / tax configuration on Property
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "taxTin" TEXT;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "tgstRate" DOUBLE PRECISION;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "greenTaxUsdPerNight" DOUBLE PRECISION;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "serviceChargeRate" DOUBLE PRECISION;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "taxSettings" JSONB;

-- propertyId on finance models (nullable; scoping/MIRA)
ALTER TABLE "Expense"      ADD COLUMN IF NOT EXISTS "propertyId" TEXT;
ALTER TABLE "Payment"      ADD COLUMN IF NOT EXISTS "propertyId" TEXT;
ALTER TABLE "Report"       ADD COLUMN IF NOT EXISTS "propertyId" TEXT;
ALTER TABLE "PayrollEntry" ADD COLUMN IF NOT EXISTS "propertyId" TEXT;

CREATE INDEX IF NOT EXISTS "Expense_propertyId_idx"      ON "Expense"("propertyId");
CREATE INDEX IF NOT EXISTS "Payment_propertyId_idx"      ON "Payment"("propertyId");
CREATE INDEX IF NOT EXISTS "Report_propertyId_idx"       ON "Report"("propertyId");
CREATE INDEX IF NOT EXISTS "PayrollEntry_propertyId_idx" ON "PayrollEntry"("propertyId");

-- Backfill Payment.propertyId from its booking (always unambiguous)
UPDATE "Payment" p
   SET "propertyId" = b."propertyId"
  FROM "Booking" b
 WHERE p."bookingId" = b."id" AND p."propertyId" IS NULL;

-- Backfill Expense/Report/PayrollEntry for SINGLE-property tenants only
-- (exactly one property => unambiguous). Multi-property tenants attribute going forward.
UPDATE "Expense" e
   SET "propertyId" = pr."id"
  FROM "Property" pr
 WHERE e."tenantId" = pr."tenantId" AND e."propertyId" IS NULL
   AND (SELECT COUNT(*) FROM "Property" p2 WHERE p2."tenantId" = e."tenantId") = 1;

UPDATE "Report" r
   SET "propertyId" = pr."id"
  FROM "Property" pr
 WHERE r."tenantId" = pr."tenantId" AND r."propertyId" IS NULL
   AND (SELECT COUNT(*) FROM "Property" p2 WHERE p2."tenantId" = r."tenantId") = 1;

UPDATE "PayrollEntry" pe
   SET "propertyId" = pr."id"
  FROM "Property" pr
 WHERE pe."tenantId" = pr."tenantId" AND pe."propertyId" IS NULL
   AND (SELECT COUNT(*) FROM "Property" p2 WHERE p2."tenantId" = pe."tenantId") = 1;
