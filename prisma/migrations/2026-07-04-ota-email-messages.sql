-- amaldives STAY: OTA email ingest audit trail + review queue.
-- One row per inbound OTA reservation email: raw content, regex extraction,
-- Gemini verification, and (once reviewed) the final outcome. Also doubles
-- as labeled training data for a future dedicated extraction model.
-- Idempotent: safe to re-run.

DO $$ BEGIN
  CREATE TYPE "OtaMessageStatus" AS ENUM ('CREATED', 'UPDATED', 'CANCELLED', 'NEEDS_REVIEW', 'REJECTED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "OtaEmailMessage" (
  "id"            TEXT NOT NULL PRIMARY KEY,
  "tenantId"      TEXT,
  "fromAddress"   TEXT NOT NULL,
  "toAddress"     TEXT NOT NULL,
  "subject"       TEXT NOT NULL,
  "rawText"       TEXT,
  "rawHtml"       TEXT,
  "source"        TEXT NOT NULL,
  "regexResult"   JSONB,
  "aiResult"      JSONB,
  "discrepancies" JSONB,
  "confidence"    DOUBLE PRECISION,
  "status"        "OtaMessageStatus" NOT NULL,
  "bookingId"     TEXT,
  "reviewedBy"    TEXT,
  "reviewedAt"    TIMESTAMP(3),
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "OtaEmailMessage_tenantId_status_idx"
  ON "OtaEmailMessage"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "OtaEmailMessage_createdAt_idx"
  ON "OtaEmailMessage"("createdAt");
CREATE INDEX IF NOT EXISTS "OtaEmailMessage_bookingId_idx"
  ON "OtaEmailMessage"("bookingId");

DO $$ BEGIN
  ALTER TABLE "OtaEmailMessage"
    ADD CONSTRAINT "OtaEmailMessage_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "OtaEmailMessage"
    ADD CONSTRAINT "OtaEmailMessage_bookingId_fkey"
    FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
