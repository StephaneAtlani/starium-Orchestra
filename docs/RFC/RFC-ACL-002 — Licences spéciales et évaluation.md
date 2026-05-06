# RFC-ACL-002 — Licences spéciales et évaluation

## Statut

✅ Implémentée (backend ACL-002)

## 1. Analyse de l’existant

Le socle licence V1 prévoit déjà `READ_ONLY` et `READ_WRITE`, mais les cas métier clés (consultants, support temporaire, essais) exigent des modes spécifiques non consommants en quota client.

## 2. Hypothèses éventuelles

- Les modes spéciaux sont attribuables uniquement par `PLATFORM_ADMIN`.
- Toute licence spéciale exige une traçabilité stricte (motif, dates, acteur).
- L’expiration est bloquante côté backend même si UI non rafraîchie.

## 3. Liste des fichiers à créer / modifier

- `apps/api/src/modules/licenses/license.service.ts`
- `apps/api/src/modules/licenses/licenses.controller.ts`
- `apps/api/src/modules/licenses/licenses.module.ts`
- `apps/api/src/common/guards/license-write.guard.ts`
- `apps/api/src/modules/licenses/license.service.spec.ts`
- `apps/api/src/common/guards/license-write.guard.spec.ts`
- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/20260506235900_acl_002_license_expiration_index/migration.sql`

## 4. Implémentation complète

- Matrice de couples autorisés backend appliquée dans `LicenseService` :
  - `READ_ONLY + NON_BILLABLE`
  - `READ_WRITE + CLIENT_BILLABLE`
  - `READ_WRITE + NON_BILLABLE`
  - `READ_WRITE + PLATFORM_INTERNAL`
  - `READ_WRITE + EVALUATION`
  - `READ_WRITE + EXTERNAL_BILLABLE`
- Tout couple hors matrice est rejeté (`BadRequestException`), dont explicitement :
  - `READ_ONLY + CLIENT_BILLABLE`
  - `READ_ONLY + EVALUATION`
  - `READ_ONLY + PLATFORM_INTERNAL`
  - `READ_ONLY + EXTERNAL_BILLABLE`
- Règles métier livrées :
  - `READ_ONLY + NON_BILLABLE` : motif optionnel.
  - `READ_WRITE + NON_BILLABLE` : motif obligatoire, réservé `PLATFORM_ADMIN`.
  - `READ_WRITE + PLATFORM_INTERNAL` : motif + `licenseEndsAt` obligatoires, réservé `PLATFORM_ADMIN`.
  - `READ_WRITE + EVALUATION` : motif obligatoire, `licenseEndsAt` auto `now + 30 jours` si absent, réservé `PLATFORM_ADMIN`.
  - `READ_WRITE + EXTERNAL_BILLABLE` : motif obligatoire, `subscriptionId` interdit, `licenseEndsAt` optionnel V1, réservé `PLATFORM_ADMIN`.
- Règle stricte `subscriptionId` livrée :
  - obligatoire uniquement pour `READ_WRITE + CLIENT_BILLABLE`;
  - interdit (`null`) pour les autres modes;
  - conversion vers mode spécial remet `subscriptionId` à `null`.
- Expiration livrée :
  - `LicenseWriteGuard` bloque l’écriture si `licenseEndsAt < now`;
  - la licence n’est pas mutée automatiquement;
  - pas de rétrogradation automatique.
- Audit métier ajouté sur les transitions ACL-002 :
  - `evaluation_granted`
  - `support_access_granted`
  - `billing_mode_changed`

## 5. Modifications Prisma si nécessaire

- Aucun nouveau modèle requis (aligné RFC-ACL-001).
- Index expiration ajouté sur `ClientUser(clientId, licenseEndsAt)` via migration ACL-002 dédiée.
- Compatibilité backfill ACL-001 conservée : les `ClientUser` en `READ_ONLY + NON_BILLABLE` restent valides sans motif.

## 6. Tests

- `READ_ONLY + NON_BILLABLE` sans motif => autorisé.
- `READ_WRITE + NON_BILLABLE` sans motif => `400`.
- `PLATFORM_INTERNAL` sans date fin => `400`.
- `EVALUATION` sans date fin => auto-génération `J+30`.
- `EXTERNAL_BILLABLE` sans motif => `400`.
- `EXTERNAL_BILLABLE` avec `subscriptionId` non null => `400`.
- `READ_ONLY + EVALUATION` / `READ_ONLY + PLATFORM_INTERNAL` / `READ_ONLY + EXTERNAL_BILLABLE` / `READ_ONLY + CLIENT_BILLABLE` => `400`.
- conversion `CLIENT_BILLABLE -> mode spécial` => `subscriptionId` remis à `null`.
- écriture bloquée si licence expirée (`EVALUATION`, `PLATFORM_INTERNAL`, `EXTERNAL_BILLABLE` avec date expirée).
- `CLIENT_ADMIN` ne peut attribuer que `READ_ONLY + NON_BILLABLE` et `READ_WRITE + CLIENT_BILLABLE`.
- backfill ACL-001 (`READ_ONLY + NON_BILLABLE` sans motif) reste valide.

## 7. Récapitulatif final

RFC-ACL-002 est implémentée côté backend : matrice de licences spéciales stricte, enforcement des règles de motif/date/abonnement, blocage write sur expiration, compatibilité backfill ACL-001 et tests de non-régression.

## 8. Points de vigilance

- Ne pas mélanger rôle API et nature de licence (la licence ne remplace jamais RBAC).
- Le déploiement global de `LicenseWriteGuard` sur tous endpoints write reste à faire progressivement (hors périmètre RFC-ACL-002 backend livrée ici).
- L’expiration automatique par job est traitée dans RFC-ACL-009 (hors scope ACL-002).
