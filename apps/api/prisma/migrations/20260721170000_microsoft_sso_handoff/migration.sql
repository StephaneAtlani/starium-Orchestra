-- Handoff SSO Microsoft : code opaque one-shot (évite jetons dans #fragment / page HTML interstitial).
CREATE TABLE IF NOT EXISTS "MicrosoftSsoHandoff" (
    "id" TEXT NOT NULL,
    "handoffHash" TEXT NOT NULL,
    "payloadEnc" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MicrosoftSsoHandoff_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MicrosoftSsoHandoff_handoffHash_key" ON "MicrosoftSsoHandoff"("handoffHash");
CREATE INDEX IF NOT EXISTS "MicrosoftSsoHandoff_expiresAt_idx" ON "MicrosoftSsoHandoff"("expiresAt");
CREATE INDEX IF NOT EXISTS "MicrosoftSsoHandoff_consumedAt_idx" ON "MicrosoftSsoHandoff"("consumedAt");
