-- Colonne présente sur certaines bases (dérive / ancien schéma) avec NOT NULL alors que le SSO
-- n’envoie pas de valeur. Rendre nullable et aligner avec Prisma.
ALTER TABLE "MicrosoftOAuthState" ADD COLUMN IF NOT EXISTS "redirectUri" TEXT;
ALTER TABLE "MicrosoftOAuthState" ALTER COLUMN "redirectUri" DROP NOT NULL;
