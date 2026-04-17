-- RFC-PROJ-SC-005: project scenario capacity snapshots
CREATE TABLE "ProjectScenarioCapacitySnapshot" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL,
    "plannedLoadPct" DECIMAL(5,2) NOT NULL,
    "availableCapacityPct" DECIMAL(5,2) NOT NULL,
    "variancePct" DECIMAL(5,2) NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectScenarioCapacitySnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProjectScenarioCapacitySnapshot_clientId_scenarioId_resourceId_snap_key"
ON "ProjectScenarioCapacitySnapshot"("clientId", "scenarioId", "resourceId", "snapshotDate");

CREATE INDEX "ProjectScenarioCapacitySnapshot_clientId_projectId_scenarioId_idx"
ON "ProjectScenarioCapacitySnapshot"("clientId", "projectId", "scenarioId");

CREATE INDEX "ProjectScenarioCapacitySnapshot_clientId_scenarioId_snapshotDate_resourceId_idx"
ON "ProjectScenarioCapacitySnapshot"("clientId", "scenarioId", "snapshotDate", "resourceId");

ALTER TABLE "ProjectScenarioCapacitySnapshot"
ADD CONSTRAINT "ProjectScenarioCapacitySnapshot_clientId_fkey"
FOREIGN KEY ("clientId") REFERENCES "Client"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProjectScenarioCapacitySnapshot"
ADD CONSTRAINT "ProjectScenarioCapacitySnapshot_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProjectScenarioCapacitySnapshot"
ADD CONSTRAINT "ProjectScenarioCapacitySnapshot_scenarioId_fkey"
FOREIGN KEY ("scenarioId") REFERENCES "ProjectScenario"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectScenarioCapacitySnapshot"
ADD CONSTRAINT "ProjectScenarioCapacitySnapshot_resourceId_fkey"
FOREIGN KEY ("resourceId") REFERENCES "Resource"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
