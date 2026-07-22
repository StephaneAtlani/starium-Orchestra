-- CreateEnum
CREATE TYPE "EmailAddressRegistryType" AS ENUM ('PRIMARY', 'SECONDARY', 'DIRECTORY');

-- CreateEnum
CREATE TYPE "EmailAddressRegistryStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'QUARANTINED');

-- CreateEnum
CREATE TYPE "DirectoryIdentityProvenanceStatus" AS ENUM ('ACTIVE', 'LEGACY_UNATTRIBUTED', 'REVOKED');

-- CreateEnum
CREATE TYPE "UserLifecycleStatus" AS ENUM ('ACTIVE', 'MERGE_PENDING', 'MERGED_QUARANTINED', 'DELETED');

-- CreateEnum
CREATE TYPE "UserMergeOperationStatus" AS ENUM ('PLANNED', 'RUNNING', 'COMPLETED', 'FAILED', 'ROLLED_BACK');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "lifecycleStatus" "UserLifecycleStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "User" ADD COLUMN "mergedIntoUserId" TEXT;
ALTER TABLE "User" ADD COLUMN "mergedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "mergedByUserId" TEXT;
ALTER TABLE "User" ADD COLUMN "mergeOperationId" TEXT;

-- CreateTable
CREATE TABLE "EmailAddressRegistry" (
    "id" TEXT NOT NULL,
    "emailNormalized" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userEmailIdentityId" TEXT,
    "type" "EmailAddressRegistryType" NOT NULL,
    "status" "EmailAddressRegistryStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailAddressRegistry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DirectoryEmailIdentityLink" (
    "id" TEXT NOT NULL,
    "userEmailIdentityId" TEXT NOT NULL,
    "directoryConnectionId" TEXT NOT NULL,
    "externalDirectoryId" TEXT NOT NULL,
    "directorySourceType" "DirectoryProviderType" NOT NULL,
    "directoryLastSyncedAt" TIMESTAMP(3),
    "directoryManaged" BOOLEAN NOT NULL DEFAULT true,
    "provenanceStatus" "DirectoryIdentityProvenanceStatus" NOT NULL DEFAULT 'ACTIVE',
    "emailNormalized" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DirectoryEmailIdentityLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserMergeOperation" (
    "id" TEXT NOT NULL,
    "mergeOperationId" TEXT NOT NULL,
    "status" "UserMergeOperationStatus" NOT NULL DEFAULT 'PLANNED',
    "canonicalUserId" TEXT NOT NULL,
    "duplicateUserId" TEXT NOT NULL,
    "planFileHash" TEXT,
    "stepsCompleted" JSONB,
    "actorUserId" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserMergeOperation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailAddressRegistry_emailNormalized_key" ON "EmailAddressRegistry"("emailNormalized");
CREATE UNIQUE INDEX "EmailAddressRegistry_userEmailIdentityId_key" ON "EmailAddressRegistry"("userEmailIdentityId");
CREATE INDEX "EmailAddressRegistry_userId_idx" ON "EmailAddressRegistry"("userId");

CREATE UNIQUE INDEX "DirectoryEmailIdentityLink_directoryConnectionId_externalDire_key" ON "DirectoryEmailIdentityLink"("directoryConnectionId", "externalDirectoryId", "emailNormalized");
CREATE UNIQUE INDEX "DirectoryEmailIdentityLink_userEmailIdentityId_directoryConnec_key" ON "DirectoryEmailIdentityLink"("userEmailIdentityId", "directoryConnectionId");
CREATE INDEX "DirectoryEmailIdentityLink_userEmailIdentityId_idx" ON "DirectoryEmailIdentityLink"("userEmailIdentityId");

CREATE UNIQUE INDEX "UserMergeOperation_mergeOperationId_key" ON "UserMergeOperation"("mergeOperationId");
CREATE INDEX "UserMergeOperation_canonicalUserId_idx" ON "UserMergeOperation"("canonicalUserId");
CREATE INDEX "UserMergeOperation_duplicateUserId_idx" ON "UserMergeOperation"("duplicateUserId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_mergedIntoUserId_fkey" FOREIGN KEY ("mergedIntoUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EmailAddressRegistry" ADD CONSTRAINT "EmailAddressRegistry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmailAddressRegistry" ADD CONSTRAINT "EmailAddressRegistry_userEmailIdentityId_fkey" FOREIGN KEY ("userEmailIdentityId") REFERENCES "UserEmailIdentity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DirectoryEmailIdentityLink" ADD CONSTRAINT "DirectoryEmailIdentityLink_userEmailIdentityId_fkey" FOREIGN KEY ("userEmailIdentityId") REFERENCES "UserEmailIdentity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DirectoryEmailIdentityLink" ADD CONSTRAINT "DirectoryEmailIdentityLink_directoryConnectionId_fkey" FOREIGN KEY ("directoryConnectionId") REFERENCES "DirectoryConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserMergeOperation" ADD CONSTRAINT "UserMergeOperation_canonicalUserId_fkey" FOREIGN KEY ("canonicalUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserMergeOperation" ADD CONSTRAINT "UserMergeOperation_duplicateUserId_fkey" FOREIGN KEY ("duplicateUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
