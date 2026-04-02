-- RFC-TEAM-007 — affectations ressources (staffing planifié)

CREATE TABLE "TeamResourceAssignment" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "collaboratorId" TEXT NOT NULL,
    "projectId" TEXT,
    "activityTypeId" TEXT NOT NULL,
    "projectTeamRoleId" TEXT,
    "roleLabel" VARCHAR(120) NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "allocationPercent" DECIMAL(5,2) NOT NULL,
    "notes" VARCHAR(4000),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamResourceAssignment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TeamResourceAssignment_clientId_collaboratorId_idx" ON "TeamResourceAssignment"("clientId", "collaboratorId");

CREATE INDEX "TeamResourceAssignment_clientId_projectId_idx" ON "TeamResourceAssignment"("clientId", "projectId");

CREATE INDEX "TeamResourceAssignment_clientId_startDate_endDate_idx" ON "TeamResourceAssignment"("clientId", "startDate", "endDate");

CREATE INDEX "TeamResourceAssignment_clientId_activityTypeId_idx" ON "TeamResourceAssignment"("clientId", "activityTypeId");

ALTER TABLE "TeamResourceAssignment" ADD CONSTRAINT "TeamResourceAssignment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TeamResourceAssignment" ADD CONSTRAINT "TeamResourceAssignment_collaboratorId_fkey" FOREIGN KEY ("collaboratorId") REFERENCES "Collaborator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TeamResourceAssignment" ADD CONSTRAINT "TeamResourceAssignment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TeamResourceAssignment" ADD CONSTRAINT "TeamResourceAssignment_activityTypeId_fkey" FOREIGN KEY ("activityTypeId") REFERENCES "ActivityType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TeamResourceAssignment" ADD CONSTRAINT "TeamResourceAssignment_projectTeamRoleId_fkey" FOREIGN KEY ("projectTeamRoleId") REFERENCES "ProjectTeamRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;
