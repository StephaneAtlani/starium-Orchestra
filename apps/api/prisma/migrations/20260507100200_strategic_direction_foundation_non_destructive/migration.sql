-- RFC-STRAT-010 / STRAT-007
-- Migration additive et non destructive pour garantir la fondation StrategicDirection / StrategicDirectionStrategy.
-- Garde-fous:
-- - aucun renommage de colonne
-- - aucune suppression d'enum
-- - aucune refonte de StrategicDirectionStrategy
-- - seulement les objets manquants nécessaires au fonctionnement existant

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    WHERE t.typname = 'StrategicDirectionStrategyStatus'
  ) THEN
    CREATE TYPE "StrategicDirectionStrategyStatus" AS ENUM (
      'DRAFT',
      'SUBMITTED',
      'APPROVED',
      'REJECTED',
      'ARCHIVED'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "StrategicDirection" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StrategicDirection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "StrategicDirectionStrategy" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "directionId" TEXT NOT NULL,
  "alignedVisionId" TEXT NOT NULL,
  "title" TEXT,
  "ambition" TEXT,
  "context" TEXT,
  "statement" TEXT NOT NULL,
  "strategicPriorities" JSONB,
  "expectedOutcomes" JSONB,
  "kpis" JSONB,
  "majorInitiatives" JSONB,
  "risks" JSONB,
  "horizonLabel" TEXT NOT NULL,
  "ownerLabel" TEXT,
  "status" "StrategicDirectionStrategyStatus" NOT NULL DEFAULT 'DRAFT',
  "submittedAt" TIMESTAMP(3),
  "submittedByUserId" TEXT,
  "approvedAt" TIMESTAMP(3),
  "approvedByUserId" TEXT,
  "rejectionReason" TEXT,
  "archivedReason" TEXT,
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StrategicDirectionStrategy_pkey" PRIMARY KEY ("id")
);

-- Colonnes V1 / archive si la table existait déjà sans elles (drift)
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
  ADD COLUMN IF NOT EXISTS "archivedReason" TEXT,
  ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);

ALTER TABLE "StrategicObjective"
  ADD COLUMN IF NOT EXISTS "directionId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'StrategicDirection_clientId_fkey'
  ) THEN
    ALTER TABLE "StrategicDirection"
      ADD CONSTRAINT "StrategicDirection_clientId_fkey"
      FOREIGN KEY ("clientId") REFERENCES "Client"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'StrategicDirectionStrategy_clientId_fkey'
  ) THEN
    ALTER TABLE "StrategicDirectionStrategy"
      ADD CONSTRAINT "StrategicDirectionStrategy_clientId_fkey"
      FOREIGN KEY ("clientId") REFERENCES "Client"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'StrategicDirectionStrategy_directionId_fkey'
  ) THEN
    ALTER TABLE "StrategicDirectionStrategy"
      ADD CONSTRAINT "StrategicDirectionStrategy_directionId_fkey"
      FOREIGN KEY ("directionId") REFERENCES "StrategicDirection"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'StrategicDirectionStrategy_alignedVisionId_fkey'
  ) THEN
    ALTER TABLE "StrategicDirectionStrategy"
      ADD CONSTRAINT "StrategicDirectionStrategy_alignedVisionId_fkey"
      FOREIGN KEY ("alignedVisionId") REFERENCES "StrategicVision"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'StrategicDirectionStrategy_submittedByUserId_fkey'
  ) THEN
    ALTER TABLE "StrategicDirectionStrategy"
      ADD CONSTRAINT "StrategicDirectionStrategy_submittedByUserId_fkey"
      FOREIGN KEY ("submittedByUserId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'StrategicDirectionStrategy_approvedByUserId_fkey'
  ) THEN
    ALTER TABLE "StrategicDirectionStrategy"
      ADD CONSTRAINT "StrategicDirectionStrategy_approvedByUserId_fkey"
      FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'StrategicObjective_directionId_fkey'
  ) THEN
    ALTER TABLE "StrategicObjective"
      ADD CONSTRAINT "StrategicObjective_directionId_fkey"
      FOREIGN KEY ("directionId") REFERENCES "StrategicDirection"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "StrategicDirection_clientId_code_key"
  ON "StrategicDirection"("clientId", "code");
CREATE INDEX IF NOT EXISTS "StrategicDirection_clientId_idx"
  ON "StrategicDirection"("clientId");
CREATE INDEX IF NOT EXISTS "StrategicDirection_clientId_isActive_idx"
  ON "StrategicDirection"("clientId", "isActive");

CREATE UNIQUE INDEX IF NOT EXISTS "StrategicDirectionStrategy_clientId_directionId_alignedVisionId_key"
  ON "StrategicDirectionStrategy"("clientId", "directionId", "alignedVisionId");
CREATE INDEX IF NOT EXISTS "StrategicDirectionStrategy_clientId_idx"
  ON "StrategicDirectionStrategy"("clientId");
CREATE INDEX IF NOT EXISTS "StrategicDirectionStrategy_clientId_directionId_idx"
  ON "StrategicDirectionStrategy"("clientId", "directionId");
CREATE INDEX IF NOT EXISTS "StrategicDirectionStrategy_clientId_status_idx"
  ON "StrategicDirectionStrategy"("clientId", "status");

CREATE INDEX IF NOT EXISTS "StrategicObjective_clientId_directionId_idx"
  ON "StrategicObjective"("clientId", "directionId");

-- FK link tables → strategy (06220000 peut avoir tourné avant la CREATE TABLE)
DO $$ BEGIN
  ALTER TABLE "StrategicDirectionStrategyAxisLink"
    ADD CONSTRAINT "StrategicDirectionStrategyAxisLink_strategyId_fkey"
    FOREIGN KEY ("strategyId") REFERENCES "StrategicDirectionStrategy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "StrategicDirectionStrategyObjectiveLink"
    ADD CONSTRAINT "StrategicDirectionStrategyObjectiveLink_strategyId_fkey"
    FOREIGN KEY ("strategyId") REFERENCES "StrategicDirectionStrategy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "StrategicDirectionStrategy"
  DROP CONSTRAINT IF EXISTS "StrategicDirectionStrategy_clientId_directionId_alignedVisionId_key";

CREATE UNIQUE INDEX IF NOT EXISTS "StrategicDirectionStrategy_active_direction_vision_key"
  ON "StrategicDirectionStrategy" ("clientId", "directionId", "alignedVisionId")
  WHERE ("archivedAt" IS NULL);
