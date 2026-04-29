-- AlterTable
ALTER TABLE "Creative" ADD COLUMN     "aigNotes" TEXT,
ADD COLUMN     "aigStatus" TEXT,
ADD COLUMN     "needsRevision" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "projectType" TEXT,
ADD COLUMN     "revisionComplete" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "revisionDetails" TEXT;
