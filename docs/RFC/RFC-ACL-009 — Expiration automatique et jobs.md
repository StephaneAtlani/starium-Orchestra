# RFC-ACL-009 — Expiration automatique et jobs

## Statut

✅ Implémentée (backend MVP)

## 1. Analyse de l’existant

Le modèle licence introduit des dates de fin (`EVALUATION`, `PLATFORM_INTERNAL`, abonnements), mais sans automatisation, le risque de droits résiduels est élevé.

## 2. Hypothèses éventuelles

- L’infra de jobs asynchrones existante (queue/cron) est disponible.
- Les expirations sont exécutées côté backend uniquement.
- Les notifications admin sont émises lors des expirations critiques.

## 3. Liste des fichiers à créer / modifier

- `apps/api/src/modules/licenses/jobs/*`
- `apps/api/src/modules/queue/queue.constants.ts`
- `apps/api/src/modules/queue/queue.module.ts`
- `apps/api/src/modules/queue/queue.service.ts`
- `apps/api/src/modules/licenses/licenses.module.ts`
- `apps/api/src/modules/audit-logs/acl-audit-actions.ts`
- `apps/api/src/worker/worker.module.ts`
- `apps/api/src/modules/licenses/jobs/license-expiration-runner.service.spec.ts`

## 4. Implémentation complète

- Scheduler cron backend (`LicenseExpirationSchedulerService`) :
  - exécution horaire par défaut (`LICENSE_EXPIRATION_CRON_EXPRESSION`, TZ UTC par défaut) ;
  - enqueue du job unique BullMQ `license_expiration_scan`.
- Worker BullMQ (`LicenseExpirationProcessor`) :
  - consomme la queue `license-expiration` ;
  - exécute le runner dans l’ordre abonnement puis licences.
- Runner transactionnel (`LicenseExpirationRunnerService`) :
  - expiration abonnement (`ACTIVE -> EXPIRED`) si `endsAt` dépassé ;
  - downgrade post-grâce des licences `CLIENT_BILLABLE` rattachées (`READ_ONLY`, `NON_BILLABLE`, `subscriptionId=null`) ;
  - expiration des licences `EVALUATION` et `PLATFORM_INTERNAL` ;
  - batch pagination (taille configurable `LICENSE_EXPIRATION_BATCH_SIZE`) ;
  - idempotence via contrôle d’état final + `jobId` déterministe de scan.
- Notifications admin persistées et dédupliquées :
  - abonnement expiré ;
  - fin de période de grâce ;
  - accès support expiré ;
  - volume élevé de downgrades (seuil configurable `LICENSE_EXPIRATION_VOLUME_NOTIFICATION_THRESHOLD`, défaut 5).
- Audit logs transactionnels :
  - `client_subscription.expired`
  - `client_user.license.evaluation_expired`
  - `client_user.license.support_access_expired`
  - `client_user.license.subscription_expired_downgrade`

## 5. Modifications Prisma si nécessaire

- Aucune migration Prisma ajoutée dans ce lot.
- Le downgrade `subscriptionId -> null` est compatible avec le schéma actuel (`ClientUser.subscriptionId` nullable).

## 6. Tests

- `license-expiration-runner.service.spec.ts` :
  - downgrade `EVALUATION` expirée avec audit ;
  - idempotence (pas de remutation/audit si déjà downgradée) ;
  - expiration abonnement + downgrade licences rattachées + notifications.
- `license-write.guard.spec.ts` :
  - non-régression du blocage write après expiration licence/support.

## 7. Récapitulatif final

Cette RFC est implémentée côté backend : l’expiration des droits temporaires et des abonnements est automatisée via cron + BullMQ, avec mutations explicites, audit transactionnel et notifications admin dédupliquées.

## 8. Points de vigilance

- Gérer les fuseaux en UTC.
- Éviter les courses entre mutation manuelle et job (verrous / versioning).
- Superviser les jobs (métriques, retries, alertes).
