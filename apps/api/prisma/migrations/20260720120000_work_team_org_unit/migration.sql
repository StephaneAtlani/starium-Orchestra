-- AlterTable
ALTER TABLE "WorkTeam" ADD COLUMN "orgUnitId" TEXT;

-- CreateIndex
CREATE INDEX "WorkTeam_clientId_orgUnitId_idx" ON "WorkTeam"("clientId", "orgUnitId");

-- AddForeignKey
ALTER TABLE "WorkTeam" ADD CONSTRAINT "WorkTeam_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "OrgUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
