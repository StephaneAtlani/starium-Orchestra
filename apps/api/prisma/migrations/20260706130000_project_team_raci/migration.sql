-- CreateEnum
CREATE TYPE "ProjectRaciKind" AS ENUM ('RESPONSIBLE', 'ACCOUNTABLE', 'CONSULTED', 'INFORMED');

-- CreateTable
CREATE TABLE "ProjectTeamRaci" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "kind" "ProjectRaciKind" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectTeamRaci_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectTeamRaci_projectId_roleId_kind_key" ON "ProjectTeamRaci"("projectId", "roleId", "kind");

-- CreateIndex
CREATE INDEX "ProjectTeamRaci_clientId_idx" ON "ProjectTeamRaci"("clientId");

-- CreateIndex
CREATE INDEX "ProjectTeamRaci_projectId_idx" ON "ProjectTeamRaci"("projectId");

-- CreateIndex
CREATE INDEX "ProjectTeamRaci_roleId_idx" ON "ProjectTeamRaci"("roleId");

-- AddForeignKey
ALTER TABLE "ProjectTeamRaci" ADD CONSTRAINT "ProjectTeamRaci_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectTeamRaci" ADD CONSTRAINT "ProjectTeamRaci_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectTeamRaci" ADD CONSTRAINT "ProjectTeamRaci_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "ProjectTeamRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;
