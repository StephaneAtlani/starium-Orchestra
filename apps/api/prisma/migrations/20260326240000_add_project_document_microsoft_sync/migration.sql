-- RFC-PROJ-INT-009 — mapping sync documents projet → Microsoft Drive

CREATE TABLE "ProjectDocumentMicrosoftSync" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "projectDocumentId" TEXT NOT NULL,
    "projectMicrosoftLinkId" TEXT NOT NULL,
    "driveId" TEXT NOT NULL,
    "driveItemId" TEXT NOT NULL,
    "folderPath" TEXT NOT NULL,
    "syncStatus" "MicrosoftSyncStatus" NOT NULL DEFAULT 'PENDING',
    "lastPushedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectDocumentMicrosoftSync_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProjectDocumentMicrosoftSync_projectDocumentId_key" ON "ProjectDocumentMicrosoftSync"("projectDocumentId");

CREATE INDEX "ProjectDocumentMicrosoftSync_clientId_projectId_idx" ON "ProjectDocumentMicrosoftSync"("clientId", "projectId");

CREATE INDEX "ProjectDocumentMicrosoftSync_driveItemId_idx" ON "ProjectDocumentMicrosoftSync"("driveItemId");

ALTER TABLE "ProjectDocumentMicrosoftSync" ADD CONSTRAINT "ProjectDocumentMicrosoftSync_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectDocumentMicrosoftSync" ADD CONSTRAINT "ProjectDocumentMicrosoftSync_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectDocumentMicrosoftSync" ADD CONSTRAINT "ProjectDocumentMicrosoftSync_projectDocumentId_fkey" FOREIGN KEY ("projectDocumentId") REFERENCES "ProjectDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectDocumentMicrosoftSync" ADD CONSTRAINT "ProjectDocumentMicrosoftSync_projectMicrosoftLinkId_fkey" FOREIGN KEY ("projectMicrosoftLinkId") REFERENCES "ProjectMicrosoftLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;
