-- COMP-004 EV.5 : kind métier persisté sur ComplianceEvidence
ALTER TABLE "ComplianceEvidence" ADD COLUMN IF NOT EXISTS "kind" TEXT;
