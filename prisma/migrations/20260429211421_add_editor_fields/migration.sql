-- AlterTable
ALTER TABLE "Creative" ADD COLUMN     "editorDriveLink" TEXT,
ADD COLUMN     "editorNeedsRevision" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "editorNotes" TEXT,
ADD COLUMN     "editorRevisionComplete" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "editorRevisionDetails" TEXT,
ADD COLUMN     "editorStatus" TEXT,
ADD COLUMN     "usedInAd" TEXT;
