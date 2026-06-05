-- Platform expansion: Stripe billing, OTA guest fields, booking checkout sessions

ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "stripeSubscriptionId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Tenant_stripeCustomerId_key" ON "Tenant"("stripeCustomerId");

ALTER TABLE "ExternalCalendarBlock" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "ExternalCalendarBlock" ADD COLUMN IF NOT EXISTS "guestName" TEXT;
ALTER TABLE "ExternalCalendarBlock" ADD COLUMN IF NOT EXISTS "guestEmail" TEXT;
ALTER TABLE "ExternalCalendarBlock" ADD COLUMN IF NOT EXISTS "guestPhone" TEXT;

ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "stripeCheckoutSessionId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Booking_stripeCheckoutSessionId_key" ON "Booking"("stripeCheckoutSessionId");
