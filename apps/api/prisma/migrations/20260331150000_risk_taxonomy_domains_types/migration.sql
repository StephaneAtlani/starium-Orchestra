-- Taxonomie risques : RiskDomain / RiskType (client-scoped), FK ProjectRisk.riskTypeId + backfill legacy.
-- Doit s’appliquer après RFC-PROJ-018 (impactCategory) et RFC-PROJ-RISK-001 (compliance sur ProjectRisk).

CREATE TABLE "RiskDomain" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RiskDomain_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RiskDomain_clientId_code_key" ON "RiskDomain"("clientId", "code");
CREATE INDEX "RiskDomain_clientId_idx" ON "RiskDomain"("clientId");

ALTER TABLE "RiskDomain" ADD CONSTRAINT "RiskDomain_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "RiskType" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RiskType_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RiskType_domainId_code_key" ON "RiskType"("domainId", "code");
CREATE INDEX "RiskType_clientId_idx" ON "RiskType"("clientId");
CREATE INDEX "RiskType_domainId_idx" ON "RiskType"("domainId");

ALTER TABLE "RiskType" ADD CONSTRAINT "RiskType_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RiskType" ADD CONSTRAINT "RiskType_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "RiskDomain"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProjectRisk" ADD COLUMN "riskTypeId" TEXT;

CREATE INDEX "ProjectRisk_riskTypeId_idx" ON "ProjectRisk"("riskTypeId");

-- Domaines par client (codes stables)
INSERT INTO "RiskDomain" ("id", "clientId", "code", "name", "description", "isActive", "createdAt", "updatedAt")
SELECT
  'rd_' || md5(c."id" || '|GENERAL'),
  c."id",
  'GENERAL',
  'Général',
  NULL,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Client" c;

INSERT INTO "RiskDomain" ("id", "clientId", "code", "name", "description", "isActive", "createdAt", "updatedAt")
SELECT
  'rd_' || md5(c."id" || '|FINANCE'),
  c."id",
  'FINANCE',
  'Financier',
  NULL,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Client" c;

INSERT INTO "RiskDomain" ("id", "clientId", "code", "name", "description", "isActive", "createdAt", "updatedAt")
SELECT
  'rd_' || md5(c."id" || '|OPERATIONS'),
  c."id",
  'OPERATIONS',
  'Opérationnel',
  NULL,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Client" c;

INSERT INTO "RiskDomain" ("id", "clientId", "code", "name", "description", "isActive", "createdAt", "updatedAt")
SELECT
  'rd_' || md5(c."id" || '|LEGAL'),
  c."id",
  'LEGAL',
  'Juridique',
  NULL,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Client" c;

INSERT INTO "RiskDomain" ("id", "clientId", "code", "name", "description", "isActive", "createdAt", "updatedAt")
SELECT
  'rd_' || md5(c."id" || '|REPUTATION'),
  c."id",
  'REPUTATION',
  'Réputation',
  NULL,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Client" c;

INSERT INTO "RiskDomain" ("id", "clientId", "code", "name", "description", "isActive", "createdAt", "updatedAt")
SELECT
  'rd_' || md5(c."id" || '|STRATEGY'),
  c."id",
  'STRATEGY',
  'Stratégie',
  NULL,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Client" c;

INSERT INTO "RiskDomain" ("id", "clientId", "code", "name", "description", "isActive", "createdAt", "updatedAt")
SELECT
  'rd_' || md5(c."id" || '|IT'),
  c."id",
  'IT',
  'IT',
  NULL,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Client" c;

INSERT INTO "RiskDomain" ("id", "clientId", "code", "name", "description", "isActive", "createdAt", "updatedAt")
SELECT
  'rd_' || md5(c."id" || '|CYBERSECURITY'),
  c."id",
  'CYBERSECURITY',
  'Cybersécurité',
  NULL,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Client" c;

-- Types : helper via jointure domaine
INSERT INTO "RiskType" ("id", "clientId", "domainId", "code", "name", "isActive", "createdAt", "updatedAt")
SELECT
  'rt_' || md5(rd."clientId" || '|' || rd."code" || '|UNCLASSIFIED'),
  rd."clientId",
  rd."id",
  'UNCLASSIFIED',
  'Non classé',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "RiskDomain" rd WHERE rd."code" = 'GENERAL';

INSERT INTO "RiskType" ("id", "clientId", "domainId", "code", "name", "isActive", "createdAt", "updatedAt")
SELECT
  'rt_' || md5(rd."clientId" || '|' || rd."code" || '|LEGACY_FINANCIAL'),
  rd."clientId",
  rd."id",
  'LEGACY_FINANCIAL',
  'Ancien mapping impact financier',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "RiskDomain" rd WHERE rd."code" = 'FINANCE';

INSERT INTO "RiskType" ("id", "clientId", "domainId", "code", "name", "isActive", "createdAt", "updatedAt")
SELECT
  'rt_' || md5(rd."clientId" || '|' || rd."code" || '|BUDGET_OVERRUN'),
  rd."clientId",
  rd."id",
  'BUDGET_OVERRUN',
  'Dépassement budgétaire',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "RiskDomain" rd WHERE rd."code" = 'FINANCE';

INSERT INTO "RiskType" ("id", "clientId", "domainId", "code", "name", "isActive", "createdAt", "updatedAt")
SELECT
  'rt_' || md5(rd."clientId" || '|' || rd."code" || '|LEGACY_OPERATIONAL'),
  rd."clientId",
  rd."id",
  'LEGACY_OPERATIONAL',
  'Ancien mapping impact opérationnel',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "RiskDomain" rd WHERE rd."code" = 'OPERATIONS';

INSERT INTO "RiskType" ("id", "clientId", "domainId", "code", "name", "isActive", "createdAt", "updatedAt")
SELECT
  'rt_' || md5(rd."clientId" || '|' || rd."code" || '|LEGACY_LEGAL'),
  rd."clientId",
  rd."id",
  'LEGACY_LEGAL',
  'Ancien mapping impact juridique',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "RiskDomain" rd WHERE rd."code" = 'LEGAL';

INSERT INTO "RiskType" ("id", "clientId", "domainId", "code", "name", "isActive", "createdAt", "updatedAt")
SELECT
  'rt_' || md5(rd."clientId" || '|' || rd."code" || '|LEGACY_REPUTATION'),
  rd."clientId",
  rd."id",
  'LEGACY_REPUTATION',
  'Ancien mapping réputation',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "RiskDomain" rd WHERE rd."code" = 'REPUTATION';

INSERT INTO "RiskType" ("id", "clientId", "domainId", "code", "name", "isActive", "createdAt", "updatedAt")
SELECT
  'rt_' || md5(rd."clientId" || '|' || rd."code" || '|STRATEGIC_MISALIGNMENT'),
  rd."clientId",
  rd."id",
  'STRATEGIC_MISALIGNMENT',
  'Décalage stratégique',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "RiskDomain" rd WHERE rd."code" = 'STRATEGY';

INSERT INTO "RiskType" ("id", "clientId", "domainId", "code", "name", "isActive", "createdAt", "updatedAt")
SELECT
  'rt_' || md5(rd."clientId" || '|' || rd."code" || '|IT_OUTAGE'),
  rd."clientId",
  rd."id",
  'IT_OUTAGE',
  'Indisponibilité SI',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "RiskDomain" rd WHERE rd."code" = 'IT';

INSERT INTO "RiskType" ("id", "clientId", "domainId", "code", "name", "isActive", "createdAt", "updatedAt")
SELECT
  'rt_' || md5(rd."clientId" || '|' || rd."code" || '|DATA_BREACH'),
  rd."clientId",
  rd."id",
  'DATA_BREACH',
  'Fuite / violation de données',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "RiskDomain" rd WHERE rd."code" = 'CYBERSECURITY';

-- Backfill ProjectRisk depuis impactCategory (enum legacy) → type LEGACY_* ou UNCLASSIFIED
UPDATE "ProjectRisk" pr
SET "riskTypeId" = COALESCE(
  CASE pr."impactCategory"::text
    WHEN 'FINANCIAL' THEN (
      SELECT rt."id" FROM "RiskType" rt
      INNER JOIN "RiskDomain" rd ON rd."id" = rt."domainId"
      WHERE rd."clientId" = pr."clientId" AND rd."code" = 'FINANCE' AND rt."code" = 'LEGACY_FINANCIAL'
      LIMIT 1
    )
    WHEN 'OPERATIONAL' THEN (
      SELECT rt."id" FROM "RiskType" rt
      INNER JOIN "RiskDomain" rd ON rd."id" = rt."domainId"
      WHERE rd."clientId" = pr."clientId" AND rd."code" = 'OPERATIONS' AND rt."code" = 'LEGACY_OPERATIONAL'
      LIMIT 1
    )
    WHEN 'LEGAL' THEN (
      SELECT rt."id" FROM "RiskType" rt
      INNER JOIN "RiskDomain" rd ON rd."id" = rt."domainId"
      WHERE rd."clientId" = pr."clientId" AND rd."code" = 'LEGAL' AND rt."code" = 'LEGACY_LEGAL'
      LIMIT 1
    )
    WHEN 'REPUTATION' THEN (
      SELECT rt."id" FROM "RiskType" rt
      INNER JOIN "RiskDomain" rd ON rd."id" = rt."domainId"
      WHERE rd."clientId" = pr."clientId" AND rd."code" = 'REPUTATION' AND rt."code" = 'LEGACY_REPUTATION'
      LIMIT 1
    )
    ELSE NULL
  END,
  (
    SELECT rt."id" FROM "RiskType" rt
    INNER JOIN "RiskDomain" rd ON rd."id" = rt."domainId"
    WHERE rd."clientId" = pr."clientId" AND rd."code" = 'GENERAL' AND rt."code" = 'UNCLASSIFIED'
    LIMIT 1
  )
);

ALTER TABLE "ProjectRisk" ADD CONSTRAINT "ProjectRisk_riskTypeId_fkey" FOREIGN KEY ("riskTypeId") REFERENCES "RiskType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProjectRisk" ALTER COLUMN "riskTypeId" SET NOT NULL;
