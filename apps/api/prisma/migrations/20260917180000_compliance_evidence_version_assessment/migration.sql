-- COMP.V2 : versioning + appréciation des preuves
CREATE TYPE "ComplianceEvidenceAssessment" AS ENUM (
  'TO_REVIEW',
  'RELEVANT',
  'PARTIAL',
  'INSUFFICIENT'
);

ALTER TABLE "ComplianceEvidence"
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "isCurrent" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "supersedesId" TEXT,
  ADD COLUMN "assessment" "ComplianceEvidenceAssessment" NOT NULL DEFAULT 'TO_REVIEW',
  ADD COLUMN "collectedAt" TIMESTAMP(3);

CREATE INDEX "ComplianceEvidence_clientId_requirementId_isCurrent_idx"
  ON "ComplianceEvidence"("clientId", "requirementId", "isCurrent");

ALTER TABLE "ComplianceEvidence"
  ADD CONSTRAINT "ComplianceEvidence_supersedesId_fkey"
  FOREIGN KEY ("supersedesId") REFERENCES "ComplianceEvidence"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
