-- RFC-BUD-041 — planning 12 mois persisté sur les lignes de version figée
ALTER TABLE "BudgetSnapshotLine" ADD COLUMN "planningMode" "BudgetLinePlanningMode";
ALTER TABLE "BudgetSnapshotLine" ADD COLUMN "planningTotalAmount" DECIMAL(18,2);
ALTER TABLE "BudgetSnapshotLine" ADD COLUMN "planningMonths" JSONB;
