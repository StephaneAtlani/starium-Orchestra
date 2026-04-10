-- Single budget amount per line: keep operational value (revised when non-zero, else initial).
UPDATE "BudgetLine"
SET "initialAmount" = COALESCE(NULLIF("revisedAmount", 0), "initialAmount");

UPDATE "BudgetSnapshotLine"
SET "initialAmount" = COALESCE(NULLIF("revisedAmount", 0), "initialAmount");

UPDATE "BudgetSnapshot"
SET "totalInitialAmount" = COALESCE(NULLIF("totalRevisedAmount", 0), "totalInitialAmount");

ALTER TABLE "BudgetLine" DROP COLUMN "revisedAmount";
ALTER TABLE "BudgetSnapshotLine" DROP COLUMN "revisedAmount";
ALTER TABLE "BudgetSnapshot" DROP COLUMN "totalRevisedAmount";
