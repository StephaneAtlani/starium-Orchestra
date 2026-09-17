-- Métadonnées catalogue conformité (périmètre + organisme).
ALTER TABLE "ComplianceFramework" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "ComplianceFramework" ADD COLUMN IF NOT EXISTS "provider" TEXT;
