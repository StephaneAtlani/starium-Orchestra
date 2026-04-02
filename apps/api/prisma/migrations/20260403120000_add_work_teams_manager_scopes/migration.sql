-- CreateEnum
CREATE TYPE "WorkTeamStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "WorkTeamMemberRole" AS ENUM ('MEMBER', 'LEAD', 'DEPUTY');

-- CreateEnum
CREATE TYPE "ManagerScopeMode" AS ENUM ('DIRECT_REPORTS_ONLY', 'TEAM_SUBTREE', 'HYBRID');

-- CreateTable
CREATE TABLE "WorkTeam" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "parentId" TEXT,
    "leadCollaboratorId" TEXT,
    "status" "WorkTeamStatus" NOT NULL DEFAULT 'ACTIVE',
    "archivedAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkTeamMembership" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "workTeamId" TEXT NOT NULL,
    "collaboratorId" TEXT NOT NULL,
    "role" "WorkTeamMemberRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkTeamMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManagerScopeConfig" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "managerCollaboratorId" TEXT NOT NULL,
    "mode" "ManagerScopeMode" NOT NULL,
    "includeDirectReports" BOOLEAN NOT NULL DEFAULT true,
    "includeTeamSubtree" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManagerScopeConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManagerScopeRootTeam" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "managerScopeConfigId" TEXT NOT NULL,
    "workTeamId" TEXT NOT NULL,

    CONSTRAINT "ManagerScopeRootTeam_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkTeam_clientId_code_key" ON "WorkTeam"("clientId", "code");

-- CreateIndex
CREATE INDEX "WorkTeam_clientId_parentId_idx" ON "WorkTeam"("clientId", "parentId");

-- CreateIndex
CREATE INDEX "WorkTeam_clientId_status_idx" ON "WorkTeam"("clientId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "WorkTeamMembership_workTeamId_collaboratorId_key" ON "WorkTeamMembership"("workTeamId", "collaboratorId");

-- CreateIndex
CREATE INDEX "WorkTeamMembership_clientId_collaboratorId_idx" ON "WorkTeamMembership"("clientId", "collaboratorId");

-- CreateIndex
CREATE UNIQUE INDEX "ManagerScopeConfig_managerCollaboratorId_key" ON "ManagerScopeConfig"("managerCollaboratorId");

-- CreateIndex
CREATE INDEX "ManagerScopeConfig_clientId_idx" ON "ManagerScopeConfig"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "ManagerScopeRootTeam_managerScopeConfigId_workTeamId_key" ON "ManagerScopeRootTeam"("managerScopeConfigId", "workTeamId");

-- CreateIndex
CREATE INDEX "ManagerScopeRootTeam_clientId_workTeamId_idx" ON "ManagerScopeRootTeam"("clientId", "workTeamId");

-- AddForeignKey
ALTER TABLE "WorkTeam" ADD CONSTRAINT "WorkTeam_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkTeam" ADD CONSTRAINT "WorkTeam_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "WorkTeam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkTeam" ADD CONSTRAINT "WorkTeam_leadCollaboratorId_fkey" FOREIGN KEY ("leadCollaboratorId") REFERENCES "Collaborator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkTeamMembership" ADD CONSTRAINT "WorkTeamMembership_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkTeamMembership" ADD CONSTRAINT "WorkTeamMembership_workTeamId_fkey" FOREIGN KEY ("workTeamId") REFERENCES "WorkTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkTeamMembership" ADD CONSTRAINT "WorkTeamMembership_collaboratorId_fkey" FOREIGN KEY ("collaboratorId") REFERENCES "Collaborator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagerScopeConfig" ADD CONSTRAINT "ManagerScopeConfig_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagerScopeConfig" ADD CONSTRAINT "ManagerScopeConfig_managerCollaboratorId_fkey" FOREIGN KEY ("managerCollaboratorId") REFERENCES "Collaborator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagerScopeRootTeam" ADD CONSTRAINT "ManagerScopeRootTeam_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagerScopeRootTeam" ADD CONSTRAINT "ManagerScopeRootTeam_managerScopeConfigId_fkey" FOREIGN KEY ("managerScopeConfigId") REFERENCES "ManagerScopeConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagerScopeRootTeam" ADD CONSTRAINT "ManagerScopeRootTeam_workTeamId_fkey" FOREIGN KEY ("workTeamId") REFERENCES "WorkTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
