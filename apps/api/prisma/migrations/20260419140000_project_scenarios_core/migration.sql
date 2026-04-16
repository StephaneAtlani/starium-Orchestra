-- RFC-PROJ-SC-001 — Project Scenario Core

-- CreateEnum
CREATE TYPE "ProjectScenarioStatus" AS ENUM ('DRAFT', 'SELECTED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "ProjectScenario" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "assumptionSummary" TEXT,
    "status" "ProjectScenarioStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "isBaseline" BOOLEAN NOT NULL DEFAULT false,
    "selectedAt" TIMESTAMP(3),
    "selectedByUserId" TEXT,
    "archivedAt" TIMESTAMP(3),
    "archivedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectScenario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectScenario_clientId_projectId_idx" ON "ProjectScenario"("clientId", "projectId");
CREATE INDEX "ProjectScenario_clientId_projectId_status_idx" ON "ProjectScenario"("clientId", "projectId", "status");
CREATE INDEX "ProjectScenario_projectId_version_idx" ON "ProjectScenario"("projectId", "version");

-- Unicité baseline canonique
CREATE UNIQUE INDEX "ProjectScenario_projectId_selected_unique"
ON "ProjectScenario"("projectId")
WHERE "status" = 'SELECTED';

-- AddForeignKey
ALTER TABLE "ProjectScenario"
ADD CONSTRAINT "ProjectScenario_clientId_fkey"
FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectScenario"
ADD CONSTRAINT "ProjectScenario_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectScenario"
ADD CONSTRAINT "ProjectScenario_selectedByUserId_fkey"
FOREIGN KEY ("selectedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProjectScenario"
ADD CONSTRAINT "ProjectScenario_archivedByUserId_fkey"
FOREIGN KEY ("archivedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
