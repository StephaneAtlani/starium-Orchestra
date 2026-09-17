-- CreateEnum
CREATE TYPE "ComplianceCampaignModality" AS ENUM ('SELF_ASSESSMENT', 'INTERNAL_AUDIT', 'EXTERNAL_AUDIT');

-- AlterTable
ALTER TABLE "ComplianceCampaign" ADD COLUMN     "scopeDomainKeys" JSONB,
ADD COLUMN     "modality" "ComplianceCampaignModality" NOT NULL DEFAULT 'SELF_ASSESSMENT',
ADD COLUMN     "ownerUserId" TEXT,
ADD COLUMN     "dueAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "ComplianceCampaign_ownerUserId_idx" ON "ComplianceCampaign"("ownerUserId");

-- AddForeignKey
ALTER TABLE "ComplianceCampaign" ADD CONSTRAINT "ComplianceCampaign_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
