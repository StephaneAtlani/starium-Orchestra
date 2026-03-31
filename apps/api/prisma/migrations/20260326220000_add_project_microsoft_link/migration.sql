-- CreateTable
CREATE TABLE "ProjectMicrosoftLink" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "microsoftConnectionId" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "teamId" TEXT,
    "teamName" TEXT,
    "channelId" TEXT,
    "channelName" TEXT,
    "plannerPlanId" TEXT,
    "plannerPlanTitle" TEXT,
    "filesDriveId" TEXT,
    "filesFolderId" TEXT,
    "syncTasksEnabled" BOOLEAN NOT NULL DEFAULT true,
    "syncDocumentsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectMicrosoftLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectMicrosoftLink_clientId_idx" ON "ProjectMicrosoftLink"("clientId");

-- CreateIndex
CREATE INDEX "ProjectMicrosoftLink_microsoftConnectionId_idx" ON "ProjectMicrosoftLink"("microsoftConnectionId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectMicrosoftLink_projectId_key" ON "ProjectMicrosoftLink"("projectId");

-- AddForeignKey
ALTER TABLE "ProjectMicrosoftLink" ADD CONSTRAINT "ProjectMicrosoftLink_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMicrosoftLink" ADD CONSTRAINT "ProjectMicrosoftLink_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMicrosoftLink" ADD CONSTRAINT "ProjectMicrosoftLink_microsoftConnectionId_fkey" FOREIGN KEY ("microsoftConnectionId") REFERENCES "MicrosoftConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

