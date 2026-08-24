-- Statut ARCHIVED + index partiel d’unicité.
-- Table / enum créés dans 07100200 sur base neuve.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StrategicDirectionStrategyStatus') THEN
    ALTER TYPE "StrategicDirectionStrategyStatus" ADD VALUE IF NOT EXISTS 'ARCHIVED';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF to_regclass('public."StrategicDirectionStrategy"') IS NOT NULL THEN
    ALTER TABLE "StrategicDirectionStrategy"
      ADD COLUMN IF NOT EXISTS "archivedReason" TEXT,
      ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);

    ALTER TABLE "StrategicDirectionStrategy"
      DROP CONSTRAINT IF EXISTS "StrategicDirectionStrategy_clientId_directionId_alignedVisionId_key";

    CREATE UNIQUE INDEX IF NOT EXISTS "StrategicDirectionStrategy_active_direction_vision_key"
      ON "StrategicDirectionStrategy" ("clientId", "directionId", "alignedVisionId")
      WHERE ("archivedAt" IS NULL);
  END IF;
END $$;
