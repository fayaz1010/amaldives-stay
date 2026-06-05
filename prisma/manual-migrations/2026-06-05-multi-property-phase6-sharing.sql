-- Multi-property Phase 6: flexible sharing — propertyId on catalog/resource models.
-- Idempotent. propertyId NULL = shared across all properties (the default).

ALTER TABLE "Service"                ADD COLUMN IF NOT EXISTS "propertyId" TEXT;
ALTER TABLE "InventoryItem"          ADD COLUMN IF NOT EXISTS "propertyId" TEXT;
ALTER TABLE "LogisticsInventoryItem" ADD COLUMN IF NOT EXISTS "propertyId" TEXT;
ALTER TABLE "LogisticsAsset"         ADD COLUMN IF NOT EXISTS "propertyId" TEXT;
ALTER TABLE "MinIBarItem"            ADD COLUMN IF NOT EXISTS "propertyId" TEXT;
ALTER TABLE "FnBOutlet"              ADD COLUMN IF NOT EXISTS "propertyId" TEXT;
ALTER TABLE "RatePlan"               ADD COLUMN IF NOT EXISTS "propertyId" TEXT;
ALTER TABLE "TransportOption"        ADD COLUMN IF NOT EXISTS "propertyId" TEXT;

CREATE INDEX IF NOT EXISTS "Service_propertyId_idx"                ON "Service"("propertyId");
CREATE INDEX IF NOT EXISTS "InventoryItem_propertyId_idx"          ON "InventoryItem"("propertyId");
CREATE INDEX IF NOT EXISTS "LogisticsInventoryItem_propertyId_idx" ON "LogisticsInventoryItem"("propertyId");
CREATE INDEX IF NOT EXISTS "LogisticsAsset_propertyId_idx"         ON "LogisticsAsset"("propertyId");
CREATE INDEX IF NOT EXISTS "MinIBarItem_propertyId_idx"            ON "MinIBarItem"("propertyId");
CREATE INDEX IF NOT EXISTS "FnBOutlet_propertyId_idx"              ON "FnBOutlet"("propertyId");
CREATE INDEX IF NOT EXISTS "RatePlan_propertyId_idx"               ON "RatePlan"("propertyId");
CREATE INDEX IF NOT EXISTS "TransportOption_propertyId_idx"        ON "TransportOption"("propertyId");

-- Single-property tenants: attribute existing catalog rows to their one property
-- so toggling a category to "per-property" works immediately. (Multi-property
-- tenants keep NULL = shared until the owner decides.)
DO $$
DECLARE tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['Service','InventoryItem','LogisticsInventoryItem','LogisticsAsset','MinIBarItem','FnBOutlet','RatePlan','TransportOption']
  LOOP
    EXECUTE format($f$
      UPDATE %I t SET "propertyId" = pr."id"
        FROM "Property" pr
       WHERE t."tenantId" = pr."tenantId" AND t."propertyId" IS NULL
         AND (SELECT COUNT(*) FROM "Property" p2 WHERE p2."tenantId" = t."tenantId") = 1
    $f$, tbl);
  END LOOP;
END $$;
