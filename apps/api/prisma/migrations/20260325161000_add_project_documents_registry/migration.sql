-- CreateEnum
CREATE TYPE "ProjectDocumentStorageType" AS ENUM ('STARIUM', 'EXTERNAL', 'MICROSOFT');

-- CreateEnum
CREATE TYPE "ProjectDocumentStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'DELETED');

-- CreateEnum
CREATE TYPE "ProjectDocumentCategory" AS ENUM ('GENERAL', 'CONTRACT', 'SPECIFICATION', 'DELIVERABLE', 'REPORT', 'FINANCIAL', 'COMPLIANCE', 'OTHER');

-- CreateTable
CREATE TABLE "ProjectDocument" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "originalFilename" TEXT,
    "mimeType" TEXT,
    "extension" TEXT,
    "sizeBytes" INTEGER,
    "category" "ProjectDocumentCategory" NOT NULL DEFAULT 'GENERAL',
    "status" "ProjectDocumentStatus" NOT NULL DEFAULT 'ACTIVE',
    "storageType" "ProjectDocumentStorageType" NOT NULL DEFAULT 'STARIUM',
    "storageKey" TEXT,
    "externalUrl" TEXT,
    "description" TEXT,
    "tags" JSONB,
    "uploadedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ProjectDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectDocument_clientId_idx" ON "ProjectDocument"("clientId");

-- CreateIndex
CREATE INDEX "ProjectDocument_projectId_idx" ON "ProjectDocument"("projectId");

-- CreateIndex
CREATE INDEX "ProjectDocument_clientId_projectId_idx" ON "ProjectDocument"("clientId", "projectId");

-- CreateIndex
CREATE INDEX "ProjectDocument_clientId_status_idx" ON "ProjectDocument"("clientId", "status");

-- CreateIndex
CREATE INDEX "ProjectDocument_clientId_projectId_status_idx" ON "ProjectDocument"("clientId", "projectId", "status");

-- CreateIndex
CREATE INDEX "ProjectDocument_storageType_idx" ON "ProjectDocument"("storageType");

-- AddForeignKey
ALTER TABLE "ProjectDocument" ADD CONSTRAINT "ProjectDocument_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDocument" ADD CONSTRAINT "ProjectDocument_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDocument" ADD CONSTRAINT "ProjectDocument_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

