-- RFC-021-CORR: rendre le compte comptable optionnel par client
ALTER TABLE "Client"
ADD COLUMN IF NOT EXISTS "budgetAccountingEnabled" BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE "BudgetLine"
ALTER COLUMN "generalLedgerAccountId" DROP NOT NULL;