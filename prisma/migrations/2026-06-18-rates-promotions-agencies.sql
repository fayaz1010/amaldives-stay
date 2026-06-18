-- Rack rates, promotions, B2B agencies, booking.agencyId, TRAVEL_AGENT role.
-- Idempotent — safe to re-run on staging.

ALTER TABLE "Room" ADD COLUMN IF NOT EXISTS "rackRate" DOUBLE PRECISION;

DO $$ BEGIN
  ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'TRAVEL_AGENT';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "PromotionAppliesTo" AS ENUM ('RACK', 'ALL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "Promotion" (
  "id"              TEXT NOT NULL,
  "tenantId"        TEXT NOT NULL,
  "propertyId"      TEXT,
  "code"            TEXT,
  "name"            TEXT NOT NULL,
  "description"     TEXT,
  "discountPercent" DOUBLE PRECISION NOT NULL,
  "startDate"       TIMESTAMP(3) NOT NULL,
  "endDate"         TIMESTAMP(3) NOT NULL,
  "isActive"        BOOLEAN NOT NULL DEFAULT true,
  "appliesTo"       "PromotionAppliesTo" NOT NULL DEFAULT 'RACK',
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Promotion_tenantId_code_key" ON "Promotion"("tenantId", "code");
CREATE INDEX IF NOT EXISTS "Promotion_tenantId_startDate_endDate_idx" ON "Promotion"("tenantId", "startDate", "endDate");
CREATE INDEX IF NOT EXISTS "Promotion_propertyId_idx" ON "Promotion"("propertyId");

DO $$ BEGIN
  ALTER TABLE "Promotion"
    ADD CONSTRAINT "Promotion_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Promotion"
    ADD CONSTRAINT "Promotion_propertyId_fkey"
    FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "AgencyRole" AS ENUM ('ADMIN', 'AGENT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "Agency" (
  "id"            TEXT NOT NULL,
  "tenantId"      TEXT NOT NULL,
  "name"          TEXT NOT NULL,
  "markupPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "creditTerms"   TEXT,
  "isActive"      BOOLEAN NOT NULL DEFAULT true,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Agency_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Agency_tenantId_idx" ON "Agency"("tenantId");

DO $$ BEGIN
  ALTER TABLE "Agency"
    ADD CONSTRAINT "Agency_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "AgencyUser" (
  "id"        TEXT NOT NULL,
  "agencyId"  TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "role"      "AgencyRole" NOT NULL DEFAULT 'AGENT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AgencyUser_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AgencyUser_userId_key" ON "AgencyUser"("userId");
CREATE INDEX IF NOT EXISTS "AgencyUser_agencyId_idx" ON "AgencyUser"("agencyId");

DO $$ BEGIN
  ALTER TABLE "AgencyUser"
    ADD CONSTRAINT "AgencyUser_agencyId_fkey"
    FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "AgencyUser"
    ADD CONSTRAINT "AgencyUser_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "agencyId" TEXT;
CREATE INDEX IF NOT EXISTS "Booking_agencyId_idx" ON "Booking"("agencyId");

DO $$ BEGIN
  ALTER TABLE "Booking"
    ADD CONSTRAINT "Booking_agencyId_fkey"
    FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
