# RFC-038 — Socle alertes et emails async

## 1. Analyse de l’existant

- L’architecture cible Starium impose API-first, logique métier backend, multi-tenant strict et RBAC sur chaque endpoint.
- Des alertes existent déjà dans des modules métier (ex: Strategic Vision), mais sans socle transverse unique pour la gouvernance des alertes + notifications email asynchrones.
- Le besoin V1 est de poser un socle robuste et extensible, sans introduire de logique métier dans le frontend et sans bloquer les requêtes API sur l’envoi d’email.

## Concepts fondamentaux

- **Alert** : signal métier généré par le backend (budget, projet, ressource, vision stratégique, etc.). Persisté, scopé `clientId`, lifecycle `resolve` / `dismiss`.
- **Notification** : instance **par utilisateur** d’un signal à afficher dans la cloche (in-app). Peut référencer une `Alert` via `alertId` optionnel (ex. notifications système sans alerte).
- **Bell** : composant UI qui consomme **uniquement** `/api/notifications` ; il n’affiche pas directement la liste des `Alert`.

Règle clé : **une `Alert` peut générer 0..N `Notification`** (typiquement une ligne par utilisateur destinataire V1).

## 2. Hypothèses éventuelles

- Redis est disponible (ou activable) comme infrastructure de queue partagée.
- Le backend API NestJS reste le point d’entrée métier et la source de vérité.
- Le worker email tourne dans un process séparé du process API principal.
- Les permissions alertes s’alignent sur le RBAC existant via guards/décorateurs standards.

## 3. Liste des fichiers à créer / modifier

### Backend API (`apps/api`)

- `src/app.module.ts` (ou module racine équivalent) : enregistrement explicite de `AlertsModule`, `NotificationsModule`, `QueueModule`, `EmailModule`
- `src/modules/alerts/alerts.module.ts`
- `src/modules/alerts/alerts.controller.ts`
- `src/modules/alerts/alerts.service.ts`
- `src/modules/alerts/dto/get-alerts-query.dto.ts`
- `src/modules/alerts/dto/resolve-alert.dto.ts` (si payload nécessaire)
- `src/modules/alerts/dto/dismiss-alert.dto.ts` (si payload nécessaire)
- `src/modules/email/email.module.ts`
- `src/modules/email/email.service.ts`
- `src/modules/email/email.templates.ts`
- `src/modules/queue/queue.module.ts` (BullMQ setup partagé)
- `src/modules/alerts/alerts-trigger.service.ts` (orchestration centralisée des triggers)
- `src/modules/alerts/alerts-trigger-scheduler.service.ts` (cron périodique multi-clients)
- `src/modules/audit/*` (ajout des événements `alert.*` et `email.*`)
- `src/modules/rbac/*` (ajout modules/permissions `alerts` et `notifications` dans seed RBAC si absent)
- `src/modules/notifications/notifications.module.ts`
- `src/modules/notifications/notifications.controller.ts`
- `src/modules/notifications/notifications.service.ts`
- `src/modules/notifications/dto/get-notifications-query.dto.ts`
- `prisma/schema.prisma` (modèle `Alert` + index)
- `prisma/schema.prisma` (modèle `Notification` + index)
- `prisma/schema.prisma` (modèle `EmailDelivery` + index)
- `prisma/migrations/<timestamp>_add_alerts_and_email_queue/`

### Worker (`apps/api/src/worker`)

- `src/worker/main.ts` (bootstrap worker)
- `src/modules/email/email.processor.ts`
- `src/modules/queue/queue.module.ts`
- `package.json` (script `start:worker`)

### Frontend (`apps/web`)

- `src/features/alerts/*` (panel alertes critiques + actions resolve/dismiss sur `/api/alerts`)
- `src/features/notifications/*` ou composants dédiés (Bell : liste, mark read, navigation entité)
- `src/components/layout/*` (badge compteur **unread** depuis `/api/notifications`)
- `src/services/alerts.ts` (consommation API alertes)
- `src/services/notifications.ts` (consommation API notifications)

## 4. Implémentation complète

### 4.1 Infrastructure async (Redis + BullMQ)

- Ajouter/activer Redis pour la file de jobs.
- Intégrer BullMQ côté backend avec configuration centralisée.
- Interdiction d’envoyer des emails depuis un controller/service synchrone métier.
- Toute demande d’envoi email passe par enqueue d’un job `send_email`.
- Enregistrement NestJS explicite des modules `AlertsModule`, `NotificationsModule`, `QueueModule`, `EmailModule` dans `app.module.ts` (ou module racine adapté).

### 4.2 Modèle Alert (source de vérité backend)

Créer l’entité `Alert` avec les champs:

- `id`
- `clientId` (obligatoire)
- `type` (`budget`, `project`, `license`, `system`, ...)
- `severity` (`info`, `warning`, `critical`)
- `title`
- `message`
- `entityType`
- `entityId`
- `status` (`active`, `resolved`, `dismissed`)
- `createdAt`
- `updatedAt`
- `resolvedAt`
- `dismissedAt`
- `metadata` (JSON)
- `ruleCode` (code règle métier à l’origine de l’alerte)

Convention de statut:

- `resolvedAt` est renseigné uniquement quand `status = resolved`.
- `dismissedAt` est renseigné uniquement quand `status = dismissed`.

Contraintes:

- Index obligatoire sur `(clientId, status, severity)`.
- Anti-doublon: clé fonctionnelle recommandée `(clientId, type, severity, entityType, entityId, ruleCode, status)`.
- Prisma schema: index non-unique recommandé sur la clé anti-doublon pour accélérer la recherche.
- Unicité partielle sur `status = ACTIVE`: à implémenter via migration SQL PostgreSQL manuelle si nécessaire (index unique partiel).
- Si PostgreSQL le permet, ajouter un index unique partiel SQL manuel sur les alertes actives:
  - clé: `(clientId, type, severity, entityType, entityId, ruleCode)`
  - condition: `WHERE status = 'ACTIVE'`
- Si une alerte active identique existe déjà: ne pas recréer, mettre à jour `metadata` + `updatedAt`.
- Le service doit vérifier explicitement l’existence d’une alerte `ACTIVE` identique avant création.
- Aucune lecture/écriture hors scope `clientId` actif autorisé.
- `metadata` ne doit contenir aucune donnée sensible.

### 4.2.1 Modèle `Notification` (Prisma)

Créer l’entité `Notification` (diffusion utilisateur, distincte de `Alert`) :

- `id`
- `clientId`
- `userId`
- `alertId` (optionnel)
- `type` (`alert`, `system`, `info`, …)
- `title`
- `message`
- `status` (`unread`, `read`)
- `createdAt`
- `readAt`
- `entityType` (optionnel)
- `entityId` (optionnel)
- `entityLabel` (optionnel)
- `actionUrl` (optionnel)
- `metadata` (JSON)

Contraintes :

- Index `(clientId, userId, status)`.
- Aucune donnée hors scope `clientId` ; `userId` doit appartenir au client concerné.
- `metadata` sans données sensibles ; les informations de navigation entité (`entityType`, `entityId`, `entityLabel`, `actionUrl`) doivent être portées par des champs dédiés, pas en metadata.

### 4.3 API Alertes

Endpoints V1:

- `GET /api/alerts`
- `PATCH /api/alerts/:id/resolve`
- `PATCH /api/alerts/:id/dismiss`
- `POST /api/alerts/evaluate` (recalcul immédiat budget / projet / contrats — `alerts.update`)

Exigences:

- Guards complets (auth + permissions RBAC).
- Permissions RBAC V1 exactes:
  - `GET /api/alerts` => `alerts.read`
  - `PATCH /api/alerts/:id/resolve` => `alerts.update`
  - `PATCH /api/alerts/:id/dismiss` => `alerts.update`
  - `alerts.manage` réservé aux réglages futurs (hors scope V1)
- Filtrage `clientId` obligatoire dans toutes les requêtes.
- Pagination obligatoire sur `GET /api/alerts` avec `limit`/`offset`.
- Filtres optionnels sur `GET /api/alerts`: `status`, `severity`, `type`, `entityType`.
- Tri par défaut sur `GET /api/alerts`: `createdAt desc`.
- Réponses UI enrichies avec libellés métier (pas d’ID brut visible côté UI).

### 4.3.1 API Notifications

Endpoints V1 :

- `GET /api/notifications`
- `PATCH /api/notifications/:id/read`
- `PATCH /api/notifications/read-all`
- `DELETE /api/notifications` (clear-all — suppression définitive user + client actif)
- `DELETE /api/notifications/:id` (clear one)

Exigences :

- Pagination obligatoire (`limit`/`offset`).
- Filtre optionnel `status` (`unread` / `read`).
- Tri par défaut : `createdAt desc`.
- Guards + RBAC :
  - `GET /api/notifications` => `notifications.read`
  - `PATCH /api/notifications/:id/read`, `PATCH /api/notifications/read-all`, `DELETE /api/notifications`, `DELETE /api/notifications/:id` => `notifications.update`
- Règle cloche V1 : tout utilisateur connecté au client actif doit pouvoir lire ses notifications personnelles ; `notifications.read` et `notifications.update` sont injectés **implicitement** par `EffectivePermissionsService` (socle — indépendant des profils `default-profiles.json`).
- La visibilité de la cloche n’est pas conditionnée à `alerts.read`.
- Filtrage `clientId` obligatoire ; le scope utilisateur courant ne retourne que **ses** notifications.
- `GET /api/notifications` retourne strictement les notifications du `userId` courant dans le `clientId` actif.
- Le badge de cloche doit compter strictement `status = unread`.
- `PATCH /api/notifications/read-all` agit uniquement sur `userId` courant + `clientId` actif.
- `DELETE /api/notifications` et `DELETE /:id` agissent uniquement sur `userId` courant + `clientId` actif ; n’impactent ni les `Alert` ni les `EmailDelivery`.

### 4.4 EmailModule

- Provider SMTP configurable via variables d’environnement.
- `EmailService` dédié pour composer et envoyer.
- Templates HTML + texte.
- Variables dynamiques injectables (context/template data).

Variables d’environnement obligatoires:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`
- `SMTP_SECURE`
- `SMTP_TIMEOUT_MS`
- `EMAIL_QUEUE_RETRY_ATTEMPTS`
- `EMAIL_QUEUE_BACKOFF_MS`
- `REDIS_HOST`
- `REDIS_PORT`
- `REDIS_PASSWORD` (si nécessaire)

Règles d’environnement:

- En production, `SMTP_HOST`, `SMTP_PORT` et `SMTP_FROM` sont obligatoires.
- En développement, mode `log-only` autorisé si SMTP non configuré.
- En mode `log-only`, aucun email réel n’est envoyé.
- En `production`, appliquer un comportement fail-fast au démarrage si `SMTP_HOST`, `SMTP_PORT` ou `SMTP_FROM` est absent.

Emails V1:

- Alerte critique.
- Notification générique.

### 4.5 Queue Email (BullMQ)

- Queue dédiée `email`.
- Job type `send_email`.
- Retry automatique configuré (backoff + nombre max de tentatives).
- Gestion d’erreurs avec journalisation et statut d’échec exploitable.
- Persistance des envois dans `EmailDelivery` pour traçabilité applicative.
- Statut de livraison normalisé via enum `EmailDeliveryStatus`:
  - `PENDING`
  - `SENT`
  - `FAILED`
  - `RETRYING`

### 4.6 Worker dédié

- Process séparé de l’API.
- Consommation des jobs `send_email`.
- Logging explicite des succès/échecs.
- Retry géré au niveau BullMQ + worker processor.
- Le bootstrap worker importe uniquement les modules nécessaires (queue/email/infra associée), sans démarrer l’API HTTP.
- Structure cible explicite:
  - `apps/api/src/worker/main.ts`
  - `apps/api/src/modules/email/email.processor.ts`
  - `apps/api/src/modules/queue/queue.module.ts`
- Script de démarrage dédié (ou équivalent compatible architecture actuelle):
  - `"start:worker": "nest start --entryFile worker/main"`
- Healthcheck minimal du worker:
  - vérifier la connexion Redis
  - vérifier que le worker email est démarré
  - pas d’endpoint HTTP dédié requis en V1 si non adapté ; log/commande explicite au démarrage

### 4.7 Déclenchement d’alertes (centralisé)

La génération d’alertes est centralisée dans `AlertsService` (ou service orchestration dédié du module alertes), jamais dans les controllers.

À la création ou mise à jour métier d’une `Alert` pertinente, **`AlertsService` crée les `Notification` associées** (une par utilisateur destinataire V1, voir §4.8) et renseigne `alertId` sur chaque `Notification`. Le modèle `Alert` existant n’est pas supprimé ni simplifié : la couche `Notification` s’ajoute par-dessus.

Triggers V1:

- Désalignement stratégique.
- Dépassement budget.
- Projet en risque critique.

Méthodes explicites dans `AlertsTriggerService`:

- `evaluateBudgetAlerts(clientId)` — dépassement / proche plafond sur lignes budgétaires actives (`ruleCode` : `budget.line.overrun`, `budget.line.near_limit`).
- `evaluateProjectAlerts(clientId)` — projet en retard, jalons dépassés, risques critiques ouverts (`project.overdue`, `project.milestone.overdue`, `project.risk.critical`).
- `evaluateContractAlerts(clientId)` — contrats expirés ou proches échéance (`contract.expired`, `contract.expiring_soon`).
- `evaluateAllForClient(clientId)` — agrège les trois familles ci-dessus.
- `evaluateStrategicVisionAlerts(clientId)` — **stub** (`evaluated: 0`) ; les alertes vision restent sur `GET /api/strategic-vision/alerts` (RFC Strategic Vision).

Résolution automatique des alertes obsolètes : `AlertsService.resolveStaleByRule` (entités qui ne satisfont plus la condition).

Déclenchement:

- **Cron** : `AlertsTriggerSchedulerService` dans le process API (`ScheduleModule`) — expression `ALERTS_TRIGGER_CRON_EXPRESSION` (défaut `0 * * * *`, TZ `ALERTS_TRIGGER_CRON_TZ` défaut `UTC`) ; désactivable via `ALERTS_TRIGGER_ENABLED=false`.
- **Manuel** : `POST /api/alerts/evaluate` (client actif, `alerts.update`).
- Appel depuis services métier après mutation pertinente : **hors scope livré** (le cron couvre le besoin V1).

### 4.8 Règle Alertes -> Notifications + Email (V1)

- **Toute alerte** (toute sévérité) génère des **`Notification`** pour les utilisateurs concernés (voir destinataires ci-dessous) : **diffusion in-app uniquement via la cloche**, pas de broadcast global anonyme.
- **`severity = critical`** : en plus des notifications, **enqueuer un job email** (file BullMQ), comme défini précédemment.
- **`severity != critical`** : **notifications uniquement** (pas d’email).

#### Fan-out idempotent (anti-boucle cron)

`AlertsService.upsertAlert` est idempotent sur **l’Alert et les canaux** :

| Code | Règle |
|------|--------|
| A1 | Une alerte ACTIVE unique par `(clientId, type, severity, entityType, entityId, ruleCode)`. |
| A2 | Condition disparue → `resolveStaleByRule` → `RESOLVED`. |
| A3 | Après `RESOLVED`/`DISMISSED`, condition vraie à nouveau → nouvelle Alert → nouveau fan-out. |
| N1 | Fan-out notif seulement si aucune ligne `(clientId, userId, alertId)`. |
| N2 | Jamais recréer ni repasser `READ` → `UNREAD` sur re-évaluation. |
| N3 | Update Alert ACTIVE : maj titre/message ; ne pas toucher aux notifications existantes. |
| N4 | Nouvel admin sans notif : reçoit 1 notif à la prochaine éval (N1), sans re-spammer les autres. |
| E1 | Email seulement si `CRITICAL`. |
| E2 | Au plus un `EmailDelivery` `critical_alert` par `(alertId, recipient)` tant que status ∈ `PENDING`/`SENT`/`RETRYING`. |
| E3 | Pas d’email sur update d’Alert déjà notifiée. |

Index uniques partiels (défense multi-instances) : `Notification_client_user_alert_unique_idx`, `EmailDelivery_critical_alert_dedup_unique_idx` — migration `20260721080000_rfc_038_notification_email_fanout_dedup` (inclut cleanup des doublons existants).

Destinataires V1 (pour les alertes transformées en notifications / emails) :

- utilisateurs du client avec permission `alerts.read` ou rôle `CLIENT_ADMIN`
- exclure systématiquement les utilisateurs suspendus et invités
- **une `Notification` par utilisateur** (pas une seule ligne partagée)
- pas de préférences utilisateurs avancées en V1

Clarification RBAC :

- La **sélection des destinataires d’une alerte** s’appuie sur `alerts.read` (ou `CLIENT_ADMIN`).
- La **lecture des notifications personnelles** s’appuie sur `notifications.read`.
- Les mutations cloche (`read`, `read-all`, `DELETE`) s’appuient sur `notifications.update`.

### 4.9 Audit logs

Événements obligatoires:

- `alert.created`
- `alert.resolved`
- `alert.dismissed`
- `email.sent`
- `email.failed`
- `notification.created`
- `notification.read`
- `notification.cleared` (clear-all)
- `notification.deleted` (clear one)

Champs minimum recommandés dans les événements:

- `clientId`, `actorUserId`, `entityType`, `entityId`, `alertId` (si applicable), horodatage, résumé du résultat.
- Les erreurs SMTP brutes ne doivent pas être exposées au frontend (message technique interne uniquement).
- Les erreurs SMTP sont stockées en interne dans `EmailDelivery.lastError`.
- `lastError` doit être tronqué/sanitisé avant persistance.

### 4.10 Frontend V1 (sans logique métier)

Priorisation de livraison V1:

- Priorité 1: connecter la cloche aux notifications (`/api/notifications`).
- Priorité 2: livrer un panel alertes critiques minimal (`/api/alerts`).
- Hors périmètre RFC-038: création d’un dashboard alertes complet.

**Panel alertes (cockpit / gouvernance)** — consomme `/api/alerts` :

- Panel “Alertes critiques” (ou liste alertes selon produit).
- Affichage de la sévérité.
- Actions `resolve` / `dismiss` via API uniquement.

**Bell (cloche)** — consomme **`/api/notifications` uniquement** :

- Badge = **nombre de notifications `unread`** (pas le nombre d’`Alert`).
- Liste des notifications : titre, message, statut lu/non lu.
- **Priorité visuelle** selon la sévérité **uniquement si** la notification est liée à une alerte : exposer un champ dérivé API (ex. `alertSeverity`) ou équivalent **sans** logique métier côté UI.
- Actions :
  - marquer comme lu (`PATCH …/read`, `PATCH …/read-all`)
  - **effacer une** (`DELETE /api/notifications/:id`)
  - **effacer tout** (`DELETE /api/notifications`) — confirmation UI obligatoire ; suppression définitive des lignes du user + client actif
  - navigation vers l’entité (`actionUrl` / libellés métier)
- **La cloche n’affiche pas directement les `Alert`** ; les écrans qui manipulent les alertes restent sur `/api/alerts`.
- Clear-all / clear-one **n’impactent pas** les `Alert` ni les `EmailDelivery` déjà créés.
- Règles cloche : C1 Tout lu ; C2 Effacer tout (DELETE) ; C3 Effacer une ; C4 scope user+client strict ; C5 empty state + `aria-live` ; C6 confirmation avant clear-all.

Aucune règle métier locale : le frontend ne fait que consommer les APIs.

## 5. Modifications Prisma si nécessaire

- Ajouter le modèle `Alert` dans `schema.prisma`.
- Ajouter les enums nécessaires (`AlertType`, `AlertSeverity`, `AlertStatus`) si retenu.
- Ajouter les index de performance, dont `(clientId, status, severity)`.
- Ajouter `updatedAt` + `ruleCode` au modèle `Alert`.
- Ajouter l’index anti-doublon basé sur `(clientId, type, severity, entityType, entityId, ruleCode, status)`.
- Prévoir migration SQL PostgreSQL manuelle pour l’unicité partielle des alertes `ACTIVE` si nécessaire.
- Ajouter un modèle `EmailDelivery` avec:
  - `clientId`
  - `alertId` optionnel
  - `recipient`
  - `subject`
  - `templateKey`
  - `status`
  - `attempts`
  - `lastError`
  - `sentAt`
  - `createdAt`
- Ajouter enum `EmailDeliveryStatus`:
  - `PENDING`
  - `SENT`
  - `FAILED`
  - `RETRYING`
- Ajouter le modèle `Notification` (champs et index §4.2.1) ; relation optionnelle vers `Alert` via `alertId`.
- Générer migration SQL additive, sans rupture.

## 6. Tests

### Backend

- Unit tests `AlertsService` (création, resolve, dismiss, triggers, scoping client, **création des `Notification` associées**).
- Unit tests `NotificationsService` (liste paginée, read, read-all, clear-all, clear-one, isolation `clientId` + `userId`).
- Tests RBAC/guards sur endpoints alertes et notifications.
- Tests d’isolation multi-tenant (aucune fuite inter-client).
- Test anti-doublon: une alerte active identique est mise à jour, pas recréée.
- Test anti-boucle canaux: re-upsert Alert ACTIVE → 0 `notification.create`, 0 `queueEmail` si déjà diffusée.
- Tests queue: création job `send_email`, retry, erreurs.
- Tests worker: traitement job, succès, échec, audit.
- Tests destinataires: exclusion suspendus/invités.
- Tests sécurité: erreurs SMTP non exposées côté API/frontend.
- Tests minimum obligatoires avant fin:
  - test multi-tenant sur `GET /api/notifications`
  - test `read-all` limité au user courant
  - test anti-doublon alerte `ACTIVE`
  - test mode `log-only` en `development`
  - test fail-fast SMTP en `production`

### Frontend

- Tests UI panel alertes critiques (loading/empty/data/error).
- Tests Bell : liste notifications, badge unread, mark read / read-all, clear-all (confirm), clear one.
- Tests actions resolve/dismiss (mutation + refresh compteur).
- Vérification affichage de valeurs métier (jamais d’ID brut visible).

## 7. Récapitulatif final

Cette RFC introduit un socle transverse **`Alert` (signal métier) + `Notification` (diffusion utilisateur) + Email async + Bell UI** conforme Starium:

- API-first et backend source de vérité.
- Multi-tenant strict (`clientId` obligatoire partout).
- RBAC et audit systématiques.
- Envoi email exclusivement asynchrone via queue BullMQ + worker séparé.
- Extension prête vers futures notifications sans casser le socle.

## 7.1 État d’implémentation synchronisé (repo)

Alignement **code / schéma Prisma** (à distinguer des libellés métier minuscules du §4.2) :

- En base PostgreSQL, les enums Prisma sont en **MAJUSCULES** (`AlertStatus` : `ACTIVE`, `RESOLVED`, `DISMISSED` ; `AlertSeverity` : `INFO`, `WARNING`, `CRITICAL` ; `AlertType`, `NotificationStatus`, etc.).
- Migration : `apps/api/prisma/migrations/20260425195500_rfc_038_alerts_notifications_async_email/` — index unique partiel anti-doublon alertes actives `Alert_active_dedup_unique_idx` sur `(clientId, type, severity, entityType, entityId, ruleCode)` avec `WHERE status = 'ACTIVE'`.
- Modules Nest enregistrés dans `apps/api/src/app.module.ts` : `AlertsModule`, `NotificationsModule`, `QueueModule`, `EmailModule`. Code sous `apps/api/src/modules/alerts/`, `notifications/`, `queue/`, `email/`.
- Worker sans HTTP : `apps/api/src/worker/main.ts` + `WorkerModule` ; script `pnpm start:worker` depuis `apps/api` ; service Docker Compose **`api-worker`** (`docker-compose.yml`).
- Orchestration : `AlertsService.upsertAlert` upsert l’`Alert` ACTIVE puis fan-out **idempotent** (notif seulement si absente pour `(clientId,userId,alertId)` ; email CRITICAL seulement si aucun `EmailDelivery` actif) ; `AlertsService.resolveStaleByRule` résout les alertes actives devenues obsolètes.
- Migration anti-boucle : `20260721080000_rfc_038_notification_email_fanout_dedup` (cleanup doublons + index uniques partiels).
- API clear : `DELETE /api/notifications`, `DELETE /api/notifications/:id` (`notifications.update`).
- Triggers **implémentés** : `AlertsTriggerService` — budget, projet, contrats (voir §4.7) ; `evaluateStrategicVisionAlerts` reste stub. Scheduler : `AlertsTriggerSchedulerService` (cron horaire par défaut).
- API : `POST /api/alerts/evaluate` sur `AlertsController` (`alerts.update`).
- **Socle RBAC implicite** (tout utilisateur authentifié, contexte client) :
  - `EffectivePermissionsService` (`BASELINE_PERMISSION_CODES`) injecte `notifications.read`, `notifications.update`, `alerts.read` au runtime — **sans dépendre** des profils `default-profiles.json`.
  - `alerts.update` (resolve / dismiss / evaluate) : rôle seed global « Client admin — alertes » assigné aux `CLIENT_ADMIN` actifs (`ensureAlertsNotificationsBaselineRole` dans `seed.ts`).
- **Modules socle** : `ModuleAccessGuard` (`BASELINE_MODULE_CODES` = `notifications`, `alerts`) — accès autorisé même si `ClientModule` désactivé ou module masqué (RFC-ACL-004) ; seul `Module.isActive = false` (plateforme) bloque.
- Seed : `ensureAlertsAndNotificationsModulesAndPermissions`, `ensureEnabledClientModulesForAllClients`, `ensureAlertsNotificationsBaselineRole`. Les codes `notifications.*` / `alerts.read` ont été **retirés** de `default-profiles.json` (redondants avec le socle implicite).
- UI : `apps/web/src/features/notifications/` (cloche dans `workspace-header.tsx`), `apps/web/src/features/alerts/` (panel minimal sur `/dashboard`), services `apps/web/src/services/notifications.ts` et `alerts.ts`.
- Contrat HTTP détaillé : [docs/API.md](../API.md) §5.7.

**Route distincte** : `GET /api/strategic-vision/alerts` (RFC Strategic Vision) reste indépendante du socle `GET /api/alerts`.

### 7.2 Déploiement production

1. **Déployer le code** + migrations Prisma (entrypoint API : `prisma:migrate` dans `apps/api/Dockerfile`).
2. **Seed prod (recommandé une fois)** — ne touche **pas** aux comptes `User` :
   ```bash
   NODE_ENV=production ALLOW_PROD_SEED=true pnpm prisma:seed
   ```
   depuis `apps/api` (ou exec conteneur `api`). Synchronise modules/permissions, rôles socle, `alerts.update` pour `CLIENT_ADMIN`. La lecture notifs/alertes fonctionne **dès le deploy** via le socle runtime ; le seed reste utile pour `alerts.update` et l’audit des rôles en base.
3. **Worker email** : service `api-worker` actif ; `EMAIL_DELIVERIES_INLINE` vide/false ; Redis + SMTP (`SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM` obligatoires en prod).
4. **Cron alertes** : tourne dans le process API ; variables optionnelles `ALERTS_TRIGGER_CRON_EXPRESSION`, `ALERTS_TRIGGER_CRON_TZ`, `ALERTS_TRIGGER_ENABLED`.
5. **Premier remplissage** : `POST /api/alerts/evaluate` (CLIENT_ADMIN) ou attendre le cron.

**Désactivation** : seul le **platform_admin** peut couper globalement (`Module.isActive = false` sur `alerts` / `notifications`, ou `ALERTS_TRIGGER_ENABLED=false`). Un CLIENT_ADMIN **ne peut pas** masquer ni désactiver ces modules côté client.

## 8. Points de vigilance

- Ne jamais envoyer d’email depuis un flux HTTP synchrone.
- Ne jamais lire/mettre à jour une alerte sans contrainte `clientId`.
- Garder la génération d’alertes centralisée (pas de duplication dans controllers/modules).
- Démarrer/superviser le worker indépendamment de l’API (healthcheck recommandé).
- Ne jamais insérer de secrets/données sensibles dans `metadata`.
- Conserver le périmètre V1 strict :
  - hors scope: SMS, push mobile, règles personnalisables par client, **préférences utilisateur notifications**, **filtrage personnalisé** des notifications, **multi-canal** (SMS, push), **digest** (email ou in-app).
  - **Dans le périmètre** : suppression notification (`DELETE /api/notifications`, `DELETE /:id`) + fan-out idempotent anti-boucle.

## Critères d’acceptation V1

- Aucune requête API bloquante pour l’envoi d’email.
- Toutes les alertes sont isolées par client.
- Aucun envoi email en dehors de la queue.
- Worker opérationnel indépendamment du process API.
- Audit complet des événements alertes, notifications et emails.
- Une alerte critique identique ne génère pas plusieurs emails en boucle.
- Une re-évaluation cron d’une Alert ACTIVE déjà notifiée ne recrée ni notification ni email pour les destinataires déjà couverts.
- `DELETE /api/notifications` (clear-all) et `DELETE /:id` n’impactent pas les `Alert` ni les `EmailDelivery`.
- Un utilisateur d’un autre client / un autre user ne peut pas supprimer les notifications hors de son scope.
- Un utilisateur sans `alerts.read` ne voit aucune alerte via `GET /api/alerts` — **sauf** socle implicite : tout utilisateur authentifié reçoit `alerts.read` via `EffectivePermissionsService`.
- Un utilisateur sans `notifications.read` ne voit aucune notification via `GET /api/notifications` (cloche vide côté données) — **sauf** socle implicite : tout utilisateur authentifié reçoit `notifications.read` / `notifications.update`.
- Une alerte génère des **notifications par utilisateur** destinataire (règle V1).
- Chaque utilisateur a **sa propre** liste de notifications (cloche personnelle).
- Le badge de la cloche reflète **uniquement** le nombre de notifications `unread`.
- Marquer une notification comme lue **n’impacte pas** les autres utilisateurs.
- Marquer lue une notification **n’impacte pas** l’`Alert` sous-jacente (lifecycle alerte indépendant).
- Un utilisateur sans `alerts.read` peut voir ses notifications personnelles si elles existent et s’il a `notifications.read`.
- La cloche ne donne jamais accès à une `Alert` que l’utilisateur ne peut pas consulter via `/api/alerts`.
- Un utilisateur d’un autre client ne peut pas `resolve`/`dismiss` une alerte.
- Le worker peut être lancé sans démarrer le serveur HTTP principal.
- L’API peut démarrer sans SMTP en environnement `development` via mode `log-only`.
- En `production`, absence de configuration SMTP valide provoque une erreur explicite au démarrage.
