-- BudgetLineStatus / BudgetEnvelopeStatus : PENDING_VALIDATION, REJECTED, DEFERRED
-- + deferredToExerciseId (FK BudgetExercise, SetNull)

-- BudgetLineStatus
CREATE TYPE "BudgetLineStatus_new" AS ENUM (
  'DRAFT',
  'PENDING_VALIDATION',
  'ACTIVE',
  'REJECTED',
  'DEFERRED',
  'CLOSED',
  'ARCHIVED'
);

ALTER TABLE "BudgetLine" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "BudgetLine" ALTER COLUMN "status" TYPE "BudgetLineStatus_new" USING ("status"::text::"BudgetLineStatus_new");
ALTER TABLE "BudgetLine" ALTER COLUMN "status" SET DEFAULT 'DRAFT'::"BudgetLineStatus_new";

DROP TYPE "BudgetLineStatus";
ALTER TYPE "BudgetLineStatus_new" RENAME TO "BudgetLineStatus";

-- BudgetEnvelopeStatus
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

-- FK deferred exercise
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
