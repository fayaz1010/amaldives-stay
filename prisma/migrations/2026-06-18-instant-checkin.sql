-- Instant check-in / checkout QR codes
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "checkInCode" TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "checkoutCode" TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "keysIssued" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "checkedInAt" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "checkoutReadyAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "Booking_checkInCode_key" ON "Booking"("checkInCode");
CREATE UNIQUE INDEX IF NOT EXISTS "Booking_checkoutCode_key" ON "Booking"("checkoutCode");
