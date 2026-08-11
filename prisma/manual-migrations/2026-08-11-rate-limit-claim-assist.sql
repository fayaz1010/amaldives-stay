-- Rate limiting + claim-assist requests (additive, idempotent).
CREATE TABLE IF NOT EXISTS "RateLimitHit" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RateLimitHit_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "RateLimitHit_key_createdAt_idx" ON "RateLimitHit"("key", "createdAt");

CREATE TABLE IF NOT EXISTS "ClaimAssistRequest" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "propertyName" TEXT,
  "contactName" TEXT,
  "email" TEXT NOT NULL,
  "phone" TEXT,
  "message" TEXT,
  "status" TEXT NOT NULL DEFAULT 'new',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClaimAssistRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ClaimAssistRequest_slug_createdAt_idx" ON "ClaimAssistRequest"("slug", "createdAt");
CREATE INDEX IF NOT EXISTS "ClaimAssistRequest_status_idx" ON "ClaimAssistRequest"("status");
