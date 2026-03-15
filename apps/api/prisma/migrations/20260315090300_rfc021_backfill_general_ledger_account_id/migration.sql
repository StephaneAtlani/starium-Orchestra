-- Backfill generalLedgerAccountId for existing BudgetLines (RFC-021).
-- For each client that has BudgetLines with null generalLedgerAccountId,
-- create a default GeneralLedgerAccount and set it on those lines.
-- Then make the column NOT NULL.

WITH clients_needing AS (
  SELECT DISTINCT "clientId" FROM "BudgetLine" WHERE "generalLedgerAccountId" IS NULL
),
inserted AS (
  INSERT INTO "GeneralLedgerAccount" (id, "clientId", code, name, description, "isActive", "sortOrder", "createdAt", "updatedAt")
  SELECT gen_random_uuid()::text, "clientId", '999999', 'Non affecté', NULL, true, 0, NOW(), NOW()
  FROM clients_needing
  RETURNING id, "clientId"
)
UPDATE "BudgetLine" bl
SET "generalLedgerAccountId" = i.id
FROM inserted i
WHERE bl."clientId" = i."clientId" AND bl."generalLedgerAccountId" IS NULL;

-- Make generalLedgerAccountId required
ALTER TABLE "BudgetLine" ALTER COLUMN "generalLedgerAccountId" SET NOT NULL;
