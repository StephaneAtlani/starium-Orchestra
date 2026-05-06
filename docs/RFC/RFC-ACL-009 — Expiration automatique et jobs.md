# RFC-ACL-009 — Expiration automatique et jobs

## Statut

📝 Draft

## 1. Analyse de l’existant

Le modèle licence introduit des dates de fin (`EVALUATION`, `PLATFORM_INTERNAL`, abonnements), mais sans automatisation, le risque de droits résiduels est élevé.

## 2. Hypothèses éventuelles

- L’infra de jobs asynchrones existante (queue/cron) est disponible.
- Les expirations sont exécutées côté backend uniquement.
- Les notifications admin sont émises lors des expirations critiques.

## 3. Liste des fichiers à créer / modifier

- `apps/api/src/modules/licenses/jobs/*`
- `apps/api/src/modules/subscriptions/jobs/*`
- `apps/api/src/modules/notifications/*`
- `apps/api/src/modules/licenses/tests/*`
- `docs/API.md` (section opérations batch)

## 4. Implémentation complète

- Job `expire-evaluations` :
  - détecte `EVALUATION` expirées ;
  - marque état expiré/invalidant ;
  - émet audit + notification admin.
- Job `expire-platform-internal` :
  - coupe les accès support temporaires expirés.
- Job `subscription-grace-check` :
  - gère fin de grâce et blocages d’écriture pour `CLIENT_BILLABLE`.
- Scheduler :
  - exécution périodique (au minimum quotidienne, idéalement horaire).

## 5. Modifications Prisma si nécessaire

- Optionnel : champs `expiredAt`, `lastExpirationCheckAt` si besoin de traçabilité technique.
- Index fortement recommandés sur `licenseEndsAt`, `status`, `clientId`.

## 6. Tests

- évaluation expirée passe en état bloquant automatiquement.
- support interne expiré désactive accès automatiquement.
- abonnement hors grâce bloque écriture client billable.
- jobs idempotents (double exécution sans effet de bord).

## 7. Récapitulatif final

Cette RFC automatise le cycle de vie des droits temporaires et supprime la dépendance à une intervention manuelle.

## 8. Points de vigilance

- Gérer les fuseaux en UTC.
- Éviter les courses entre mutation manuelle et job (verrous / versioning).
- Superviser les jobs (métriques, retries, alertes).
