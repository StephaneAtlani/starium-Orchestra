-- RFC-ACL-017 — politique d'accès par ressource
CREATE TYPE "ResourceAccessPolicyMode" AS ENUM ('DEFAULT', 'RESTRICTIVE', 'SHARING');

CREATE TABLE "ResourceAccessPolicy" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "mode" "ResourceAccessPolicyMode" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResourceAccessPolicy_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ResourceAccessPolicy_clientId_resourceType_resourceId_key" ON "ResourceAccessPolicy"("clientId", "resourceType", "resourceId");

CREATE INDEX "ResourceAccessPolicy_clientId_resourceType_resourceId_idx" ON "ResourceAccessPolicy"("clientId", "resourceType", "resourceId");

ALTER TABLE "ResourceAccessPolicy" ADD CONSTRAINT "ResourceAccessPolicy_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
