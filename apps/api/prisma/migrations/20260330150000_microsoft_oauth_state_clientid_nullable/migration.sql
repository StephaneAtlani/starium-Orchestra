-- SSO plateforme : pas de client Starium au moment de l’état OAuth (login anonyme).
-- Corrige NOT NULL sur "clientId" si la colonne a été alignée par erreur avec le modèle Client.
ALTER TABLE "MicrosoftOAuthState" ALTER COLUMN "clientId" DROP NOT NULL;
