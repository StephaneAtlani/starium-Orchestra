-- RFC-PROJ-INTAKE-001 — lien demandes projet ↔ cycle de pilotage configurable
ALTER TABLE "ProjectRequestWorkflowSettings"
ADD COLUMN "defaultGovernanceCycleId" TEXT;

CREATE INDEX "ProjectRequestWorkflowSettings_defaultGovernanceCycleId_idx"
ON "ProjectRequestWorkflowSettings"("defaultGovernanceCycleId");

ALTER TABLE "ProjectRequestWorkflowSettings"
ADD CONSTRAINT "ProjectRequestWorkflowSettings_defaultGovernanceCycleId_fkey"
FOREIGN KEY ("defaultGovernanceCycleId") REFERENCES "GovernanceCycle"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
