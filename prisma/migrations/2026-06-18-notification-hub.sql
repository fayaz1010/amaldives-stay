-- TASK-11a: Notification hub — persistent outbox for guest/staff messages.
-- queueNotification() writes here; sendPendingNotifications() (TASK-11b cron)
-- drains rows whose scheduledFor has passed. Idempotent: safe to re-run.

DO $$ BEGIN
  CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'SMS', 'WHATSAPP');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "Notification" (
  "id"           TEXT NOT NULL,
  "tenantId"     TEXT NOT NULL,
  "bookingId"    TEXT,
  "channel"      "NotificationChannel" NOT NULL DEFAULT 'EMAIL',
  "type"         TEXT NOT NULL,
  "to"           TEXT NOT NULL,
  "subject"      TEXT,
  "body"         TEXT NOT NULL,
  "payload"      JSONB,
  "status"       "NotificationStatus" NOT NULL DEFAULT 'PENDING',
  "scheduledFor" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentAt"       TIMESTAMP(3),
  "attempts"     INTEGER NOT NULL DEFAULT 0,
  "lastError"    TEXT,
  "providerId"   TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Notification_tenantId_idx"
  ON "Notification"("tenantId");
CREATE INDEX IF NOT EXISTS "Notification_status_scheduledFor_idx"
  ON "Notification"("status", "scheduledFor");
CREATE INDEX IF NOT EXISTS "Notification_bookingId_idx"
  ON "Notification"("bookingId");

DO $$ BEGIN
  ALTER TABLE "Notification"
    ADD CONSTRAINT "Notification_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
