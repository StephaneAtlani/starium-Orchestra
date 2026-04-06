-- Les enveloppes n'ont pas de cycle de vie propre : le verrouillage / archivage est porté par le budget.

DROP INDEX IF EXISTS "BudgetEnvelope_status_idx";

ALTER TABLE "BudgetEnvelope" DROP COLUMN IF EXISTS "status";

DROP TYPE IF EXISTS "BudgetEnvelopeStatus";
