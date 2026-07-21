-- DropForeignKey
ALTER TABLE "WorkTeam" DROP CONSTRAINT "WorkTeam_orgUnitId_fkey";

-- DropIndex
DROP INDEX "WorkTeam_clientId_orgUnitId_idx";

-- AlterTable
ALTER TABLE "WorkTeam" DROP COLUMN "orgUnitId",
ADD COLUMN "strategicDirectionId" TEXT;

-- CreateIndex
CREATE INDEX "WorkTeam_clientId_strategicDirectionId_idx" ON "WorkTeam"("clientId", "strategicDirectionId");

-- AddForeignKey
ALTER TABLE "WorkTeam" ADD CONSTRAINT "WorkTeam_strategicDirectionId_fkey" FOREIGN KEY ("strategicDirectionId") REFERENCES "StrategicDirection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
