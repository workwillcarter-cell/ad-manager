-- AlterTable
ALTER TABLE "Creative" ADD COLUMN     "dropboxPath" TEXT,
ADD COLUMN     "transferError" TEXT,
ADD COLUMN     "transferStatus" TEXT,
ADD COLUMN     "transferredAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "IntegrationToken" (
    "provider" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "accessToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationToken_pkey" PRIMARY KEY ("provider")
);
