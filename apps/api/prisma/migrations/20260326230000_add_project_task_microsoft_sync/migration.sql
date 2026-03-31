-- CreateEnum
CREATE TYPE "MicrosoftSyncStatus" AS ENUM ('PENDING', 'SYNCED', 'ERROR');

-- CreateTable
CREATE TABLE "ProjectTaskMicrosoftSync" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "projectTaskId" TEXT NOT NULL,
    "projectMicrosoftLinkId" TEXT NOT NULL,
    "plannerTaskId" TEXT NOT NULL,
    "lastPushedAt" TIMESTAMP(3),
    "syncStatus" "MicrosoftSyncStatus" NOT NULL DEFAULT 'PENDING',
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectTaskMicrosoftSync_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectTaskMicrosoftSync_clientId_projectId_idx" ON "ProjectTaskMicrosoftSync"("clientId", "projectId");

-- CreateIndex
CREATE INDEX "ProjectTaskMicrosoftSync_plannerTaskId_idx" ON "ProjectTaskMicrosoftSync"("plannerTaskId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectTaskMicrosoftSync_clientId_projectTaskId_key" ON "ProjectTaskMicrosoftSync"("clientId", "projectTaskId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectTaskMicrosoftSync_projectTaskId_key" ON "ProjectTaskMicrosoftSync"("projectTaskId");

-- AddForeignKey
ALTER TABLE "ProjectTaskMicrosoftSync" ADD CONSTRAINT "ProjectTaskMicrosoftSync_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectTaskMicrosoftSync" ADD CONSTRAINT "ProjectTaskMicrosoftSync_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectTaskMicrosoftSync" ADD CONSTRAINT "ProjectTaskMicrosoftSync_projectTaskId_fkey" FOREIGN KEY ("projectTaskId") REFERENCES "ProjectTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectTaskMicrosoftSync" ADD CONSTRAINT "ProjectTaskMicrosoftSync_projectMicrosoftLinkId_fkey" FOREIGN KEY ("projectMicrosoftLinkId") REFERENCES "ProjectMicrosoftLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

