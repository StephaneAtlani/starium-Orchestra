-- RFC FC-006 : Tax display/input modes (Client) + BudgetLine taxRate
-- Ajout safe : champs enum + colonnes nullable sauf enums avec valeurs par défaut.

-- Enums
CREATE TYPE "TaxDisplayMode" AS ENUM ('HT', 'TTC');
CREATE TYPE "TaxInputMode" AS ENUM ('HT', 'TTC');

-- Client
ALTER TABLE "Client"
  ADD COLUMN "taxDisplayMode" "TaxDisplayMode" NOT NULL DEFAULT 'HT',
  ADD COLUMN "taxInputMode"   "TaxInputMode"   NOT NULL DEFAULT 'HT',
  ADD COLUMN "defaultTaxRate" DECIMAL(5,2);

-- BudgetLine
ALTER TABLE "BudgetLine"
  ADD COLUMN "taxRate" DECIMAL(5,2);

