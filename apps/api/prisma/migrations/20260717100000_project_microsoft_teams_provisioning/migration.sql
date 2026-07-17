-- RFC-PROJ-INT-010 — settings/templates/runs de provisioning Teams

-- CreateEnum
CREATE TYPE "ProjectMicrosoftTeamsProvisioningStatus" AS ENUM (
    'PENDING',
    'IN_PROGRESS',
    'COMPLETED',
    'PARTIAL',
    'FAILED'
);

-- CreateEnum
CREATE TYPE "ProjectMicrosoftTeamsProvisioningResolutionType" AS ENUM (
    'TEAM_FOUND',
    'CONFIRMED_NOT_CREATED'
);

-- CreateTable
CREATE TABLE "ProjectMicrosoftTeamsProvisioningSettings" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "offerOnProjectCreate" BOOLEAN NOT NULL DEFAULT false,
    "teamNameTemplate" TEXT NOT NULL DEFAULT '{{code}} - {{name}}',
    "teamDescriptionTemplate" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectMicrosoftTeamsProvisioningSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectMicrosoftTeamsChannelTemplate" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "settingsId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectMicrosoftTeamsChannelTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectMicrosoftTeamsProvisioning" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "microsoftConnectionId" TEXT,
    "triggeredByUserId" TEXT,
    "status" "ProjectMicrosoftTeamsProvisioningStatus" NOT NULL DEFAULT 'PENDING',
    "teamDisplayName" TEXT NOT NULL,
    "teamDescription" TEXT,
    "graphCreateRequestedAt" TIMESTAMP(3),
    "graphOperationUrl" TEXT,
    "graphContentLocation" TEXT,
    "microsoftTeamId" TEXT,
    "teamWebUrl" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "retryRequestedAt" TIMESTAMP(3),
    "currentJobId" TEXT,
    "lastHeartbeatAt" TIMESTAMP(3),
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolvedByUserId" TEXT,
    "resolutionType" "ProjectMicrosoftTeamsProvisioningResolutionType",
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectMicrosoftTeamsProvisioning_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "ProjectMicrosoftLink"
ADD COLUMN "provisionedAt" TIMESTAMP(3),
ADD COLUMN "provisioningId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ProjectMicrosoftTeamsProvisioningSettings_clientId_key" ON "ProjectMicrosoftTeamsProvisioningSettings"("clientId");

-- CreateIndex
CREATE INDEX "ProjectMicrosoftTeamsProvisioningSettings_clientId_idx" ON "ProjectMicrosoftTeamsProvisioningSettings"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectMicrosoftTeamsChannelTemplate_clientId_displayName_key" ON "ProjectMicrosoftTeamsChannelTemplate"("clientId", "displayName");

-- CreateIndex
CREATE INDEX "ProjectMicrosoftTeamsChannelTemplate_clientId_sortOrder_idx" ON "ProjectMicrosoftTeamsChannelTemplate"("clientId", "sortOrder");

-- CreateIndex
CREATE INDEX "ProjectMicrosoftTeamsChannelTemplate_settingsId_idx" ON "ProjectMicrosoftTeamsChannelTemplate"("settingsId");

-- CreateIndex
CREATE INDEX "ProjectMicrosoftTeamsProvisioning_clientId_projectId_createdAt_idx" ON "ProjectMicrosoftTeamsProvisioning"("clientId", "projectId", "createdAt");

-- CreateIndex
CREATE INDEX "ProjectMicrosoftTeamsProvisioning_clientId_status_idx" ON "ProjectMicrosoftTeamsProvisioning"("clientId", "status");

-- CreateIndex
CREATE INDEX "ProjectMicrosoftTeamsProvisioning_microsoftConnectionId_idx" ON "ProjectMicrosoftTeamsProvisioning"("microsoftConnectionId");

-- CreateIndex
CREATE INDEX "ProjectMicrosoftTeamsProvisioning_triggeredByUserId_idx" ON "ProjectMicrosoftTeamsProvisioning"("triggeredByUserId");

-- CreateIndex
CREATE INDEX "ProjectMicrosoftTeamsProvisioning_resolvedByUserId_idx" ON "ProjectMicrosoftTeamsProvisioning"("resolvedByUserId");

-- CreateIndex
CREATE INDEX "ProjectMicrosoftLink_provisioningId_idx" ON "ProjectMicrosoftLink"("provisioningId");

-- Critical partial unique indexes
CREATE UNIQUE INDEX "ProjectMicrosoftTeamsChannelTemplate_one_primary_per_client_idx"
ON "ProjectMicrosoftTeamsChannelTemplate"("clientId")
WHERE "isPrimary" = true;

CREATE UNIQUE INDEX "ProjectMicrosoftTeamsProvisioning_one_active_run_per_project_idx"
ON "ProjectMicrosoftTeamsProvisioning"("clientId", "projectId")
WHERE "status" IN ('PENDING', 'IN_PROGRESS');

-- AddForeignKey
ALTER TABLE "ProjectMicrosoftTeamsProvisioningSettings"
ADD CONSTRAINT "ProjectMicrosoftTeamsProvisioningSettings_clientId_fkey"
FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMicrosoftTeamsChannelTemplate"
ADD CONSTRAINT "ProjectMicrosoftTeamsChannelTemplate_clientId_fkey"
FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMicrosoftTeamsChannelTemplate"
ADD CONSTRAINT "ProjectMicrosoftTeamsChannelTemplate_settingsId_fkey"
FOREIGN KEY ("settingsId") REFERENCES "ProjectMicrosoftTeamsProvisioningSettings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMicrosoftTeamsProvisioning"
ADD CONSTRAINT "ProjectMicrosoftTeamsProvisioning_clientId_fkey"
FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMicrosoftTeamsProvisioning"
ADD CONSTRAINT "ProjectMicrosoftTeamsProvisioning_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMicrosoftTeamsProvisioning"
ADD CONSTRAINT "ProjectMicrosoftTeamsProvisioning_microsoftConnectionId_fkey"
FOREIGN KEY ("microsoftConnectionId") REFERENCES "MicrosoftConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMicrosoftTeamsProvisioning"
ADD CONSTRAINT "ProjectMicrosoftTeamsProvisioning_triggeredByUserId_fkey"
FOREIGN KEY ("triggeredByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMicrosoftTeamsProvisioning"
ADD CONSTRAINT "ProjectMicrosoftTeamsProvisioning_resolvedByUserId_fkey"
FOREIGN KEY ("resolvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMicrosoftLink"
ADD CONSTRAINT "ProjectMicrosoftLink_provisioningId_fkey"
FOREIGN KEY ("provisioningId") REFERENCES "ProjectMicrosoftTeamsProvisioning"("id") ON DELETE SET NULL ON UPDATE CASCADE;
