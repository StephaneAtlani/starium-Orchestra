-- Ensure enum exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BudgetEnvelopeStatus') THEN
    CREATE TYPE "BudgetEnvelopeStatus" AS ENUM ('DRAFT', 'ACTIVE', 'LOCKED', 'ARCHIVED');
  END IF;
END
$$;

-- Idempotent migration:
-- - if column does not exist, create it
-- - if it exists with another enum (BudgetStatus), convert it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'BudgetEnvelope'
      AND column_name = 'status'
  ) THEN
    ALTER TABLE "BudgetEnvelope"
      ADD COLUMN "status" "BudgetEnvelopeStatus" NOT NULL DEFAULT 'ACTIVE';
  ELSE
    ALTER TABLE "BudgetEnvelope"
      ALTER COLUMN "status" DROP DEFAULT,
      ALTER COLUMN "status" TYPE "BudgetEnvelopeStatus"
        USING ("status"::text::"BudgetEnvelopeStatus"),
      ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
  END IF;
END
$$;
