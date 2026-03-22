-- Migration 1 (safe additive) pour RFC FC-006 TVA/HT/TTC
-- Étape 1 : ajouter les colonnes TVA sur FinancialEvent en nullable, sans contrainte forte.

ALTER TABLE "FinancialEvent"
  ADD COLUMN "amountHt" DECIMAL(18,2),
  ADD COLUMN "taxRate" DECIMAL(5,2),
  ADD COLUMN "taxAmount" DECIMAL(18,2),
  ADD COLUMN "amountTtc" DECIMAL(18,2);

