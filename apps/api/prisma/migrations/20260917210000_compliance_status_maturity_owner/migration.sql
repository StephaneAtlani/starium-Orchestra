-- AlterTable
ALTER TABLE "ComplianceStatus" ADD COLUMN "maturityLevel" INTEGER;
ALTER TABLE "ComplianceStatus" ADD COLUMN "ownerUserId" TEXT;

-- CreateIndex
CREATE INDEX "ComplianceStatus_clientId_ownerUserId_idx" ON "ComplianceStatus"("clientId", "ownerUserId");

-- AddForeignKey
ALTER TABLE "ComplianceStatus" ADD CONSTRAINT "ComplianceStatus_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
