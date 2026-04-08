-- À exécuter seulement si la migration s’est arrêtée avant ce bloc
-- (après réparation Part 1 ou si BudgetLineStatus est déjà OK mais enveloppe / deferred manquants).
-- Vérifier d’abord : colonnes deferredToExerciseId, enum enveloppe élargi.

CREATE TYPE "BudgetEnvelopeStatus_new" AS ENUM (
  'DRAFT',
  'PENDING_VALIDATION',
  'ACTIVE',
  'REJECTED',
  'DEFERRED',
  'LOCKED',
  'ARCHIVED'
);

ALTER TABLE "BudgetEnvelope" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "BudgetEnvelope" ALTER COLUMN "status" TYPE "BudgetEnvelopeStatus_new" USING ("status"::text::"BudgetEnvelopeStatus_new");
ALTER TABLE "BudgetEnvelope" ALTER COLUMN "status" SET DEFAULT 'ACTIVE'::"BudgetEnvelopeStatus_new";

DROP TYPE "BudgetEnvelopeStatus";
ALTER TYPE "BudgetEnvelopeStatus_new" RENAME TO "BudgetEnvelopeStatus";

ALTER TABLE "BudgetLine" ADD COLUMN IF NOT EXISTS "deferredToExerciseId" TEXT;
ALTER TABLE "BudgetEnvelope" ADD COLUMN IF NOT EXISTS "deferredToExerciseId" TEXT;

CREATE INDEX IF NOT EXISTS "BudgetLine_deferredToExerciseId_idx" ON "BudgetLine"("deferredToExerciseId");
CREATE INDEX IF NOT EXISTS "BudgetEnvelope_deferredToExerciseId_idx" ON "BudgetEnvelope"("deferredToExerciseId");

ALTER TABLE "BudgetLine" DROP CONSTRAINT IF EXISTS "BudgetLine_deferredToExerciseId_fkey";
ALTER TABLE "BudgetEnvelope" DROP CONSTRAINT IF EXISTS "BudgetEnvelope_deferredToExerciseId_fkey";

ALTER TABLE "BudgetLine"
  ADD CONSTRAINT "BudgetLine_deferredToExerciseId_fkey"
  FOREIGN KEY ("deferredToExerciseId") REFERENCES "BudgetExercise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BudgetEnvelope"
  ADD CONSTRAINT "BudgetEnvelope_deferredToExerciseId_fkey"
  FOREIGN KEY ("deferredToExerciseId") REFERENCES "BudgetExercise"("id") ON DELETE SET NULL ON UPDATE CASCADE;
