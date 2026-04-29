-- Ajout historique (désormais retiré par migration ultérieure) : redirect OAuth sync par client.
ALTER TABLE "Client"
ADD COLUMN IF NOT EXISTS "microsoftOAuthRedirectUri" TEXT;
