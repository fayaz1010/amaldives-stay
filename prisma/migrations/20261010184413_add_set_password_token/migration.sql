-- AlterTable
ALTER TABLE "User" ADD COLUMN "setPasswordToken" TEXT,
ADD COLUMN "setPasswordTokenExpiresAt" TIMESTAMP(3);
