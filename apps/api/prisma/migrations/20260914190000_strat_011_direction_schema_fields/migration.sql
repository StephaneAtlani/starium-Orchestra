-- RFC-STRAT-011 — champs identité direction + schéma directeur (JSON structurés)

ALTER TABLE "StrategicDirection"
  ADD COLUMN IF NOT EXISTS "accentTone" TEXT,
  ADD COLUMN IF NOT EXISTS "parentLabel" TEXT,
  ADD COLUMN IF NOT EXISTS "sponsorResourceId" TEXT,
  ADD COLUMN IF NOT EXISTS "fteCount" INTEGER,
  ADD COLUMN IF NOT EXISTS "operatingBudgetCents" BIGINT;

ALTER TABLE "StrategicDirectionStrategy"
  ADD COLUMN IF NOT EXISTS "ownAxes" JSONB,
  ADD COLUMN IF NOT EXISTS "horizonStartYear" INTEGER,
  ADD COLUMN IF NOT EXISTS "horizonYearCount" INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS "budgetsByYear" JSONB,
  ADD COLUMN IF NOT EXISTS "axisContributions" JSONB,
  ADD COLUMN IF NOT EXISTS "contentBlocks" JSONB;

CREATE INDEX IF NOT EXISTS "StrategicDirection_sponsorResourceId_idx"
  ON "StrategicDirection"("sponsorResourceId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'StrategicDirection_sponsorResourceId_fkey'
  ) THEN
    ALTER TABLE "StrategicDirection"
      ADD CONSTRAINT "StrategicDirection_sponsorResourceId_fkey"
      FOREIGN KEY ("sponsorResourceId") REFERENCES "Resource"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
