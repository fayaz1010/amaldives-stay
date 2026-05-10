-- amaldives STAY: Add commission revenue tracking columns
-- Run this against your PostgreSQL database if using prisma migrate deploy doesn't work

-- Add commission tracking to Tenant
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 0.04;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "isVerifiedDirect" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "amaldivesSlug" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Tenant_amaldivesSlug_key" ON "Tenant"("amaldivesSlug");

-- Add platform fee to Booking
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "platformFee" DOUBLE PRECISION NOT NULL DEFAULT 0;
