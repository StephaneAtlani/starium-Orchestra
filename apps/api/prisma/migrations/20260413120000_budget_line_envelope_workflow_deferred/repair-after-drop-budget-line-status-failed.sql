-- Réparation manuelle si la migration a échoué sur DROP TYPE "BudgetLineStatus"
-- (BudgetLine déjà sur BudgetLineStatus_new, BudgetSnapshotLine encore sur l'ancien type).
--
-- Si la migration s’est arrêtée au DROP, la partie enveloppe + deferred n’a probablement pas tourné :
--   voir repair-part2-envelope-deferred.sql
--
-- Après schéma aligné avec migration.sql :
--   pnpm exec prisma migrate resolve --applied 20260413120000_budget_line_envelope_workflow_deferred
--   pnpm exec prisma migrate deploy

ALTER TABLE "BudgetSnapshotLine" ALTER COLUMN "lineStatus" TYPE "BudgetLineStatus_new" USING ("lineStatus"::text::"BudgetLineStatus_new");

DROP TYPE "BudgetLineStatus";

ALTER TYPE "BudgetLineStatus_new" RENAME TO "BudgetLineStatus";
