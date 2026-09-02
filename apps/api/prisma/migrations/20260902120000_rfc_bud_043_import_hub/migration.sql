-- RFC-BUD-043 — Import hub : purpose, defaultBudget, lastUsedAt

CREATE TYPE "BudgetImportPurpose" AS ENUM ('STRUCTURE', 'REALITY', 'MIXED');

ALTER TABLE "BudgetImportMapping"
  ADD COLUMN "importPurpose" "BudgetImportPurpose" NOT NULL DEFAULT 'MIXED',
  ADD COLUMN "defaultBudgetId" TEXT,
  ADD COLUMN "lastUsedAt" TIMESTAMP(3);

CREATE INDEX "BudgetImportMapping_clientId_importPurpose_idx" ON "BudgetImportMapping"("clientId", "importPurpose");
CREATE INDEX "BudgetImportMapping_clientId_defaultBudgetId_idx" ON "BudgetImportMapping"("clientId", "defaultBudgetId");

ALTER TABLE "BudgetImportMapping"
  ADD CONSTRAINT "BudgetImportMapping_defaultBudgetId_fkey"
  FOREIGN KEY ("defaultBudgetId") REFERENCES "Budget"("id") ON DELETE SET NULL ON UPDATE CASCADE;
