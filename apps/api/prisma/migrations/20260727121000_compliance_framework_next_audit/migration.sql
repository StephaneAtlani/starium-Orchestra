-- Échéance d'audit / recertification par référentiel
-- Alimente les cartes « Référentiels réglementaires » de /compliance.

ALTER TABLE "ComplianceFramework" ADD COLUMN "nextAuditAt" TIMESTAMP(3);
