-- RFC FC-006 (extension) : Budget.taxMode (HT|TTC) + Budget.defaultTaxRate
-- Ajout safe : enum + colonnes non destructives avec default sur taxMode.

-- Enums
CREATE TYPE "BudgetTaxMode" AS ENUM ('HT', 'TTC');

-- Budget
ALTER TABLE "Budget"
  ADD COLUMN "taxMode" "BudgetTaxMode" NOT NULL DEFAULT 'HT',
  ADD COLUMN "defaultTaxRate" DECIMAL(5,2);

