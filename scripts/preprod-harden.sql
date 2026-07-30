-- =============================================================================
-- Starium Orchestra — Durcissement léger après restauration d'un dump PROD
-- en PRÉPROD (sans anonymisation — UAT clients).
--
-- Objectifs :
--   1. Ne jamais rejouer la file d'envois e-mail de production (adresses réelles).
--   2. Invalider les sessions refresh (JWT_SECRET préprod ≠ prod de toute façon).
--
-- Ne touche PAS aux comptes, mots de passe, MFA, e-mails ni données métier.
-- =============================================================================

\set ON_ERROR_STOP on

BEGIN;

DELETE FROM "EmailDelivery";
DELETE FROM "RefreshToken";
DELETE FROM "EmailIdentityVerificationToken";
DELETE FROM "MfaChallenge";

COMMIT;

\echo 'Durcissement préprod terminé (EmailDelivery + sessions).'
