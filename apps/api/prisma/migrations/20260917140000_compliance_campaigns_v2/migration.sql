-- COMP.V2 — campagnes / instantanés d'audit (périmètre client)
CREATE TYPE "ComplianceCampaignStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED', 'ARCHIVED');

CREATE TABLE "ComplianceCampaign" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "frameworkId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "ComplianceCampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "frozenFrameworkName" TEXT NOT NULL,
    "frozenFrameworkVersion" TEXT NOT NULL,
    "reviewFrequencyMonths" INTEGER NOT NULL DEFAULT 12,
    "openedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "closeNote" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceCampaign_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ComplianceCampaignSnapshot" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "label" TEXT,
    "payload" JSONB NOT NULL,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplianceCampaignSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ComplianceCampaign_clientId_idx" ON "ComplianceCampaign"("clientId");
CREATE INDEX "ComplianceCampaign_clientId_frameworkId_idx" ON "ComplianceCampaign"("clientId", "frameworkId");
CREATE INDEX "ComplianceCampaign_clientId_status_idx" ON "ComplianceCampaign"("clientId", "status");
CREATE INDEX "ComplianceCampaignSnapshot_clientId_campaignId_idx" ON "ComplianceCampaignSnapshot"("clientId", "campaignId");
CREATE INDEX "ComplianceCampaignSnapshot_campaignId_idx" ON "ComplianceCampaignSnapshot"("campaignId");

ALTER TABLE "ComplianceCampaign" ADD CONSTRAINT "ComplianceCampaign_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComplianceCampaign" ADD CONSTRAINT "ComplianceCampaign_frameworkId_fkey" FOREIGN KEY ("frameworkId") REFERENCES "ComplianceFramework"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ComplianceCampaignSnapshot" ADD CONSTRAINT "ComplianceCampaignSnapshot_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "ComplianceCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
