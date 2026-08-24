-- RFC-PROJ-018 — ProjectRisk EBIOS RM minimal (champs).
--
-- treatmentStrategy : ajouté seulement dans 20260331140000_rfc_proj_risk_001_compliance_mvp.
-- Ne pas le SET NOT NULL ici (sinon P3009 sur base neuve). Voir aussi
-- 20260331150000_fix_project_risk_ebios_drift (idempotent / drift prod).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'ProjectRiskImpactCategory'
  ) THEN
    CREATE TYPE "ProjectRiskImpactCategory" AS ENUM (
      'FINANCIAL', 'OPERATIONAL', 'LEGAL', 'REPUTATION'
    );
  END IF;
END $$;

ALTER TABLE "ProjectRisk"
  ADD COLUMN IF NOT EXISTS "threatSource" TEXT NOT NULL DEFAULT '—',
  ADD COLUMN IF NOT EXISTS "businessImpact" TEXT NOT NULL DEFAULT '—',
  ADD COLUMN IF NOT EXISTS "likelihoodJustification" TEXT,
  ADD COLUMN IF NOT EXISTS "impactCategory" "ProjectRiskImpactCategory",
  ADD COLUMN IF NOT EXISTS "residualJustification" TEXT;
