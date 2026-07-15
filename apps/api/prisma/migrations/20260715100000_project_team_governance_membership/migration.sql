-- CreateEnum
CREATE TYPE "ProjectTeamGovernanceCircle" AS ENUM ('COPIL', 'COPROJ', 'COPRO', 'CODIR');

-- CreateTable
CREATE TABLE "ProjectTeamGovernanceMembership" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "identityKey" VARCHAR(150) NOT NULL,
    "circle" "ProjectTeamGovernanceCircle" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectTeamGovernanceMembership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectTeamGovernanceMembership_clientId_idx" ON "ProjectTeamGovernanceMembership"("clientId");

-- CreateIndex
CREATE INDEX "ProjectTeamGovernanceMembership_clientId_projectId_idx" ON "ProjectTeamGovernanceMembership"("clientId", "projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectTeamGovernanceMembership_projectId_identityKey_circle_key" ON "ProjectTeamGovernanceMembership"("projectId", "identityKey", "circle");

-- AddForeignKey
ALTER TABLE "ProjectTeamGovernanceMembership" ADD CONSTRAINT "ProjectTeamGovernanceMembership_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectTeamGovernanceMembership" ADD CONSTRAINT "ProjectTeamGovernanceMembership_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
