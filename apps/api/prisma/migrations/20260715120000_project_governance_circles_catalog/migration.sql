-- Refactor governance memberships: enum circle -> ProjectGovernanceCircle catalog + circleId FK

-- CreateEnum
CREATE TYPE "ProjectGovernanceCircleSystemKind" AS ENUM ('COPIL', 'COPROJ');

-- CreateTable
CREATE TABLE "ProjectGovernanceCircle" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "systemKind" "ProjectGovernanceCircleSystemKind",
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectGovernanceCircle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectGovernanceCircle_clientId_idx" ON "ProjectGovernanceCircle"("clientId");

-- CreateIndex
CREATE INDEX "ProjectGovernanceCircle_clientId_projectId_idx" ON "ProjectGovernanceCircle"("clientId", "projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectGovernanceCircle_projectId_systemKind_key" ON "ProjectGovernanceCircle"("projectId", "systemKind");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectGovernanceCircle_projectId_name_key" ON "ProjectGovernanceCircle"("projectId", "name");

-- AddForeignKey
ALTER TABLE "ProjectGovernanceCircle" ADD CONSTRAINT "ProjectGovernanceCircle_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectGovernanceCircle" ADD CONSTRAINT "ProjectGovernanceCircle_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Drop legacy membership table (enum-based); defaults are re-seeded on first API access
DROP TABLE "ProjectTeamGovernanceMembership";

-- DropEnum
DROP TYPE "ProjectTeamGovernanceCircle";

-- CreateTable
CREATE TABLE "ProjectTeamGovernanceMembership" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "identityKey" VARCHAR(150) NOT NULL,
    "circleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectTeamGovernanceMembership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectTeamGovernanceMembership_clientId_idx" ON "ProjectTeamGovernanceMembership"("clientId");

-- CreateIndex
CREATE INDEX "ProjectTeamGovernanceMembership_clientId_projectId_idx" ON "ProjectTeamGovernanceMembership"("clientId", "projectId");

-- CreateIndex
CREATE INDEX "ProjectTeamGovernanceMembership_circleId_idx" ON "ProjectTeamGovernanceMembership"("circleId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectTeamGovernanceMembership_projectId_identityKey_circleId_key" ON "ProjectTeamGovernanceMembership"("projectId", "identityKey", "circleId");

-- AddForeignKey
ALTER TABLE "ProjectTeamGovernanceMembership" ADD CONSTRAINT "ProjectTeamGovernanceMembership_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectTeamGovernanceMembership" ADD CONSTRAINT "ProjectTeamGovernanceMembership_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectTeamGovernanceMembership" ADD CONSTRAINT "ProjectTeamGovernanceMembership_circleId_fkey" FOREIGN KEY ("circleId") REFERENCES "ProjectGovernanceCircle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
