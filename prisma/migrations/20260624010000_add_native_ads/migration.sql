-- CreateTable
CREATE TABLE "NativeBatch" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "number" INTEGER,
    "launchDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "NativeBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NativeAd" (
    "id" TEXT NOT NULL,
    "concept" TEXT NOT NULL,
    "briefLink" TEXT,
    "adNumber" TEXT,
    "status" TEXT,
    "style" TEXT,
    "extraInfo" TEXT,
    "learnings" TEXT,
    "launchDate" TIMESTAMP(3),
    "result" "Result",
    "spend" DOUBLE PRECISION,
    "roas" DOUBLE PRECISION,
    "batchId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NativeAd_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "NativeBatch" ADD CONSTRAINT "NativeBatch_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NativeAd" ADD CONSTRAINT "NativeAd_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "NativeBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NativeAd" ADD CONSTRAINT "NativeAd_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
