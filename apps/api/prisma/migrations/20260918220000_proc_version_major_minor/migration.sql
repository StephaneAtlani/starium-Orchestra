-- PROC versioning major.minor (PRD versioning procédures)
-- Remplace versionNumber entier par versionMajor / versionMinor / bumpType.
-- Draft technique : major/minor NULL. Publiées : n° figé à la publish.

CREATE TYPE "ProcedureVersionBumpType" AS ENUM ('MINOR', 'MAJOR');

ALTER TABLE "ProcedureVersion"
  ADD COLUMN IF NOT EXISTS "versionMajor" INTEGER,
  ADD COLUMN IF NOT EXISTS "versionMinor" INTEGER,
  ADD COLUMN IF NOT EXISTS "bumpType" "ProcedureVersionBumpType";

-- Convertit l'historique existant : N → N.0 (MAJOR) pour les publiées ; brouillons sans n°.
UPDATE "ProcedureVersion"
SET
  "versionMajor" = "versionNumber",
  "versionMinor" = 0,
  "bumpType" = 'MAJOR'
WHERE "lifecycle" = 'PUBLISHED' AND "versionNumber" IS NOT NULL;

UPDATE "ProcedureVersion"
SET
  "versionMajor" = NULL,
  "versionMinor" = NULL,
  "bumpType" = NULL
WHERE "lifecycle" = 'DRAFT';

DROP INDEX IF EXISTS "ProcedureVersion_procedureId_versionNumber_key";

ALTER TABLE "ProcedureVersion" DROP COLUMN IF EXISTS "versionNumber";

CREATE UNIQUE INDEX "ProcedureVersion_procedureId_versionMajor_versionMinor_key"
  ON "ProcedureVersion"("procedureId", "versionMajor", "versionMinor");
