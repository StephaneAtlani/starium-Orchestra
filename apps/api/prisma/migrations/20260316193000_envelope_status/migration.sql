-- RFC: add status on budget envelopes
ALTER TABLE "BudgetEnvelope"
ADD COLUMN "status" "BudgetStatus" NOT NULL DEFAULT 'DRAFT';

-- Backfill existing records to DRAFT (default already handles existing rows, but we keep it explicit)
UPDATE "BudgetEnvelope"
SET "status" = 'DRAFT'
WHERE "status" IS NULL;

-- Optional index to query envelopes by status
CREATE INDEX "BudgetEnvelope_status_idx" ON "BudgetEnvelope"("status");

