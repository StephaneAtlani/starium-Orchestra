-- AlterTable
ALTER TABLE "ProjectTask" ADD COLUMN "complianceGapId" TEXT;

-- CreateIndex
CREATE INDEX "ProjectTask_clientId_complianceGapId_idx" ON "ProjectTask"("clientId", "complianceGapId");

-- CreateIndex
CREATE INDEX "ProjectTask_complianceGapId_idx" ON "ProjectTask"("complianceGapId");

-- AddForeignKey
ALTER TABLE "ProjectTask" ADD CONSTRAINT "ProjectTask_complianceGapId_fkey" FOREIGN KEY ("complianceGapId") REFERENCES "ComplianceGap"("id") ON DELETE SET NULL ON UPDATE CASCADE;
