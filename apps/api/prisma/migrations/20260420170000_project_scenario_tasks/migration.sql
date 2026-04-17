-- RFC-PROJ-SC-004: project scenario tasks (gantt planning)
CREATE TABLE "ProjectScenarioTask" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "sourceProjectTaskId" TEXT,
    "title" TEXT NOT NULL,
    "taskType" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "durationDays" INTEGER,
    "dependencyIds" JSONB,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectScenarioTask_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProjectScenarioTask_clientId_scenarioId_idx"
ON "ProjectScenarioTask"("clientId", "scenarioId");

ALTER TABLE "ProjectScenarioTask"
ADD CONSTRAINT "ProjectScenarioTask_clientId_fkey"
FOREIGN KEY ("clientId") REFERENCES "Client"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectScenarioTask"
ADD CONSTRAINT "ProjectScenarioTask_scenarioId_fkey"
FOREIGN KEY ("scenarioId") REFERENCES "ProjectScenario"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
