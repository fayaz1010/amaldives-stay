-- TASK-03: Guest ↔ hotel Stay chat.
-- One conversation per booking (StayConversation), messages tagged with the
-- sender role (StayMessage). Idempotent so it can be re-run against staging.

DO $$ BEGIN
  CREATE TYPE "ChatSenderRole" AS ENUM ('GUEST', 'STAFF');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "StayConversation" (
  "id"        TEXT NOT NULL,
  "tenantId"  TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "openedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedAt"  TIMESTAMP(3),
  CONSTRAINT "StayConversation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StayConversation_bookingId_key"
  ON "StayConversation"("bookingId");
CREATE INDEX IF NOT EXISTS "StayConversation_tenantId_idx"
  ON "StayConversation"("tenantId");

DO $$ BEGIN
  ALTER TABLE "StayConversation"
    ADD CONSTRAINT "StayConversation_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "StayConversation"
    ADD CONSTRAINT "StayConversation_bookingId_fkey"
    FOREIGN KEY ("bookingId") REFERENCES "Booking"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "StayMessage" (
  "id"             TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "senderRole"     "ChatSenderRole" NOT NULL,
  "senderUserId"   TEXT,
  "body"           TEXT NOT NULL,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "readAt"         TIMESTAMP(3),
  CONSTRAINT "StayMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "StayMessage_conversationId_createdAt_idx"
  ON "StayMessage"("conversationId", "createdAt");
CREATE INDEX IF NOT EXISTS "StayMessage_senderUserId_idx"
  ON "StayMessage"("senderUserId");

DO $$ BEGIN
  ALTER TABLE "StayMessage"
    ADD CONSTRAINT "StayMessage_conversationId_fkey"
    FOREIGN KEY ("conversationId") REFERENCES "StayConversation"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "StayMessage"
    ADD CONSTRAINT "StayMessage_senderUserId_fkey"
    FOREIGN KEY ("senderUserId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
