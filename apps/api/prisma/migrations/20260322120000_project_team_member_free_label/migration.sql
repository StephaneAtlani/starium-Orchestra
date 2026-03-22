-- CreateEnum
CREATE TYPE "ProjectTeamMemberAffiliation" AS ENUM ('INTERNAL', 'EXTERNAL');

-- AlterTable: add new columns (identityKey backfilled before NOT NULL)
ALTER TABLE "ProjectTeamMember" ADD COLUMN "freeLabel" VARCHAR(200),
ADD COLUMN "affiliation" "ProjectTeamMemberAffiliation",
ADD COLUMN "identityKey" VARCHAR(150);

UPDATE "ProjectTeamMember" SET "identityKey" = 'u:' || "userId";

ALTER TABLE "ProjectTeamMember" ALTER COLUMN "identityKey" SET NOT NULL;

-- Replace unique on (projectId, roleId, userId) by (projectId, roleId, identityKey)
ALTER TABLE "ProjectTeamMember" DROP CONSTRAINT "ProjectTeamMember_userId_fkey";

DROP INDEX "ProjectTeamMember_projectId_roleId_userId_key";

CREATE UNIQUE INDEX "ProjectTeamMember_projectId_roleId_identityKey_key" ON "ProjectTeamMember"("projectId", "roleId", "identityKey");

ALTER TABLE "ProjectTeamMember" ALTER COLUMN "userId" DROP NOT NULL;

ALTER TABLE "ProjectTeamMember" ADD CONSTRAINT "ProjectTeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
