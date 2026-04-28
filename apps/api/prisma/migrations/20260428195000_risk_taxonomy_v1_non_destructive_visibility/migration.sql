-- Taxonomie risques V1 : stratégie non destructive.
-- Objectif :
-- 1) Conserver tous les domaines/types legacy déjà existants.
-- 2) Ne pas réécrire les risques existants.
-- 3) Sortir les domaines/types hors V1 du catalogue de création
--    via bascule isActive=false (lisibles en historique via includeLegacy=true).

-- Domaine V1 visibles par défaut (+ GENERAL fallback technique).
WITH v1_domain_codes AS (
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
SET "isActive" = EXISTS (
  SELECT 1 FROM v1_domain_codes v1 WHERE v1.code = rd."code"
);

-- Types : mêmes règles de visibilité que leur domaine parent.
UPDATE "RiskType" rt
SET "isActive" = rd."isActive"
FROM "RiskDomain" rd
WHERE rd."id" = rt."domainId";
