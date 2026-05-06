# RFC-ACL-001 — Abonnements et licences client

## Statut

✅ Implémentée (backend MVP)

## 1. Analyse de l’existant

Le RBAC API existe déjà (guards, permissions, scoping client actif), mais il ne gère pas encore la couche commerciale d’abonnement et de consommation de sièges.

Le plan `docs/RFC/_plan_developpement_licences_abonnements_acl_starium.md` définit un modèle où la licence est portée par `ClientUser` et où la consommation de quota dépend uniquement du couple `READ_WRITE + CLIENT_BILLABLE`.

## 2. Hypothèses éventuelles

- Le compte utilisateur reste global et unique (`User`) avec rattachements multi-client via `ClientUser`.
- Le `clientId` métier est toujours dérivé du contexte auth/guard côté routes client.
- Les routes plateforme gardent le `clientId` dans l’URL car protégées par `PlatformAdminGuard`.

## 3. Liste des fichiers à créer / modifier

Backend (minimum) :

- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/*_acl_001_subscriptions_licenses/migration.sql`
- `apps/api/src/modules/licenses/license.service.ts`
- `apps/api/src/modules/licenses/subscription.service.ts`
- `apps/api/src/modules/licenses/licenses.controller.ts`
- `apps/api/src/modules/licenses/dto/*`
- `apps/api/src/modules/licenses/tests/*`

Documentation :

- `docs/API.md`

## 4. Implémentation complète

- Créer `ClientSubscription` (client-scopé) avec statut, bornes temporelles, quota `readWriteSeatsLimit`, période de grâce.
- Étendre `ClientUser` avec `licenseType`, `licenseBillingMode`, `subscriptionId`, `licenseStartsAt`, `licenseEndsAt`, `licenseAssignmentReason`.
- Implémenter `LicenseService` :
  - calcul d’usage global client et par abonnement ;
  - attribution licence avec validation de quota ;
  - garde-fou écriture (`READ_ONLY` bloque toute mutation).
- Implémenter `SubscriptionService` :
  - CRUD abonnement ;
  - transitions d’état (`activate`, `suspend`, `cancel`) ;
  - règle de grâce.
- Exposer endpoints plateforme :
  - `GET|POST /api/platform/clients/:clientId/subscriptions`
  - `PATCH /api/platform/clients/:clientId/subscriptions/:subscriptionId`
  - `POST /activate|suspend|cancel`
  - `GET /api/platform/clients/:clientId/license-usage`
  - `PATCH /api/platform/clients/:clientId/users/:userId/license`
- Exposer endpoints client :
  - `GET /api/client-license-usage`
  - `PATCH /api/users/:userId/license` (limité aux modes client-admin autorisés).

## 5. Modifications Prisma si nécessaire

- Ajouter enums :
  - `ClientUserLicenseType` (`READ_ONLY`, `READ_WRITE`)
  - `ClientUserLicenseBillingMode` (`CLIENT_BILLABLE`, `EXTERNAL_BILLABLE`, `NON_BILLABLE`, `PLATFORM_INTERNAL`, `EVALUATION`)
  - `ClientSubscriptionStatus`, `SubscriptionBillingPeriod`
- Ajouter modèle `ClientSubscription`.
- Étendre `ClientUser` avec les champs licence + index :
  - `@@index([clientId, subscriptionId])`
  - `@@index([clientId, licenseType, licenseBillingMode])`

## 6. Tests

Backend :

- `READ_ONLY` ne peut jamais écrire.
- `READ_ONLY` illimité.
- `READ_WRITE + CLIENT_BILLABLE` consomme un siège.
- dépassement quota refusé.
- cross-client interdit sur lecture et écriture.
- `CLIENT_ADMIN` ne peut attribuer que `READ_ONLY` et `READ_WRITE + CLIENT_BILLABLE`.

## 7. Récapitulatif final

Cette RFC pose le socle licence/abonnement sans casser le RBAC existant : quota facturable piloté par abonnement, licence portée par `ClientUser`, et contrôle d’accès renforcé côté backend.

### État d’implémentation (backend)

- Prisma:
  - enums `ClientUserLicenseType`, `ClientUserLicenseBillingMode`, `ClientSubscriptionStatus`, `SubscriptionBillingPeriod`
  - modèle `ClientSubscription`
  - extension `ClientUser` avec champs licence + index RFC
- Migration:
  - création schéma ACL-001
  - backfill role-based (`CLIENT_ADMIN` et `EDITOR` => `READ_WRITE + CLIENT_BILLABLE`, sinon `READ_ONLY + NON_BILLABLE`)
  - contrainte SQL `CHECK` sur cohérence `subscriptionId`
- API:
  - endpoints plateforme/client prévus dans la RFC livrés côté backend
  - validations quota + statut abonnement (actif / grâce)
- Enforcement écriture:
  - `@RequireWriteLicense()` + `LicenseWriteGuard` introduits
  - application ciblée sur routes mutantes représentatives (déploiement global hors scope ACL-001)

### Hors scope actuel

- Déploiement massif de `@RequireWriteLicense()` sur tous les modules métier (prévu RFC dédiée).
- Cockpit frontend d’administration ACL complet (RFC-ACL-007+).

## 8. Points de vigilance

- Ne jamais accepter un `clientId` de payload pour les routes client-scopées.
- Vérifier la libération/consommation de siège lors de changement de mode de licence.
- Journaliser chaque changement de licence et d’abonnement.
