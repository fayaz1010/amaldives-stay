-- Multi-property Phase 5: propertyId on operational + staff models.
-- Idempotent — safe to re-run.

ALTER TABLE "HousekeepingTask"   ADD COLUMN IF NOT EXISTS "propertyId" TEXT;
ALTER TABLE "MaintenanceRequest" ADD COLUMN IF NOT EXISTS "propertyId" TEXT;
ALTER TABLE "ArrivalRecord"      ADD COLUMN IF NOT EXISTS "propertyId" TEXT;
ALTER TABLE "DepartureRecord"    ADD COLUMN IF NOT EXISTS "propertyId" TEXT;
ALTER TABLE "StaffClockRecord"   ADD COLUMN IF NOT EXISTS "propertyId" TEXT;
ALTER TABLE "StaffTask"          ADD COLUMN IF NOT EXISTS "propertyId" TEXT;
ALTER TABLE "ServiceOrder"       ADD COLUMN IF NOT EXISTS "propertyId" TEXT;
ALTER TABLE "MinIBarUsage"       ADD COLUMN IF NOT EXISTS "propertyId" TEXT;

CREATE INDEX IF NOT EXISTS "HousekeepingTask_propertyId_idx"   ON "HousekeepingTask"("propertyId");
CREATE INDEX IF NOT EXISTS "MaintenanceRequest_propertyId_idx" ON "MaintenanceRequest"("propertyId");
CREATE INDEX IF NOT EXISTS "ArrivalRecord_propertyId_idx"      ON "ArrivalRecord"("propertyId");
CREATE INDEX IF NOT EXISTS "DepartureRecord_propertyId_idx"    ON "DepartureRecord"("propertyId");
CREATE INDEX IF NOT EXISTS "StaffClockRecord_propertyId_idx"   ON "StaffClockRecord"("propertyId");
CREATE INDEX IF NOT EXISTS "StaffTask_propertyId_idx"          ON "StaffTask"("propertyId");
CREATE INDEX IF NOT EXISTS "ServiceOrder_propertyId_idx"       ON "ServiceOrder"("propertyId");
CREATE INDEX IF NOT EXISTS "MinIBarUsage_propertyId_idx"       ON "MinIBarUsage"("propertyId");

-- Backfill from the related room (HousekeepingTask.roomId is required)
UPDATE "HousekeepingTask" t SET "propertyId" = r."propertyId"
  FROM "Room" r WHERE t."roomId" = r."id" AND t."propertyId" IS NULL;
UPDATE "MaintenanceRequest" t SET "propertyId" = r."propertyId"
  FROM "Room" r WHERE t."roomId" = r."id" AND t."propertyId" IS NULL;
UPDATE "MinIBarUsage" t SET "propertyId" = r."propertyId"
  FROM "Room" r WHERE t."roomId" = r."id" AND t."propertyId" IS NULL;

-- Backfill from the related booking
UPDATE "ArrivalRecord" a SET "propertyId" = b."propertyId"
  FROM "Booking" b WHERE a."bookingId" = b."id" AND a."propertyId" IS NULL;
UPDATE "DepartureRecord" d SET "propertyId" = b."propertyId"
  FROM "Booking" b WHERE d."bookingId" = b."id" AND d."propertyId" IS NULL;
UPDATE "StaffTask" t SET "propertyId" = b."propertyId"
  FROM "Booking" b WHERE t."bookingId" = b."id" AND t."propertyId" IS NULL;
UPDATE "ServiceOrder" o SET "propertyId" = b."propertyId"
  FROM "Booking" b WHERE o."bookingId" = b."id" AND o."propertyId" IS NULL;

-- Single-property tenants: any rows still unattributed map to their one property.
UPDATE "StaffClockRecord" sc SET "propertyId" = pr."id"
  FROM "Property" pr
 WHERE sc."tenantId" = pr."tenantId" AND sc."propertyId" IS NULL
   AND (SELECT COUNT(*) FROM "Property" p2 WHERE p2."tenantId" = sc."tenantId") = 1;
