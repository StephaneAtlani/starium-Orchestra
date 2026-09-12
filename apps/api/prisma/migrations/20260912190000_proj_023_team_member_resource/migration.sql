-- RFC-PROJ-023 — lien membership → Resource HUMAN (externe catalogue RH)
ALTER TABLE "ProjectTeamGovernanceMembership"
  ADD COLUMN IF NOT EXISTS "resourceId" TEXT;

CREATE INDEX IF NOT EXISTS "ProjectTeamGovernanceMembership_resourceId_idx"
  ON "ProjectTeamGovernanceMembership"("resourceId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ProjectTeamGovernanceMembership_resourceId_fkey'
  ) THEN
    ALTER TABLE "ProjectTeamGovernanceMembership"
      ADD CONSTRAINT "ProjectTeamGovernanceMembership_resourceId_fkey"
      FOREIGN KEY ("resourceId") REFERENCES "Resource"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
