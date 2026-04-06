-- Cycle de vie budget : DRAFT → SUBMITTED → REVISED → VALIDATED → LOCKED → ARCHIVED
-- Ancien ACTIVE → VALIDATED (budget « en vigueur » opérationnel).

CREATE TYPE "BudgetStatus_new" AS ENUM (
  'DRAFT',
  'SUBMITTED',
  'REVISED',
  'VALIDATED',
  'LOCKED',
  'ARCHIVED'
);

ALTER TABLE "Budget" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Budget" ALTER COLUMN "status" TYPE "BudgetStatus_new" USING (
  CASE "status"::text
    WHEN 'ACTIVE' THEN 'VALIDATED'
    ELSE "status"::text
  END
)::"BudgetStatus_new";
ALTER TABLE "Budget" ALTER COLUMN "status" SET DEFAULT 'DRAFT'::"BudgetStatus_new";

ALTER TABLE "BudgetSnapshot" ALTER COLUMN "budgetStatus" TYPE "BudgetStatus_new" USING (
  CASE "budgetStatus"::text
    WHEN 'ACTIVE' THEN 'VALIDATED'
    ELSE "budgetStatus"::text
  END
)::"BudgetStatus_new";

DROP TYPE "BudgetStatus";
ALTER TYPE "BudgetStatus_new" RENAME TO "BudgetStatus";
