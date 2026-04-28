-- Taxonomie risques V1 - Flags explicites de catalogue et recommandation.
-- isActive = état métier global (pas utilisé pour masquer le catalogue V1)
-- isVisibleInCatalog = visibilité création V1

ALTER TABLE "RiskDomain"
ADD COLUMN IF NOT EXISTS "isVisibleInCatalog" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "RiskType"
ADD COLUMN IF NOT EXISTS "isVisibleInCatalog" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "isRecommended" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "RiskDomain_clientId_isVisibleInCatalog_idx"
  ON "RiskDomain"("clientId", "isVisibleInCatalog");

CREATE INDEX IF NOT EXISTS "RiskType_clientId_isVisibleInCatalog_isRecommended_idx"
  ON "RiskType"("clientId", "isVisibleInCatalog", "isRecommended");

-- Les référentiels legacy restent actifs côté métier.
UPDATE "RiskDomain" SET "isActive" = true;
UPDATE "RiskType" SET "isActive" = true;

-- Visibilité V1 par domaine.
WITH visible_domains AS (
  SELECT unnest(ARRAY[
    'GENERAL',
    'STRATEGY',
    'GOVERNANCE',
    'FINANCE',
    'PROJECTS',
    'OPERATIONS',
    'CONTINUITY',
    'IT',
    'CYBERSECURITY',
    'DATA',
    'SUPPLIERS',
    'LEGAL_COMPLIANCE',
    'HUMAN_RESOURCES',
    'REPUTATION'
  ]) AS code
)
UPDATE "RiskDomain" rd
SET "isVisibleInCatalog" = EXISTS (
  SELECT 1 FROM visible_domains vd WHERE vd.code = rd."code"
);

UPDATE "RiskType" rt
SET "isVisibleInCatalog" = rd."isVisibleInCatalog"
FROM "RiskDomain" rd
WHERE rd."id" = rt."domainId";

-- Types recommandés par défaut (surchargeable par client admin ensuite).
UPDATE "RiskType"
SET "isRecommended" = true
WHERE "code" IN (
  'OTHER_STRATEGIC_RISK',
  'OTHER_GOVERNANCE_RISK',
  'OTHER_FINANCIAL_RISK',
  'OTHER_PROJECT_RISK',
  'OTHER_OPERATIONAL_RISK',
  'OTHER_CONTINUITY_RISK',
  'OTHER_IT_RISK',
  'OTHER_CYBER_RISK',
  'OTHER_DATA_RISK',
  'OTHER_SUPPLIER_RISK',
  'OTHER_LEGAL_COMPLIANCE_RISK',
  'OTHER_HR_RISK',
  'OTHER_REPUTATION_RISK'
);
