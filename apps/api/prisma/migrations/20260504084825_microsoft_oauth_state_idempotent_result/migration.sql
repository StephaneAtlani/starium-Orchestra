-- Idempotence des callbacks OAuth M365 : on mémorise la redirectUrl finale
-- pour renvoyer le même résultat sur retry (proxy/CDN, double clic, prefetch).
ALTER TABLE "MicrosoftOAuthState"
  ADD COLUMN IF NOT EXISTS "redirectResultUrl" TEXT;
