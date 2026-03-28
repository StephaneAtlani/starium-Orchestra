-- ProjectRisk.projectId nullable ; FK ON DELETE SET NULL ; unicité via index partiels (évite collision R-xxx inter-projets).

DROP INDEX IF EXISTS "ProjectRisk_projectId_code_key";

ALTER TABLE "ProjectRisk" DROP CONSTRAINT IF EXISTS "ProjectRisk_projectId_fkey";

ALTER TABLE "ProjectRisk" ALTER COLUMN "projectId" DROP NOT NULL;

ALTER TABLE "ProjectRisk" ADD CONSTRAINT "ProjectRisk_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "ProjectRisk_project_scope_code_key" ON "ProjectRisk" ("projectId", "code") WHERE "projectId" IS NOT NULL;

CREATE UNIQUE INDEX "ProjectRisk_client_scope_code_key" ON "ProjectRisk" ("clientId", "code") WHERE "projectId" IS NULL;
