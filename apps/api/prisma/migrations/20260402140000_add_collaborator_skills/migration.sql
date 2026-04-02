-- RFC-TEAM-004 CollaboratorSkill

CREATE TYPE "CollaboratorSkillSource" AS ENUM (
  'SELF_DECLARED',
  'MANAGER_ASSESSED',
  'HR_REVIEW',
  'IMPORTED',
  'OTHER'
);

CREATE TABLE "CollaboratorSkill" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "collaboratorId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "level" "SkillReferenceLevel" NOT NULL DEFAULT 'BEGINNER',
    "source" "CollaboratorSkillSource" NOT NULL DEFAULT 'SELF_DECLARED',
    "comment" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "validatedByUserId" TEXT,
    "validatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollaboratorSkill_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CollaboratorSkill_collaboratorId_skillId_key"
    ON "CollaboratorSkill"("collaboratorId", "skillId");

CREATE INDEX "CollaboratorSkill_clientId_idx"
    ON "CollaboratorSkill"("clientId");

CREATE INDEX "CollaboratorSkill_clientId_collaboratorId_idx"
    ON "CollaboratorSkill"("clientId", "collaboratorId");

CREATE INDEX "CollaboratorSkill_clientId_skillId_idx"
    ON "CollaboratorSkill"("clientId", "skillId");

CREATE INDEX "CollaboratorSkill_clientId_level_idx"
    ON "CollaboratorSkill"("clientId", "level");

CREATE INDEX "CollaboratorSkill_validatedByUserId_idx"
    ON "CollaboratorSkill"("validatedByUserId");

ALTER TABLE "CollaboratorSkill"
    ADD CONSTRAINT "CollaboratorSkill_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CollaboratorSkill"
    ADD CONSTRAINT "CollaboratorSkill_collaboratorId_fkey"
    FOREIGN KEY ("collaboratorId") REFERENCES "Collaborator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CollaboratorSkill"
    ADD CONSTRAINT "CollaboratorSkill_skillId_fkey"
    FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CollaboratorSkill"
    ADD CONSTRAINT "CollaboratorSkill_validatedByUserId_fkey"
    FOREIGN KEY ("validatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
