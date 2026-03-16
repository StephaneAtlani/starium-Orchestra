-- RFC-021-CORR: rendre le compte comptable optionnel par client
ALTER TABLE "Client"
ADD COLUMN IF NOT EXISTS "budget_accounting_enabled" BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE "BudgetLine"
ALTER COLUMN "general_ledger_account_id" DROP NOT NULL;