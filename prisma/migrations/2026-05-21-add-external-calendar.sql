-- amaldives STAY: Add external iCal calendar sync (Booking.com / Airbnb / Vrbo)
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS "ExternalCalendarFeed" (
  "id"             TEXT NOT NULL PRIMARY KEY,
  "tenantId"       TEXT NOT NULL,
  "roomId"         TEXT,
  "label"          TEXT NOT NULL,
  "source"         TEXT NOT NULL,
  "icalUrl"        TEXT NOT NULL,
  "isActive"       BOOLEAN NOT NULL DEFAULT true,
  "lastSyncedAt"   TIMESTAMP(3),
  "lastError"      TEXT,
  "lastEventCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "ExternalCalendarFeed_tenantId_icalUrl_key"
  ON "ExternalCalendarFeed"("tenantId", "icalUrl");
CREATE INDEX IF NOT EXISTS "ExternalCalendarFeed_tenantId_idx"
  ON "ExternalCalendarFeed"("tenantId");
CREATE INDEX IF NOT EXISTS "ExternalCalendarFeed_roomId_idx"
  ON "ExternalCalendarFeed"("roomId");

ALTER TABLE "ExternalCalendarFeed"
  ADD CONSTRAINT "ExternalCalendarFeed_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExternalCalendarFeed"
  ADD CONSTRAINT "ExternalCalendarFeed_roomId_fkey"
  FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "ExternalCalendarBlock" (
  "id"        TEXT NOT NULL PRIMARY KEY,
  "feedId"    TEXT NOT NULL,
  "tenantId"  TEXT NOT NULL,
  "roomId"    TEXT,
  "uid"       TEXT NOT NULL,
  "summary"   TEXT,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate"   TIMESTAMP(3) NOT NULL,
  "source"    TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "ExternalCalendarBlock_feedId_uid_key"
  ON "ExternalCalendarBlock"("feedId", "uid");
CREATE INDEX IF NOT EXISTS "ExternalCalendarBlock_tenantId_startDate_endDate_idx"
  ON "ExternalCalendarBlock"("tenantId", "startDate", "endDate");
CREATE INDEX IF NOT EXISTS "ExternalCalendarBlock_roomId_startDate_endDate_idx"
  ON "ExternalCalendarBlock"("roomId", "startDate", "endDate");

ALTER TABLE "ExternalCalendarBlock"
  ADD CONSTRAINT "ExternalCalendarBlock_feedId_fkey"
  FOREIGN KEY ("feedId") REFERENCES "ExternalCalendarFeed"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExternalCalendarBlock"
  ADD CONSTRAINT "ExternalCalendarBlock_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExternalCalendarBlock"
  ADD CONSTRAINT "ExternalCalendarBlock_roomId_fkey"
  FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;
