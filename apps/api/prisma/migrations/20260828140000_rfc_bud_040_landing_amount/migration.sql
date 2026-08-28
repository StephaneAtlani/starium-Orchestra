-- RFC-BUD-040 — atterrissage canonique persisté
ALTER TABLE "BudgetLine" ADD COLUMN "landingAmount" DECIMAL(18,2);
ALTER TABLE "BudgetLine" ADD COLUMN "landingComputedAt" TIMESTAMP(3);

ALTER TABLE "BudgetSnapshotLine" ADD COLUMN "landingAmount" DECIMAL(18,2);
