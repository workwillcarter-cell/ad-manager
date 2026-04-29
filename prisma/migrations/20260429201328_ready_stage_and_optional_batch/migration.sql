-- AlterEnum
ALTER TYPE "Stage" ADD VALUE 'READY';

-- DropForeignKey
ALTER TABLE "Creative" DROP CONSTRAINT "Creative_batchId_fkey";

-- AlterTable
ALTER TABLE "Creative" ALTER COLUMN "batchId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Creative" ADD CONSTRAINT "Creative_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
