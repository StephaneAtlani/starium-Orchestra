-- RFC-TEAM-006 — taxonomie des activités

CREATE TYPE "ActivityTaxonomyKind" AS ENUM ('PROJECT', 'RUN', 'SUPPORT', 'TRANSVERSE', 'OTHER');

CREATE TABLE "ActivityType" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "kind" "ActivityTaxonomyKind" NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isDefaultForKind" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActivityType_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ActivityType_clientId_code_key" ON "ActivityType"("clientId", "code");

CREATE INDEX "ActivityType_clientId_idx" ON "ActivityType"("clientId");

CREATE INDEX "ActivityType_clientId_kind_idx" ON "ActivityType"("clientId", "kind");

CREATE INDEX "ActivityType_clientId_archivedAt_idx" ON "ActivityType"("clientId", "archivedAt");

ALTER TABLE "ActivityType" ADD CONSTRAINT "ActivityType_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
