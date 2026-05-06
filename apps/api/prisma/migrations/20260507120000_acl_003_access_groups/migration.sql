-- RFC-ACL-003 — groupes d'accès client

CREATE TABLE "AccessGroup" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccessGroup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AccessGroupMember" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccessGroupMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AccessGroup_clientId_name_key" ON "AccessGroup"("clientId", "name");

CREATE INDEX "AccessGroup_clientId_idx" ON "AccessGroup"("clientId");

CREATE UNIQUE INDEX "AccessGroupMember_groupId_userId_key" ON "AccessGroupMember"("groupId", "userId");

CREATE INDEX "AccessGroupMember_clientId_userId_idx" ON "AccessGroupMember"("clientId", "userId");

ALTER TABLE "AccessGroup" ADD CONSTRAINT "AccessGroup_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AccessGroupMember" ADD CONSTRAINT "AccessGroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "AccessGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AccessGroupMember" ADD CONSTRAINT "AccessGroupMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AccessGroupMember" ADD CONSTRAINT "AccessGroupMember_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
