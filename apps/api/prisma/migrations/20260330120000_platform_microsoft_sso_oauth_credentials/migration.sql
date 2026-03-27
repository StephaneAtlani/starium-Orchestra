-- AlterTable
ALTER TABLE "PlatformMicrosoftSettings" ADD COLUMN IF NOT EXISTS "ssoOAuthClientId" TEXT;
ALTER TABLE "PlatformMicrosoftSettings" ADD COLUMN IF NOT EXISTS "ssoOAuthClientSecretEncrypted" TEXT;
ALTER TABLE "PlatformMicrosoftSettings" ADD COLUMN IF NOT EXISTS "ssoOAuthAuthorityTenant" TEXT;
