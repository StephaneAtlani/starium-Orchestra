-- =============================================================================
-- Starium Orchestra — Anonymisation des DCP après restauration d'un dump PROD
-- en PRÉPROD (OPT-IN via --anonymize — incompatible avec l'UAT clients).
--
-- Usage : appelé par scripts/preprod-db-refresh.sh --anonymize uniquement.
-- Ne pas exécuter à la main sur une base de production. Variables psql :
--   :keep_emails    liste d'e-mails (séparés par des virgules) NON anonymisés.
--   :password_hash  hash bcrypt appliqué aux comptes anonymisés, ou
--                   '!login-disabled-preprod' pour rendre le login impossible.
--
-- Principe : les id techniques sont conservés — seules les DCP sont remplacées
-- par des valeurs dérivées stables (md5(id)).
-- =============================================================================

\set ON_ERROR_STOP on

BEGIN;

-- ---------------------------------------------------------------------------
-- 0. Périmètre : tous les comptes sauf la liste explicitement conservée
-- ---------------------------------------------------------------------------
CREATE TEMP TABLE preprod_anon_users AS
SELECT id
FROM "User"
WHERE lower(email) <> ALL (
  regexp_split_to_array(lower(:'keep_emails'), '\s*,\s*')
);

-- ---------------------------------------------------------------------------
-- 1. Comptes plateforme
-- ---------------------------------------------------------------------------
UPDATE "User" u
SET email          = 'user.' || left(md5(u.id), 12) || '@preprod.invalid',
    "firstName"    = 'Utilisateur',
    "lastName"     = 'Préprod ' || left(md5(u.id), 6),
    "passwordHash" = :'password_hash',
    department     = NULL,
    "jobTitle"     = NULL,
    company        = NULL,
    office         = NULL,
    "avatarMimeType" = NULL
WHERE u.id IN (SELECT id FROM preprod_anon_users);

-- ---------------------------------------------------------------------------
-- 2. Identités e-mail + registre global + liens annuaire (cohérence conservée)
-- ---------------------------------------------------------------------------
UPDATE "UserEmailIdentity" uei
SET email             = 'user.' || left(md5(uei.id), 12) || '@preprod.invalid',
    "emailNormalized" = 'user.' || left(md5(uei.id), 12) || '@preprod.invalid',
    "displayName"     = NULL,
    "replyToEmail"    = NULL
WHERE uei."userId" IN (SELECT id FROM preprod_anon_users);

-- L'e-mail de connexion suit l'identité PRIMARY quand elle existe.
UPDATE "User" u
SET email = uei.email
FROM "EmailAddressRegistry" r
JOIN "UserEmailIdentity" uei ON uei.id = r."userEmailIdentityId"
WHERE r."userId" = u.id
  AND r.type = 'PRIMARY'
  AND u.id IN (SELECT id FROM preprod_anon_users);

UPDATE "EmailAddressRegistry" r
SET "emailNormalized" = uei."emailNormalized"
FROM "UserEmailIdentity" uei
WHERE uei.id = r."userEmailIdentityId"
  AND r."userId" IN (SELECT id FROM preprod_anon_users);

UPDATE "EmailAddressRegistry" r
SET "emailNormalized" = 'user.' || left(md5(r.id), 12) || '@preprod.invalid'
WHERE r."userEmailIdentityId" IS NULL
  AND r."userId" IN (SELECT id FROM preprod_anon_users);

UPDATE "DirectoryEmailIdentityLink" l
SET "emailNormalized" = uei."emailNormalized"
FROM "UserEmailIdentity" uei
WHERE uei.id = l."userEmailIdentityId"
  AND uei."userId" IN (SELECT id FROM preprod_anon_users);

-- ---------------------------------------------------------------------------
-- 3. Secrets et sessions : inutilisables hors prod (clés de chiffrement et
--    JWT_SECRET différents) → purge systématique.
-- ---------------------------------------------------------------------------
DELETE FROM "UserMfa";
DELETE FROM "MfaChallenge";
DELETE FROM "TrustedDevice";
DELETE FROM "RefreshToken";
DELETE FROM "EmailIdentityVerificationToken";

-- Jetons OAuth Microsoft chiffrés avec la clé de prod → non déchiffrables.
UPDATE "MicrosoftConnection"
SET "accessTokenEncrypted"  = NULL,
    "refreshTokenEncrypted" = NULL,
    "tokenExpiresAt"        = NULL;

-- ---------------------------------------------------------------------------
-- 4. File e-mails : aucun envoi résiduel vers de vraies adresses.
-- ---------------------------------------------------------------------------
DELETE FROM "EmailDelivery";

-- ---------------------------------------------------------------------------
-- 5. Référentiels métier porteurs de DCP
-- ---------------------------------------------------------------------------
UPDATE "Collaborator"
SET "firstName"    = 'Collaborateur',
    "lastName"     = left(md5(id), 6),
    "displayName"  = 'Collaborateur ' || left(md5(id), 6),
    email          = 'collab.' || left(md5(id), 12) || '@preprod.invalid',
    username       = NULL,
    phone          = NULL,
    "externalUsername" = NULL;

UPDATE "Resource"
SET name           = 'Ressource ' || left(md5(id), 6),
    "firstName"    = 'Ressource',
    email          = 'resource.' || left(md5(id), 12) || '@preprod.invalid',
    phone          = NULL;

UPDATE "Supplier"
SET email = CASE WHEN email IS NULL THEN NULL
                 ELSE 'supplier.' || left(md5(id), 12) || '@preprod.invalid' END,
    phone = NULL;

UPDATE "SupplierContact"
SET "firstName"       = 'Contact',
    "lastName"        = left(md5(id), 6),
    "fullName"        = 'Contact ' || left(md5(id), 6),
    "normalizedName"  = 'contact ' || left(md5(id), 6),
    email             = 'contact.' || left(md5(id), 12) || '@preprod.invalid',
    "emailNormalized" = 'contact.' || left(md5(id), 12) || '@preprod.invalid',
    phone             = NULL;

-- ---------------------------------------------------------------------------
-- 6. Journaux : suppression des traces techniques nominatives (IP, UA, e-mail)
-- ---------------------------------------------------------------------------
-- Filtres `IS NOT NULL` volontaires : sur un volume de production ces tables
-- comptent des centaines de milliers de lignes — éviter la réécriture inutile.
UPDATE "AuditLog"         SET "ipAddress" = NULL, "userAgent" = NULL
  WHERE "ipAddress" IS NOT NULL OR "userAgent" IS NOT NULL;
UPDATE "AuditLogArchive"  SET "ipAddress" = NULL, "userAgent" = NULL
  WHERE "ipAddress" IS NOT NULL OR "userAgent" IS NOT NULL;
UPDATE "PlatformAuditLog" SET "ipAddress" = NULL, "userAgent" = NULL
  WHERE "ipAddress" IS NOT NULL OR "userAgent" IS NOT NULL;
UPDATE "SecurityLog"      SET "ipAddress" = NULL, "userAgent" = NULL, email = NULL
  WHERE "ipAddress" IS NOT NULL OR "userAgent" IS NOT NULL OR email IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 7. Contrôle : aucune adresse hors domaine neutre parmi les comptes anonymisés
-- ---------------------------------------------------------------------------
DO $$
DECLARE leaked integer;
BEGIN
  SELECT count(*) INTO leaked
  FROM "User" u
  JOIN preprod_anon_users a ON a.id = u.id
  WHERE u.email NOT LIKE '%@preprod.invalid';

  IF leaked > 0 THEN
    RAISE EXCEPTION 'Anonymisation incomplète : % compte(s) avec un e-mail réel', leaked;
  END IF;
END $$;

COMMIT;

\echo 'Anonymisation préprod terminée.'
