-- Add V1 functional fields for strategic direction strategy module.
--
-- StrategicDirectionStrategy est créée dans 20260507100200_strategic_direction_foundation.
-- Ici : no-op sur base neuve ; colonnes ajoutées si la table existe déjà (drift prod).

DO $$
BEGIN
  IF to_regclass('public."StrategicDirectionStrategy"') IS NOT NULL THEN
    ALTER TABLE "StrategicDirectionStrategy"
      ADD COLUMN IF NOT EXISTS "title" TEXT,
      ADD COLUMN IF NOT EXISTS "ambition" TEXT,
      ADD COLUMN IF NOT EXISTS "context" TEXT,
      ADD COLUMN IF NOT EXISTS "strategicPriorities" JSONB,
      ADD COLUMN IF NOT EXISTS "expectedOutcomes" JSONB,
      ADD COLUMN IF NOT EXISTS "kpis" JSONB,
      ADD COLUMN IF NOT EXISTS "majorInitiatives" JSONB,
      ADD COLUMN IF NOT EXISTS "risks" JSONB,
      ADD COLUMN IF NOT EXISTS "ownerLabel" TEXT,
      ADD COLUMN IF NOT EXISTS "submittedByUserId" TEXT;
  END IF;
END $$;
