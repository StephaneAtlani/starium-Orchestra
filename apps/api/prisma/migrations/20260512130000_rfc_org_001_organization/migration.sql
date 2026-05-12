-- RFC-ORG-001 — socle organisation client (unités, groupes, rattachements Resource HUMAN)

CREATE TYPE "OrgUnitType" AS ENUM ('COMPANY', 'DIRECTION', 'DEPARTMENT', 'SERVICE', 'SITE', 'TEAM', 'COMMITTEE', 'OTHER');
CREATE TYPE "OrgUnitStatus" AS ENUM ('ACTIVE', 'ARCHIVED');
CREATE TYPE "OrgUnitMemberType" AS ENUM ('MANAGER', 'MEMBER', 'OBSERVER');
CREATE TYPE "OrgGroupType" AS ENUM ('BUSINESS', 'COMMITTEE', 'FUNCTIONAL', 'SECURITY', 'TRANSVERSE', 'OTHER');
CREATE TYPE "OrgGroupStatus" AS ENUM ('ACTIVE', 'ARCHIVED');
CREATE TYPE "OrgGroupMemberType" AS ENUM ('OWNER', 'MEMBER', 'OBSERVER');

CREATE TABLE "OrgUnit" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "parentId" TEXT,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "OrgUnitType" NOT NULL,
    "status" "OrgUnitStatus" NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),
    CONSTRAINT "OrgUnit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrgUnitMembership" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "orgUnitId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "roleTitle" TEXT,
    "memberType" "OrgUnitMemberType" NOT NULL DEFAULT 'MEMBER',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OrgUnitMembership_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrgGroup" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "OrgGroupType" NOT NULL,
    "status" "OrgGroupStatus" NOT NULL DEFAULT 'ACTIVE',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),
    CONSTRAINT "OrgGroup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrgGroupMembership" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "memberType" "OrgGroupMemberType" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OrgGroupMembership_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OrgUnit_clientId_idx" ON "OrgUnit"("clientId");
CREATE INDEX "OrgUnit_clientId_parentId_idx" ON "OrgUnit"("clientId", "parentId");
CREATE INDEX "OrgUnit_clientId_status_idx" ON "OrgUnit"("clientId", "status");
CREATE UNIQUE INDEX "OrgUnit_clientId_code_key" ON "OrgUnit"("clientId", "code");

CREATE INDEX "OrgUnitMembership_clientId_idx" ON "OrgUnitMembership"("clientId");
CREATE INDEX "OrgUnitMembership_clientId_orgUnitId_idx" ON "OrgUnitMembership"("clientId", "orgUnitId");
CREATE INDEX "OrgUnitMembership_clientId_resourceId_idx" ON "OrgUnitMembership"("clientId", "resourceId");
CREATE UNIQUE INDEX "OrgUnitMembership_orgUnitId_resourceId_key" ON "OrgUnitMembership"("orgUnitId", "resourceId");

CREATE INDEX "OrgGroup_clientId_idx" ON "OrgGroup"("clientId");
CREATE INDEX "OrgGroup_clientId_status_idx" ON "OrgGroup"("clientId", "status");
CREATE UNIQUE INDEX "OrgGroup_clientId_code_key" ON "OrgGroup"("clientId", "code");

CREATE INDEX "OrgGroupMembership_clientId_idx" ON "OrgGroupMembership"("clientId");
CREATE INDEX "OrgGroupMembership_clientId_groupId_idx" ON "OrgGroupMembership"("clientId", "groupId");
CREATE INDEX "OrgGroupMembership_clientId_resourceId_idx" ON "OrgGroupMembership"("clientId", "resourceId");
CREATE UNIQUE INDEX "OrgGroupMembership_groupId_resourceId_key" ON "OrgGroupMembership"("groupId", "resourceId");

ALTER TABLE "OrgUnit" ADD CONSTRAINT "OrgUnit_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrgUnit" ADD CONSTRAINT "OrgUnit_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "OrgUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OrgUnitMembership" ADD CONSTRAINT "OrgUnitMembership_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrgUnitMembership" ADD CONSTRAINT "OrgUnitMembership_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "OrgUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrgUnitMembership" ADD CONSTRAINT "OrgUnitMembership_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrgGroup" ADD CONSTRAINT "OrgGroup_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrgGroupMembership" ADD CONSTRAINT "OrgGroupMembership_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrgGroupMembership" ADD CONSTRAINT "OrgGroupMembership_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "OrgGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrgGroupMembership" ADD CONSTRAINT "OrgGroupMembership_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
