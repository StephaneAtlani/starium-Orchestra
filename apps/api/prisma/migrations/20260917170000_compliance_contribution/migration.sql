-- COMP.V2 : contributions d’évaluation
CREATE TYPE "ComplianceContributionStatus" AS ENUM (
  'TODO',
  'IN_PROGRESS',
  'BLOCKED',
  'SUBMITTED',
  'ACCEPTED',
  'NEEDS_MORE'
);

CREATE TABLE "ComplianceContribution" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "assigneeUserId" TEXT NOT NULL,
    "instruction" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3),
    "status" "ComplianceContributionStatus" NOT NULL DEFAULT 'TODO',
    "response" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceContribution_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ComplianceContribution_clientId_assigneeUserId_idx" ON "ComplianceContribution"("clientId", "assigneeUserId");
CREATE INDEX "ComplianceContribution_clientId_requirementId_idx" ON "ComplianceContribution"("clientId", "requirementId");
CREATE INDEX "ComplianceContribution_clientId_status_idx" ON "ComplianceContribution"("clientId", "status");

ALTER TABLE "ComplianceContribution" ADD CONSTRAINT "ComplianceContribution_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComplianceContribution" ADD CONSTRAINT "ComplianceContribution_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "ComplianceRequirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComplianceContribution" ADD CONSTRAINT "ComplianceContribution_assigneeUserId_fkey" FOREIGN KEY ("assigneeUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
