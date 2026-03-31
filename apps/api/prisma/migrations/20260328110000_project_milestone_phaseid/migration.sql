-- RFC-PROJ-011/012 — jalons : ajout du rattachement à une phase

ALTER TABLE "ProjectMilestone"
  ADD COLUMN "phaseId" TEXT;

CREATE INDEX "ProjectMilestone_phaseId_idx"
  ON "ProjectMilestone"("phaseId");

CREATE INDEX "ProjectMilestone_projectId_phaseId_idx"
  ON "ProjectMilestone"("projectId", "phaseId");

ALTER TABLE "ProjectMilestone"
  ADD CONSTRAINT "ProjectMilestone_phaseId_fkey"
  FOREIGN KEY ("phaseId") REFERENCES "ProjectTaskPhase"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

