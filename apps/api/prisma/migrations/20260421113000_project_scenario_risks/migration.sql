-- RFC-PROJ-SC-006 — Scenario Risk Modeling
CREATE TABLE "ProjectScenarioRisk" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "riskTypeId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "probability" INTEGER NOT NULL,
    "impact" INTEGER NOT NULL,
    "criticalityScore" INTEGER NOT NULL,
    "mitigationPlan" TEXT,
    "ownerLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectScenarioRisk_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProjectScenarioRisk_clientId_scenarioId_idx" ON "ProjectScenarioRisk"("clientId", "scenarioId");
CREATE INDEX "ProjectScenarioRisk_clientId_scenarioId_createdAt_idx" ON "ProjectScenarioRisk"("clientId", "scenarioId", "createdAt");
CREATE INDEX "ProjectScenarioRisk_riskTypeId_idx" ON "ProjectScenarioRisk"("riskTypeId");

ALTER TABLE "ProjectScenarioRisk"
    ADD CONSTRAINT "ProjectScenarioRisk_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "Client"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectScenarioRisk"
    ADD CONSTRAINT "ProjectScenarioRisk_scenarioId_fkey"
    FOREIGN KEY ("scenarioId") REFERENCES "ProjectScenario"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectScenarioRisk"
    ADD CONSTRAINT "ProjectScenarioRisk_riskTypeId_fkey"
    FOREIGN KEY ("riskTypeId") REFERENCES "RiskType"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
