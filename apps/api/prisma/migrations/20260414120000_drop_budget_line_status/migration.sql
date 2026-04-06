-- Pas de cycle de vie au niveau ligne : cohérent avec budget / enveloppe sans statut propre.

DROP INDEX IF EXISTS "BudgetLine_status_idx";

ALTER TABLE "BudgetLine" DROP COLUMN IF EXISTS "status";

ALTER TABLE "BudgetSnapshotLine" DROP COLUMN IF EXISTS "lineStatus";

DROP TYPE IF EXISTS "BudgetLineStatus";
