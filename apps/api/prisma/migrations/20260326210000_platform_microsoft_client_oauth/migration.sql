-- AlterTable: identifiants app Azure par client Starium (BYO)
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "microsoftOAuthClientId" TEXT;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "microsoftOAuthClientSecretEncrypted" TEXT;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "microsoftOAuthAuthorityTenant" TEXT;

-- CreateTable: paramètres OAuth Microsoft plateforme (singleton id = default)
CREATE TABLE IF NOT EXISTS "PlatformMicrosoftSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "redirectUri" TEXT,
    "graphScopes" TEXT,
    "oauthSuccessUrl" TEXT,
    "oauthErrorUrl" TEXT,
    "oauthStateTtlSeconds" INTEGER,
    "refreshLeewaySeconds" INTEGER,
    "tokenHttpTimeoutMs" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformMicrosoftSettings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "PlatformMicrosoftSettings" ("id", "updatedAt")
VALUES ('default', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
