# RFC-ACL-002 — Licences spéciales et évaluation

## Statut

📝 Draft

## 1. Analyse de l’existant

Le socle licence V1 prévoit déjà `READ_ONLY` et `READ_WRITE`, mais les cas métier clés (consultants, support temporaire, essais) exigent des modes spécifiques non consommants en quota client.

## 2. Hypothèses éventuelles

- Les modes spéciaux sont attribuables uniquement par `PLATFORM_ADMIN`.
- Toute licence spéciale exige une traçabilité stricte (motif, dates, acteur).
- L’expiration est bloquante côté backend même si UI non rafraîchie.

## 3. Liste des fichiers à créer / modifier

- `apps/api/src/modules/licenses/license.service.ts`
- `apps/api/src/modules/licenses/dto/update-user-license.dto.ts`
- `apps/api/src/modules/licenses/tests/license-special-modes.spec.ts`
- `apps/api/src/modules/audit/*`
- `docs/API.md`

## 4. Implémentation complète

- Activer les modes :
  - `EXTERNAL_BILLABLE`
  - `NON_BILLABLE`
  - `PLATFORM_INTERNAL`
  - `EVALUATION`
- Règles :
  - `NON_BILLABLE` => `licenseAssignmentReason` obligatoire.
  - `PLATFORM_INTERNAL` => raison + `licenseEndsAt` obligatoires.
  - `EVALUATION` => raison obligatoire, `licenseEndsAt` auto à `now + 30j` si absent.
  - Tous ces modes ne consomment pas le quota client.
- Ajouter conversion contrôlée :
  - évaluation vers mode standard ;
  - support temporaire vers mode client/facturable.
- Produire des événements audit dédiés (`evaluation_granted`, `support_access_granted`, `billing_mode_changed`, etc.).

## 5. Modifications Prisma si nécessaire

- Aucun nouveau modèle obligatoire si RFC-ACL-001 déjà livrée.
- S’assurer que `ClientUser.licenseAssignmentReason` et `licenseEndsAt` sont disponibles et indexés pour les jobs d’expiration.

## 6. Tests

- `NON_BILLABLE` sans motif => `400`.
- `PLATFORM_INTERNAL` sans date fin => `400`.
- `EVALUATION` sans date fin => auto-génération `J+30`.
- `EVALUATION` expirée => écriture refusée.
- changement `CLIENT_BILLABLE -> NON_BILLABLE` libère un siège.
- `CLIENT_ADMIN` ne peut pas attribuer un mode spécial.

## 7. Récapitulatif final

Cette RFC couvre les licences hors standard opérationnel/commercial, avec règles strictes d’expiration et d’audit pour éviter toute dérive de droits.

## 8. Points de vigilance

- Ne pas mélanger rôle API et nature de licence (la licence ne remplace jamais RBAC).
- Bloquer les expirées côté guard, pas uniquement côté service d’attribution.
- Traiter les dates en UTC pour éviter les faux positifs d’expiration.
