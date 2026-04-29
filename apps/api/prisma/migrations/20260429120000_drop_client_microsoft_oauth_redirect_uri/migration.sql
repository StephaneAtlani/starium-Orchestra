-- Retrait redirect OAuth sync par client (une seule URI par déploiement via env MICROSOFT_M365_SYNC_REDIRECT_URI).
ALTER TABLE "Client" DROP COLUMN IF EXISTS "microsoftOAuthRedirectUri";
