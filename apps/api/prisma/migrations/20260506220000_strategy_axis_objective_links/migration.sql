-- Liens stratégie ↔ axes / objectifs.
-- FK vers StrategicDirectionStrategy reportée si la table n’existe pas encore (07100200).

CREATE TABLE IF NOT EXISTS "StrategicDirectionStrategyAxisLink" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "strategicAxisId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StrategicDirectionStrategyAxisLink_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "StrategicDirectionStrategyObjectiveLink" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "strategicObjectiveId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StrategicDirectionStrategyObjectiveLink_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "StrategicDirectionStrategyAxisLink_clientId_idx"
  ON "StrategicDirectionStrategyAxisLink"("clientId");
CREATE UNIQUE INDEX IF NOT EXISTS "StrategicDirectionStrategyAxisLink_strategyId_strategicAxisId_key"
  ON "StrategicDirectionStrategyAxisLink"("strategyId", "strategicAxisId");
CREATE INDEX IF NOT EXISTS "StrategicDirectionStrategyObjectiveLink_clientId_idx"
  ON "StrategicDirectionStrategyObjectiveLink"("clientId");
CREATE UNIQUE INDEX IF NOT EXISTS "StrategicDirectionStrategyObjectiveLink_strategyId_strategicObjectiveId_key"
  ON "StrategicDirectionStrategyObjectiveLink"("strategyId", "strategicObjectiveId");

DO $$ BEGIN
  ALTER TABLE "StrategicDirectionStrategyAxisLink"
    ADD CONSTRAINT "StrategicDirectionStrategyAxisLink_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "StrategicDirectionStrategyAxisLink"
    ADD CONSTRAINT "StrategicDirectionStrategyAxisLink_strategicAxisId_fkey"
    FOREIGN KEY ("strategicAxisId") REFERENCES "StrategicAxis"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "StrategicDirectionStrategyObjectiveLink"
    ADD CONSTRAINT "StrategicDirectionStrategyObjectiveLink_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "StrategicDirectionStrategyObjectiveLink"
    ADD CONSTRAINT "StrategicDirectionStrategyObjectiveLink_strategicObjectiveId_fkey"
    FOREIGN KEY ("strategicObjectiveId") REFERENCES "StrategicObjective"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF to_regclass('public."StrategicDirectionStrategy"') IS NOT NULL THEN
    ALTER TABLE "StrategicDirectionStrategyAxisLink"
      ADD CONSTRAINT "StrategicDirectionStrategyAxisLink_strategyId_fkey"
      FOREIGN KEY ("strategyId") REFERENCES "StrategicDirectionStrategy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF to_regclass('public."StrategicDirectionStrategy"') IS NOT NULL THEN
    ALTER TABLE "StrategicDirectionStrategyObjectiveLink"
      ADD CONSTRAINT "StrategicDirectionStrategyObjectiveLink_strategyId_fkey"
      FOREIGN KEY ("strategyId") REFERENCES "StrategicDirectionStrategy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
