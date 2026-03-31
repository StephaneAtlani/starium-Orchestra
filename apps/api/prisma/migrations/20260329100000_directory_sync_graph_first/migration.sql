-- CreateEnum
CREATE TYPE "DirectoryProviderType" AS ENUM ('MICROSOFT_GRAPH', 'LDAP');

-- CreateEnum
CREATE TYPE "DirectorySyncJobStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "DirectorySyncMode" AS ENUM ('FULL', 'GROUP_FILTERED');

-- CreateEnum
CREATE TYPE "CollaboratorStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DISABLED_SYNC');

-- CreateEnum
CREATE TYPE "CollaboratorSource" AS ENUM ('MANUAL', 'DIRECTORY_SYNC');

-- CreateEnum
CREATE TYPE "ExternalDirectoryType" AS ENUM ('MICROSOFT_GRAPH', 'LDAP');

-- CreateTable
CREATE TABLE "DirectoryConnection" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "providerType" "DirectoryProviderType" NOT NULL DEFAULT 'MICROSOFT_GRAPH',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSyncEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lockSyncedCollaborators" BOOLEAN NOT NULL DEFAULT true,
    "usersScope" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DirectoryConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DirectoryGroupScope" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "groupName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DirectoryGroupScope_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DirectorySyncJob" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "status" "DirectorySyncJobStatus" NOT NULL,
    "mode" "DirectorySyncMode" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "totalFound" INTEGER NOT NULL DEFAULT 0,
    "createdCount" INTEGER NOT NULL DEFAULT 0,
    "updatedCount" INTEGER NOT NULL DEFAULT 0,
    "deactivatedCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "summary" JSONB,
    "triggeredByUserId" TEXT,

    CONSTRAINT "DirectorySyncJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Collaborator" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "displayName" TEXT NOT NULL,
    "email" TEXT,
    "username" TEXT,
    "jobTitle" TEXT,
    "department" TEXT,
    "phone" TEXT,
    "mobile" TEXT,
    "employeeNumber" TEXT,
    "managerId" TEXT,
    "status" "CollaboratorStatus" NOT NULL DEFAULT 'ACTIVE',
    "source" "CollaboratorSource" NOT NULL DEFAULT 'MANUAL',
    "externalDirectoryId" TEXT,
    "externalDirectoryType" "ExternalDirectoryType",
    "externalUsername" TEXT,
    "externalRef" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "syncHash" TEXT,
    "skills" JSONB,
    "internalNotes" TEXT,
    "internalTags" JSONB,
    "assignments" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Collaborator_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DirectoryConnection_clientId_idx" ON "DirectoryConnection"("clientId");

-- CreateIndex
CREATE INDEX "DirectoryConnection_clientId_isActive_idx" ON "DirectoryConnection"("clientId", "isActive");

-- CreateIndex
CREATE INDEX "DirectoryGroupScope_clientId_connectionId_idx" ON "DirectoryGroupScope"("clientId", "connectionId");

-- CreateIndex
CREATE UNIQUE INDEX "DirectoryGroupScope_connectionId_groupId_key" ON "DirectoryGroupScope"("connectionId", "groupId");

-- CreateIndex
CREATE INDEX "DirectorySyncJob_clientId_connectionId_idx" ON "DirectorySyncJob"("clientId", "connectionId");

-- CreateIndex
CREATE INDEX "DirectorySyncJob_startedAt_idx" ON "DirectorySyncJob"("startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Collaborator_clientId_externalDirectoryId_key" ON "Collaborator"("clientId", "externalDirectoryId");

-- CreateIndex
CREATE INDEX "Collaborator_clientId_email_idx" ON "Collaborator"("clientId", "email");

-- CreateIndex
CREATE INDEX "Collaborator_clientId_username_idx" ON "Collaborator"("clientId", "username");

-- CreateIndex
CREATE INDEX "Collaborator_clientId_source_idx" ON "Collaborator"("clientId", "source");

-- CreateIndex
CREATE INDEX "Collaborator_clientId_externalDirectoryType_idx" ON "Collaborator"("clientId", "externalDirectoryType");

-- AddForeignKey
ALTER TABLE "DirectoryConnection" ADD CONSTRAINT "DirectoryConnection_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectoryGroupScope" ADD CONSTRAINT "DirectoryGroupScope_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectoryGroupScope" ADD CONSTRAINT "DirectoryGroupScope_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "DirectoryConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectorySyncJob" ADD CONSTRAINT "DirectorySyncJob_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectorySyncJob" ADD CONSTRAINT "DirectorySyncJob_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "DirectoryConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collaborator" ADD CONSTRAINT "Collaborator_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collaborator" ADD CONSTRAINT "Collaborator_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "Collaborator"("id") ON DELETE SET NULL ON UPDATE CASCADE;
