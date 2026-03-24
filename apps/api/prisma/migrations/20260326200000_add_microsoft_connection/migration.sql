-- CreateEnum
CREATE TYPE "MicrosoftConnectionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED', 'ERROR');

-- CreateEnum
CREATE TYPE "MicrosoftAuthMode" AS ENUM ('DELEGATED');

-- CreateTable
CREATE TABLE "MicrosoftConnection" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tenantName" TEXT,
    "status" "MicrosoftConnectionStatus" NOT NULL DEFAULT 'ACTIVE',
    "authMode" "MicrosoftAuthMode" NOT NULL DEFAULT 'DELEGATED',
    "accessTokenEncrypted" TEXT,
    "refreshTokenEncrypted" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "connectedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MicrosoftConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MicrosoftConnection_clientId_idx" ON "MicrosoftConnection"("clientId");

-- CreateIndex
CREATE INDEX "MicrosoftConnection_status_idx" ON "MicrosoftConnection"("status");

-- CreateIndex
CREATE UNIQUE INDEX "MicrosoftConnection_clientId_tenantId_key" ON "MicrosoftConnection"("clientId", "tenantId");

-- AddForeignKey
ALTER TABLE "MicrosoftConnection" ADD CONSTRAINT "MicrosoftConnection_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MicrosoftConnection" ADD CONSTRAINT "MicrosoftConnection_connectedByUserId_fkey" FOREIGN KEY ("connectedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
