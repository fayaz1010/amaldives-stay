-- amaldives STAY: Promote iCal OTA stays to first-class Booking rows.
-- Adds a unique icalUid column used as the dedupe key when the iCal sync
-- creates Booking rows from OTA reservations. Idempotent: safe to re-run.

ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "icalUid" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Booking_icalUid_key" ON "Booking"("icalUid");
