-- RFC-PROJ-019 — hiérarchie parent / sous-projets
ALTER TABLE "Project" ADD COLUMN "parentProjectId" TEXT;

ALTER TABLE "Project"
  ADD CONSTRAINT "Project_parentProjectId_fkey"
  FOREIGN KEY ("parentProjectId") REFERENCES "Project"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "Project_clientId_parentProjectId_idx"
  ON "Project"("clientId", "parentProjectId");
