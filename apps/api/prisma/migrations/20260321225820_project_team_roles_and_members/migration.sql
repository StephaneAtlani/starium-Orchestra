-- CreateEnum
CREATE TYPE "ProjectTeamRoleSystemKind" AS ENUM ('SPONSOR', 'OWNER');

-- CreateTable
CREATE TABLE "ProjectTeamRole" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "systemKind" "ProjectTeamRoleSystemKind",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectTeamRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectTeamMember" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectTeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectTeamRole_clientId_idx" ON "ProjectTeamRole"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectTeamRole_clientId_name_key" ON "ProjectTeamRole"("clientId", "name");

-- CreateIndex
CREATE INDEX "ProjectTeamMember_clientId_idx" ON "ProjectTeamMember"("clientId");

-- CreateIndex
CREATE INDEX "ProjectTeamMember_clientId_projectId_idx" ON "ProjectTeamMember"("clientId", "projectId");

-- CreateIndex
CREATE INDEX "ProjectTeamMember_roleId_idx" ON "ProjectTeamMember"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectTeamMember_projectId_roleId_userId_key" ON "ProjectTeamMember"("projectId", "roleId", "userId");

-- AddForeignKey
ALTER TABLE "ProjectTeamRole" ADD CONSTRAINT "ProjectTeamRole_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectTeamMember" ADD CONSTRAINT "ProjectTeamMember_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectTeamMember" ADD CONSTRAINT "ProjectTeamMember_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectTeamMember" ADD CONSTRAINT "ProjectTeamMember_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "ProjectTeamRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectTeamMember" ADD CONSTRAINT "ProjectTeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed: rôles par défaut par client (Sponsor, Responsable de projet, Référent métier)
INSERT INTO "ProjectTeamRole" ("id", "clientId", "name", "sortOrder", "systemKind", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, c.id, 'Sponsor', 0, 'SPONSOR'::"ProjectTeamRoleSystemKind", NOW(), NOW()
FROM "Client" c;

INSERT INTO "ProjectTeamRole" ("id", "clientId", "name", "sortOrder", "systemKind", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, c.id, 'Responsable de projet', 1, 'OWNER'::"ProjectTeamRoleSystemKind", NOW(), NOW()
FROM "Client" c;

INSERT INTO "ProjectTeamRole" ("id", "clientId", "name", "sortOrder", "systemKind", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, c.id, 'Référent métier', 2, NULL, NOW(), NOW()
FROM "Client" c;
