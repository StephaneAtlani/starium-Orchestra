-- RFC-PROJ-023 — identité externe enrichie (prénom, nom, entreprise)
ALTER TABLE "ProjectTeamGovernanceMembership"
  ADD COLUMN IF NOT EXISTS "firstName" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "lastName" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "companyName" VARCHAR(200);
