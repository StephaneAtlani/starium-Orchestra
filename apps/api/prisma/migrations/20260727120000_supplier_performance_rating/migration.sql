-- Évaluation fournisseur (bandeau KPI + colonne « Évaluation » de /suppliers)
-- Note sur 5 avec une décimale ; NULL = fournisseur non encore évalué.

ALTER TABLE "Supplier" ADD COLUMN "performanceRating" DECIMAL(2,1);

ALTER TABLE "Supplier"
  ADD CONSTRAINT "Supplier_performanceRating_range"
  CHECK ("performanceRating" IS NULL OR ("performanceRating" >= 1.0 AND "performanceRating" <= 5.0));
