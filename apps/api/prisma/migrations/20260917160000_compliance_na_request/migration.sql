-- COMP.V2 : demandes de non-applicabilité (circuit séparé des évaluations)
CREATE TYPE "ComplianceNaRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

CREATE TABLE "ComplianceNaRequest" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "status" "ComplianceNaRequestStatus" NOT NULL DEFAULT 'PENDING',
    "justification" TEXT NOT NULL,
    "requestedByUserId" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceNaRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ComplianceNaRequest_clientId_requirementId_key" ON "ComplianceNaRequest"("clientId", "requirementId");
CREATE INDEX "ComplianceNaRequest_clientId_status_idx" ON "ComplianceNaRequest"("clientId", "status");
CREATE INDEX "ComplianceNaRequest_requirementId_idx" ON "ComplianceNaRequest"("requirementId");

ALTER TABLE "ComplianceNaRequest" ADD CONSTRAINT "ComplianceNaRequest_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComplianceNaRequest" ADD CONSTRAINT "ComplianceNaRequest_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "ComplianceRequirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
