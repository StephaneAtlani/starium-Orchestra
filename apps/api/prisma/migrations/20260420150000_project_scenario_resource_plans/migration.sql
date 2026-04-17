-- RFC-PROJ-SC-003: project scenario resource plans
CREATE TABLE "ProjectScenarioResourcePlan" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "roleLabel" TEXT,
    "allocationPct" DECIMAL(5,2),
    "plannedDays" DECIMAL(8,2),
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectScenarioResourcePlan_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProjectScenarioResourcePlan_clientId_scenarioId_idx"
ON "ProjectScenarioResourcePlan"("clientId", "scenarioId");

CREATE INDEX "ProjectScenarioResourcePlan_clientId_resourceId_idx"
ON "ProjectScenarioResourcePlan"("clientId", "resourceId");

ALTER TABLE "ProjectScenarioResourcePlan"
ADD CONSTRAINT "ProjectScenarioResourcePlan_clientId_fkey"
FOREIGN KEY ("clientId") REFERENCES "Client"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectScenarioResourcePlan"
ADD CONSTRAINT "ProjectScenarioResourcePlan_scenarioId_fkey"
FOREIGN KEY ("scenarioId") REFERENCES "ProjectScenario"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectScenarioResourcePlan"
ADD CONSTRAINT "ProjectScenarioResourcePlan_resourceId_fkey"
FOREIGN KEY ("resourceId") REFERENCES "Resource"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
