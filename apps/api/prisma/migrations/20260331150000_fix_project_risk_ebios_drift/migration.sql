-- Hotfix drift prod: certains environnements ont le code EBIOS sans les colonnes DB associées.
-- Cette migration est idempotente pour corriger les bases déjà partiellement migrées.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'ProjectRiskImpactCategory'
  ) THEN
    CREATE TYPE "ProjectRiskImpactCategory" AS ENUM ('FINANCIAL', 'OPERATIONAL', 'LEGAL', 'REPUTATION');
  END IF;
END $$;

ALTER TABLE "ProjectRisk"
  ADD COLUMN IF NOT EXISTS "threatSource" TEXT NOT NULL DEFAULT '—',
  ADD COLUMN IF NOT EXISTS "businessImpact" TEXT NOT NULL DEFAULT '—',
  ADD COLUMN IF NOT EXISTS "likelihoodJustification" TEXT,
  ADD COLUMN IF NOT EXISTS "impactCategory" "ProjectRiskImpactCategory",
  ADD COLUMN IF NOT EXISTS "residualJustification" TEXT;

UPDATE "ProjectRisk"
SET "treatmentStrategy" = 'REDUCE'
WHERE "treatmentStrategy" IS NULL;

ALTER TABLE "ProjectRisk"
  ALTER COLUMN "treatmentStrategy" SET NOT NULL;
