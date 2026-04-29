-- CreateEnum
CREATE TYPE "Result" AS ENUM ('FAILED', 'WINNER', 'BIG_WINNER', 'SPENT_BUT_POOR_PERFORMANCE');

-- AlterTable
ALTER TABLE "Batch" ADD COLUMN     "number" INTEGER,
ADD COLUMN     "sealed" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Creative" ADD COLUMN     "adNumber" TEXT,
ADD COLUMN     "extraInfo" TEXT,
ADD COLUMN     "launchDate" TIMESTAMP(3),
ADD COLUMN     "result" "Result",
ADD COLUMN     "roas" DOUBLE PRECISION,
ADD COLUMN     "spend" DOUBLE PRECISION;
