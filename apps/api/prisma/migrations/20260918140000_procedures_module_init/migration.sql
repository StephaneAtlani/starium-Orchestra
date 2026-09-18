-- RFC-PROC-002 — Module procédures (socle)

CREATE TYPE "ProcedureStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "ProcedureCategory" AS ENUM ('SECURITY', 'OPERATIONS', 'HR', 'IT_SERVICE', 'COMPLIANCE', 'OTHER');
CREATE TYPE "ProcedureVersionLifecycle" AS ENUM ('DRAFT', 'PUBLISHED');

CREATE TABLE "Procedure" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "ProcedureCategory" NOT NULL DEFAULT 'OTHER',
    "status" "ProcedureStatus" NOT NULL DEFAULT 'DRAFT',
    "statusBeforeArchive" "ProcedureStatus",
    "ownerUserId" TEXT,
    "currentDraftVersionId" TEXT,
    "currentPublishedVersionId" TEXT,
    "archivedAt" TIMESTAMP(3),
    "archivedByUserId" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Procedure_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProcedureVersion" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "procedureId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "lifecycle" "ProcedureVersionLifecycle" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "contentJson" JSONB NOT NULL,
    "changeSummary" TEXT,
    "publishedAt" TIMESTAMP(3),
    "publishedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcedureVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProcedureAsset" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "procedureId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageBucket" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcedureAsset_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Procedure_clientId_code_key" ON "Procedure"("clientId", "code");
CREATE INDEX "Procedure_clientId_status_idx" ON "Procedure"("clientId", "status");
CREATE INDEX "Procedure_clientId_updatedAt_idx" ON "Procedure"("clientId", "updatedAt");
CREATE INDEX "Procedure_ownerUserId_idx" ON "Procedure"("ownerUserId");

CREATE UNIQUE INDEX "ProcedureVersion_procedureId_versionNumber_key" ON "ProcedureVersion"("procedureId", "versionNumber");
CREATE INDEX "ProcedureVersion_clientId_procedureId_idx" ON "ProcedureVersion"("clientId", "procedureId");
CREATE INDEX "ProcedureVersion_clientId_lifecycle_idx" ON "ProcedureVersion"("clientId", "lifecycle");

CREATE INDEX "ProcedureAsset_clientId_procedureId_idx" ON "ProcedureAsset"("clientId", "procedureId");

ALTER TABLE "Procedure" ADD CONSTRAINT "Procedure_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProcedureVersion" ADD CONSTRAINT "ProcedureVersion_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProcedureVersion" ADD CONSTRAINT "ProcedureVersion_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "Procedure"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProcedureAsset" ADD CONSTRAINT "ProcedureAsset_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProcedureAsset" ADD CONSTRAINT "ProcedureAsset_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "Procedure"("id") ON DELETE CASCADE ON UPDATE CASCADE;
