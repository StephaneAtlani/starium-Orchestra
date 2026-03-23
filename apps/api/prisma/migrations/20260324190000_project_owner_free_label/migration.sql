-- Dénormalisation responsable nom libre (alignement équipe projet)
ALTER TABLE "Project" ADD COLUMN "ownerFreeLabel" VARCHAR(200);
ALTER TABLE "Project" ADD COLUMN "ownerAffiliation" "ProjectTeamMemberAffiliation";
