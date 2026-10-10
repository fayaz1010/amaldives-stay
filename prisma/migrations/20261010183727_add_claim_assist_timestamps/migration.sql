-- AlterTable
ALTER TABLE "ClaimAssistRequest" ADD COLUMN "rejectedReason" TEXT,
ADD COLUMN "verifiedAt" TIMESTAMP(3),
ADD COLUMN "rejectedAt" TIMESTAMP(3);
