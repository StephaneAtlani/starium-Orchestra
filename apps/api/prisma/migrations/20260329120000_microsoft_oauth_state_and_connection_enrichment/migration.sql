-- AlterTable
ALTER TABLE "MicrosoftConnection"
ADD COLUMN "microsoftUserId" TEXT,
ADD COLUMN "microsoftUserEmail" TEXT,
ADD COLUMN "microsoftUserDisplayName" TEXT,
ADD COLUMN "grantedScopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "connectedAt" TIMESTAMP(3),
ADD COLUMN "revokedAt" TIMESTAMP(3),
ADD COLUMN "lastTokenRefreshAt" TIMESTAMP(3),
ADD COLUMN "lastErrorCode" TEXT,
ADD COLUMN "lastErrorMessage" TEXT;

-- CreateTable
CREATE TABLE "MicrosoftOAuthState" (
    "id" TEXT NOT NULL,
    "stateTokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "redirectUri" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MicrosoftOAuthState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MicrosoftOAuthState_stateTokenHash_key" ON "MicrosoftOAuthState"("stateTokenHash");

-- CreateIndex
CREATE INDEX "MicrosoftOAuthState_clientId_userId_idx" ON "MicrosoftOAuthState"("clientId", "userId");

-- CreateIndex
CREATE INDEX "MicrosoftOAuthState_expiresAt_idx" ON "MicrosoftOAuthState"("expiresAt");

-- CreateIndex
CREATE INDEX "MicrosoftConnection_clientId_status_idx" ON "MicrosoftConnection"("clientId", "status");

-- AddForeignKey
ALTER TABLE "MicrosoftOAuthState" ADD CONSTRAINT "MicrosoftOAuthState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MicrosoftOAuthState" ADD CONSTRAINT "MicrosoftOAuthState_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
