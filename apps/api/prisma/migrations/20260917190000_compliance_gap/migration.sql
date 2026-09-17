-- COMP.V2 : écarts de conformité
CREATE TYPE "ComplianceGapStatus" AS ENUM (
  'OPEN',
  'IN_PROGRESS',
  'TO_VERIFY',
  'CLOSED',
  'CANCELLED'
);

CREATE TYPE "ComplianceGapCriticality" AS ENUM (
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL'
);

CREATE TABLE "ComplianceGap" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "finding" TEXT NOT NULL,
    "criticality" "ComplianceGapCriticality" NOT NULL DEFAULT 'MEDIUM',
    "status" "ComplianceGapStatus" NOT NULL DEFAULT 'OPEN',
    "ownerUserId" TEXT,
    "dueAt" TIMESTAMP(3),
    "businessImpact" TEXT,
    "rootCause" TEXT,
    "verificationNote" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "verifiedByUserId" TEXT,
    "closedAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "projectRiskId" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceGap_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ComplianceGap_clientId_status_idx" ON "ComplianceGap"("clientId", "status");
CREATE INDEX "ComplianceGap_clientId_requirementId_idx" ON "ComplianceGap"("clientId", "requirementId");
CREATE INDEX "ComplianceGap_clientId_ownerUserId_idx" ON "ComplianceGap"("clientId", "ownerUserId");

ALTER TABLE "ComplianceGap" ADD CONSTRAINT "ComplianceGap_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComplianceGap" ADD CONSTRAINT "ComplianceGap_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "ComplianceRequirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComplianceGap" ADD CONSTRAINT "ComplianceGap_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ComplianceGap" ADD CONSTRAINT "ComplianceGap_projectRiskId_fkey" FOREIGN KEY ("projectRiskId") REFERENCES "ProjectRisk"("id") ON DELETE SET NULL ON UPDATE CASCADE;
