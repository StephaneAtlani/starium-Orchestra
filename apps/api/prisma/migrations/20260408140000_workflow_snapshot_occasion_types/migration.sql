-- Types d’occasion globaux pour versions figées automatiques (Soumis / Validé) — idempotent.
INSERT INTO "BudgetSnapshotOccasionType" ("id", "clientId", "code", "label", "description", "sortOrder", "isActive", "createdAt", "updatedAt")
SELECT
  md5(random()::text || clock_timestamp()::text),
  NULL,
  'WORKFLOW_SUBMITTED',
  'Soumission (workflow)',
  'Capture automatique lors du passage du budget à « Soumis » — traçabilité.',
  5,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM "BudgetSnapshotOccasionType" t WHERE t."clientId" IS NULL AND t."code" = 'WORKFLOW_SUBMITTED'
);

INSERT INTO "BudgetSnapshotOccasionType" ("id", "clientId", "code", "label", "description", "sortOrder", "isActive", "createdAt", "updatedAt")
SELECT
  md5(random()::text || clock_timestamp()::text),
  NULL,
  'WORKFLOW_VALIDATED',
  'Validation (workflow)',
  'Capture automatique lors du passage du budget à « Validé » — traçabilité.',
  6,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM "BudgetSnapshotOccasionType" t WHERE t."clientId" IS NULL AND t."code" = 'WORKFLOW_VALIDATED'
);
