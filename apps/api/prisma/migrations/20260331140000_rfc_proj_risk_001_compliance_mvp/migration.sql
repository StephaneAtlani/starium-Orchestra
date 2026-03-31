-- RFC-PROJ-RISK-001 — risques projet MVP + conformité (tables + extension ProjectRisk)

-- Enums métier
CREATE TYPE "ProjectRiskCriticality" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "ProjectRiskTreatmentStrategy" AS ENUM ('AVOID', 'REDUCE', 'TRANSFER', 'ACCEPT');
CREATE TYPE "ComplianceAssessmentStatus" AS ENUM ('COMPLIANT', 'PARTIALLY_COMPLIANT', 'NON_COMPLIANT', 'NOT_APPLICABLE');

-- Statut risque : OPEN | MONITORED | MITIGATED | CLOSED (ACCEPTED -> MITIGATED)
CREATE TYPE "ProjectRiskStatus_new" AS ENUM ('OPEN', 'MONITORED', 'MITIGATED', 'CLOSED');
ALTER TABLE "ProjectRisk" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "ProjectRisk" ALTER COLUMN "status" TYPE "ProjectRiskStatus_new" USING (
  CASE "status"::text
    WHEN 'ACCEPTED' THEN 'MITIGATED'::"ProjectRiskStatus_new"
    WHEN 'OPEN' THEN 'OPEN'::"ProjectRiskStatus_new"
    WHEN 'MITIGATED' THEN 'MITIGATED'::"ProjectRiskStatus_new"
    WHEN 'CLOSED' THEN 'CLOSED'::"ProjectRiskStatus_new"
    ELSE 'OPEN'::"ProjectRiskStatus_new"
  END
);
DROP TYPE "ProjectRiskStatus";
ALTER TYPE "ProjectRiskStatus_new" RENAME TO "ProjectRiskStatus";

-- Probabilité / impact : enums -> Int 1–5 (LOW=2, MEDIUM=3, HIGH=4)
ALTER TABLE "ProjectRisk" ADD COLUMN "probability_int" INTEGER;
ALTER TABLE "ProjectRisk" ADD COLUMN "impact_int" INTEGER;
UPDATE "ProjectRisk" SET "probability_int" = CASE "probability"::text
  WHEN 'LOW' THEN 2 WHEN 'MEDIUM' THEN 3 WHEN 'HIGH' THEN 4 ELSE 3 END;
UPDATE "ProjectRisk" SET "impact_int" = CASE "impact"::text
  WHEN 'LOW' THEN 2 WHEN 'MEDIUM' THEN 3 WHEN 'HIGH' THEN 4 ELSE 3 END;
ALTER TABLE "ProjectRisk" DROP COLUMN "probability";
ALTER TABLE "ProjectRisk" DROP COLUMN "impact";
ALTER TABLE "ProjectRisk" RENAME COLUMN "probability_int" TO "probability";
ALTER TABLE "ProjectRisk" RENAME COLUMN "impact_int" TO "impact";
ALTER TABLE "ProjectRisk" ALTER COLUMN "probability" SET NOT NULL;
ALTER TABLE "ProjectRisk" ALTER COLUMN "impact" SET NOT NULL;
DROP TYPE "ProjectRiskProbability";
DROP TYPE "ProjectRiskImpact";

ALTER TABLE "ProjectRisk" RENAME COLUMN "actionPlan" TO "mitigationPlan";

ALTER TABLE "ProjectRisk" ADD COLUMN "category" TEXT;
ALTER TABLE "ProjectRisk" ADD COLUMN "contingencyPlan" TEXT;
ALTER TABLE "ProjectRisk" ADD COLUMN "dueDate" TIMESTAMP(3);
ALTER TABLE "ProjectRisk" ADD COLUMN "detectedAt" TIMESTAMP(3);
ALTER TABLE "ProjectRisk" ADD COLUMN "closedAt" TIMESTAMP(3);
ALTER TABLE "ProjectRisk" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "ProjectRisk" ADD COLUMN "code" TEXT;
UPDATE "ProjectRisk" r
SET "code" = x.c
FROM (
  SELECT id, 'R-' || LPAD(ROW_NUMBER() OVER (PARTITION BY "projectId" ORDER BY "createdAt")::text, 3, '0') AS c
  FROM "ProjectRisk"
) x
WHERE r.id = x.id;
ALTER TABLE "ProjectRisk" ALTER COLUMN "code" SET NOT NULL;

ALTER TABLE "ProjectRisk" ADD COLUMN "criticalityScore" INTEGER;
ALTER TABLE "ProjectRisk" ADD COLUMN "criticalityLevel" "ProjectRiskCriticality";
UPDATE "ProjectRisk" SET "criticalityScore" = "probability" * "impact";
UPDATE "ProjectRisk" SET "criticalityLevel" = CASE
  WHEN ("probability" * "impact") <= 4 THEN 'LOW'::"ProjectRiskCriticality"
  WHEN ("probability" * "impact") <= 9 THEN 'MEDIUM'::"ProjectRiskCriticality"
  WHEN ("probability" * "impact") <= 16 THEN 'HIGH'::"ProjectRiskCriticality"
  ELSE 'CRITICAL'::"ProjectRiskCriticality"
END;
ALTER TABLE "ProjectRisk" ALTER COLUMN "criticalityScore" SET NOT NULL;
ALTER TABLE "ProjectRisk" ALTER COLUMN "criticalityLevel" SET NOT NULL;

UPDATE "ProjectRisk" SET "closedAt" = "updatedAt" WHERE "status"::text = 'CLOSED' AND "closedAt" IS NULL;

-- Tables conformité
CREATE TABLE "ComplianceFramework" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceFramework_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ComplianceRequirement" (
    "id" TEXT NOT NULL,
    "frameworkId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceRequirement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ComplianceStatus" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "status" "ComplianceAssessmentStatus" NOT NULL,
    "lastAssessmentDate" TIMESTAMP(3),
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceStatus_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ComplianceEvidence" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT,
    "fileId" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplianceEvidence_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ComplianceFramework_clientId_name_version_key" ON "ComplianceFramework"("clientId", "name", "version");
CREATE INDEX "ComplianceFramework_clientId_idx" ON "ComplianceFramework"("clientId");

CREATE UNIQUE INDEX "ComplianceRequirement_frameworkId_code_key" ON "ComplianceRequirement"("frameworkId", "code");
CREATE INDEX "ComplianceRequirement_frameworkId_idx" ON "ComplianceRequirement"("frameworkId");

CREATE UNIQUE INDEX "ComplianceStatus_clientId_requirementId_key" ON "ComplianceStatus"("clientId", "requirementId");
CREATE INDEX "ComplianceStatus_clientId_idx" ON "ComplianceStatus"("clientId");
CREATE INDEX "ComplianceStatus_requirementId_idx" ON "ComplianceStatus"("requirementId");

CREATE INDEX "ComplianceEvidence_clientId_requirementId_idx" ON "ComplianceEvidence"("clientId", "requirementId");

ALTER TABLE "ComplianceFramework" ADD CONSTRAINT "ComplianceFramework_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComplianceRequirement" ADD CONSTRAINT "ComplianceRequirement_frameworkId_fkey" FOREIGN KEY ("frameworkId") REFERENCES "ComplianceFramework"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComplianceStatus" ADD CONSTRAINT "ComplianceStatus_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComplianceStatus" ADD CONSTRAINT "ComplianceStatus_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "ComplianceRequirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComplianceEvidence" ADD CONSTRAINT "ComplianceEvidence_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComplianceEvidence" ADD CONSTRAINT "ComplianceEvidence_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "ComplianceRequirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- FK ProjectRisk -> ComplianceRequirement
ALTER TABLE "ProjectRisk" ADD COLUMN "complianceRequirementId" TEXT;
ALTER TABLE "ProjectRisk" ADD COLUMN "treatmentStrategy" "ProjectRiskTreatmentStrategy";
ALTER TABLE "ProjectRisk" ADD COLUMN "residualRiskLevel" "ProjectRiskCriticality";

CREATE UNIQUE INDEX "ProjectRisk_projectId_code_key" ON "ProjectRisk"("projectId", "code");
CREATE INDEX "ProjectRisk_projectId_sortOrder_idx" ON "ProjectRisk"("projectId", "sortOrder");
CREATE INDEX "ProjectRisk_complianceRequirementId_idx" ON "ProjectRisk"("complianceRequirementId");

ALTER TABLE "ProjectRisk" ADD CONSTRAINT "ProjectRisk_complianceRequirementId_fkey" FOREIGN KEY ("complianceRequirementId") REFERENCES "ComplianceRequirement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
