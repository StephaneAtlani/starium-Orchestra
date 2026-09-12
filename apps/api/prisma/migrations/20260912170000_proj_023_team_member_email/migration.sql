-- RFC-PROJ-023 — e-mail optionnel sur membre d’équipe (invitations externes)
ALTER TABLE "ProjectTeamGovernanceMembership"
  ADD COLUMN IF NOT EXISTS "email" VARCHAR(320);
