-- BudgetLineStatus / BudgetEnvelopeStatus : PENDING_VALIDATION, REJECTED, DEFERRED
-- + deferredToExerciseId (FK BudgetExercise, SetNull)
--
-- Préambule : si une migration locale a supprimé status / enums (ex. drop_budget_envelope_status),
-- on recrée les types et colonnes avant d’étendre les enums existants (MVP 4 valeurs).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BudgetLineStatus') THEN
    CREATE TYPE "BudgetLineStatus" AS ENUM (
      'DRAFT',
      'PENDING_VALIDATION',
      'ACTIVE',
      'REJECTED',
      'DEFERRED',
      'CLOSED',
      'ARCHIVED'
    );
  END IF;
END $$;

ALTER TABLE "BudgetLine" ADD COLUMN IF NOT EXISTS "status" "BudgetLineStatus" NOT NULL DEFAULT 'DRAFT';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BudgetEnvelopeStatus') THEN
    CREATE TYPE "BudgetEnvelopeStatus" AS ENUM (
      'DRAFT',
      'PENDING_VALIDATION',
      'ACTIVE',
      'REJECTED',
      'DEFERRED',
      'LOCKED',
      'ARCHIVED'
    );
  END IF;
END $$;

ALTER TABLE "BudgetEnvelope" ADD COLUMN IF NOT EXISTS "status" "BudgetEnvelopeStatus" NOT NULL DEFAULT 'ACTIVE';

ALTER TABLE "BudgetSnapshotLine" ADD COLUMN IF NOT EXISTS "lineStatus" "BudgetLineStatus" NOT NULL DEFAULT 'DRAFT';

-- Extension enum ligne : uniquement si l’enum MVP n’a pas encore DEFERRED (sinon déjà à jour)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'BudgetLineStatus' AND e.enumlabel = 'DEFERRED'
  ) THEN
    DROP TYPE IF EXISTS "BudgetLineStatus_new";

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

    ALTER TABLE "BudgetSnapshotLine" ALTER COLUMN "lineStatus" TYPE "BudgetLineStatus_new" USING ("lineStatus"::text::"BudgetLineStatus_new");

    DROP TYPE "BudgetLineStatus";
    ALTER TYPE "BudgetLineStatus_new" RENAME TO "BudgetLineStatus";
  END IF;
END $$;

-- Extension enum enveloppe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'BudgetEnvelopeStatus' AND e.enumlabel = 'DEFERRED'
  ) THEN
    DROP TYPE IF EXISTS "BudgetEnvelopeStatus_new";

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
  END IF;
END $$;

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
