-- Migration 2 pour RFC FC-006 TVA/HT/TTC
-- Étape 2 : backfill amountHt = amount (legacy HT)
-- Étape 3 : rendre amountHt NOT NULL

-- Étape 2 : backfill amountHt depuis amount (legacy HT)
UPDATE "FinancialEvent"
SET "amountHt" = COALESCE("amount", 0)
WHERE "amountHt" IS NULL;

-- Étape 3 : contrainte NOT NULL sur amountHt
ALTER TABLE "FinancialEvent"
ALTER COLUMN "amountHt" SET NOT NULL;

