-- CreateTable
CREATE TABLE "MicrosoftOAuthState" (
    "id" TEXT NOT NULL,
    "stateTokenHash" TEXT NOT NULL,
    "userId" TEXT,
    "clientId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MicrosoftOAuthState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MicrosoftOAuthState_stateTokenHash_key" ON "MicrosoftOAuthState"("stateTokenHash");

-- CreateIndex
CREATE INDEX "MicrosoftOAuthState_expiresAt_idx" ON "MicrosoftOAuthState"("expiresAt");

-- CreateIndex
CREATE INDEX "MicrosoftOAuthState_consumedAt_idx" ON "MicrosoftOAuthState"("consumedAt");
