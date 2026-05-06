-- RFC-ACL-005 — ACL ressources génériques

CREATE TYPE "ResourceAclSubjectType" AS ENUM ('USER', 'GROUP');
CREATE TYPE "ResourceAclPermission" AS ENUM ('READ', 'WRITE', 'ADMIN');

CREATE TABLE "ResourceAcl" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "subjectType" "ResourceAclSubjectType" NOT NULL,
    "subjectId" TEXT NOT NULL,
    "permission" "ResourceAclPermission" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResourceAcl_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ResourceAcl_clientId_resourceType_resourceId_subjectType_subjectId_key" ON "ResourceAcl"("clientId", "resourceType", "resourceId", "subjectType", "subjectId");

CREATE INDEX "ResourceAcl_clientId_resourceType_resourceId_idx" ON "ResourceAcl"("clientId", "resourceType", "resourceId");

ALTER TABLE "ResourceAcl" ADD CONSTRAINT "ResourceAcl_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
