-- RFC-PROJ-018 — ProjectRisk EBIOS RM minimal (champs + traitement obligatoire)

CREATE TYPE "ProjectRiskImpactCategory" AS ENUM ('FINANCIAL', 'OPERATIONAL', 'LEGAL', 'REPUTATION');

ALTER TABLE "ProjectRisk" ADD COLUMN "threatSource" TEXT NOT NULL DEFAULT '—';
ALTER TABLE "ProjectRisk" ADD COLUMN "businessImpact" TEXT NOT NULL DEFAULT '—';
ALTER TABLE "ProjectRisk" ADD COLUMN "likelihoodJustification" TEXT;
ALTER TABLE "ProjectRisk" ADD COLUMN "impactCategory" "ProjectRiskImpactCategory";
ALTER TABLE "ProjectRisk" ADD COLUMN "residualJustification" TEXT;

UPDATE "ProjectRisk" SET "treatmentStrategy" = 'REDUCE' WHERE "treatmentStrategy" IS NULL;

ALTER TABLE "ProjectRisk" ALTER COLUMN "treatmentStrategy" SET NOT NULL;
