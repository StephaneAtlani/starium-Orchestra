-- RFC-ADM-001 — Référentiels plateforme (Admin Studio)

CREATE TYPE "AdminReferenceListStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

CREATE TABLE "AdminReferenceList" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "moduleKey" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "status" "AdminReferenceListStatus" NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminReferenceList_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdminReferenceList_code_key" ON "AdminReferenceList"("code");
CREATE INDEX "AdminReferenceList_status_sortOrder_idx" ON "AdminReferenceList"("status", "sortOrder");
CREATE INDEX "AdminReferenceList_moduleKey_idx" ON "AdminReferenceList"("moduleKey");

CREATE TABLE "AdminReferenceValue" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminReferenceValue_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdminReferenceValue_listId_code_key" ON "AdminReferenceValue"("listId", "code");
CREATE INDEX "AdminReferenceValue_listId_isActive_sortOrder_idx" ON "AdminReferenceValue"("listId", "isActive", "sortOrder");
CREATE INDEX "AdminReferenceValue_listId_archivedAt_idx" ON "AdminReferenceValue"("listId", "archivedAt");

ALTER TABLE "AdminReferenceValue" ADD CONSTRAINT "AdminReferenceValue_listId_fkey" FOREIGN KEY ("listId") REFERENCES "AdminReferenceList"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
