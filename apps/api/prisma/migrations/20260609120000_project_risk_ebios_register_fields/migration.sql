-- Registre EBIOS : événement redouté + mesures préventives existantes
ALTER TABLE "ProjectRisk" ADD COLUMN "fearedEvent" TEXT NOT NULL DEFAULT '—';
ALTER TABLE "ProjectRisk" ADD COLUMN "existingSecurityMeasures" TEXT;

UPDATE "ProjectRisk" SET "fearedEvent" = "title" WHERE "fearedEvent" = '—';
