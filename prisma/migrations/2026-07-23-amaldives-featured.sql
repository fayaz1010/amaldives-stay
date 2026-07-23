-- Vayves ↔ amaldives.com featuring: owner opt-in flag.
--
-- When "amaldivesFeatured" is TRUE (and "amaldivesSlug" is set) the property is
-- promoted in the "Book Direct — Verified" featured grid on amaldives.com,
-- served by GET /api/public/amaldives/listings. Off by default so existing
-- tenants are not surfaced until they explicitly opt in from the Web admin.
--
-- Additive + defaulted + idempotent: safe to run on production while live.

ALTER TABLE "Tenant"
  ADD COLUMN IF NOT EXISTS "amaldivesFeatured" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "Tenant_amaldivesFeatured_idx"
  ON "Tenant" ("amaldivesFeatured");
