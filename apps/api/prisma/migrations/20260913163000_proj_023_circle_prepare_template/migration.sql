-- RFC-PROJ-023 C — lien permanent équipe (cercle) ↔ modèle de point (prepare template)
ALTER TABLE "ProjectGovernanceCircle"
  ADD COLUMN IF NOT EXISTS "prepareTemplateId" TEXT;

CREATE INDEX IF NOT EXISTS "ProjectGovernanceCircle_prepareTemplateId_idx"
  ON "ProjectGovernanceCircle"("prepareTemplateId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ProjectGovernanceCircle_prepareTemplateId_fkey'
  ) THEN
    ALTER TABLE "ProjectGovernanceCircle"
      ADD CONSTRAINT "ProjectGovernanceCircle_prepareTemplateId_fkey"
      FOREIGN KEY ("prepareTemplateId")
      REFERENCES "project_review_prepare_templates"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;
