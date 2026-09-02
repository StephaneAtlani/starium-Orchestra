# RFC-BUD-044 — Automatisation des imports budgétaires

## Statut

📝 **Draft** — dépend de [RFC-BUD-043](./RFC-BUD-043%20%E2%80%94%20Import%20budg%C3%A9taire%20CSV%20Excel%20%E2%80%94%20centre%20de%20gestion.md) (centre de gestion + profils) et du moteur [RFC-018](./RFC-018%20%E2%80%94%20Budget%20Data%20Import.md).

## Priorité

🟡 **Moyenne-haute** — cas d’usage DSI : réimport mensuel compta/ERP sans action manuelle répétée.

## Dépendances

* **RFC-018** — moteur import (analyze / preview / execute)
* **RFC-BUD-043** — profils d’import, historique jobs, UI Configuration
* **RFC-038** — Socle alertes et emails async (notifications succès/échec)
* **RFC-032** — trace décisionnelle / audit
* **RFC-BUD-041** — réimport réel autorisé sur budget validé ; pas d’équivalence PA

## Périmètre

| Inclus | Exclus |
|--------|--------|
| Planification cron (mensuel, hebdo, custom) | Connecteur ERP natif temps réel (→ RFC future ERP) |
| Dépôt fichier SFTP / dossier surveillé (lot 2) | Import planning 12 mois |
| Exécution async via BullMQ + worker | Transformation ETL complexe multi-fichiers |
| Notification email + alerte in-app | Réécriture du moteur matching RFC-018 |
| API CRUD planifications | Import cross-budget en une passe |
| Relance manuelle depuis hub RFC-BUD-043 | Stockage long terme des fichiers sources |

---

# 1. Analyse de l'existant

## 1.1 Moteur synchrone

Aujourd’hui `POST /api/budget-imports/execute` :

* Traitement **HTTP synchrone** dans la requête.
* Limite **20 000 lignes** — acceptable en sync pour la majorité des exports mensuels.
* Fichier via **fileToken** temporaire (1 h, disque local `temp/imports`).
* Utilisateur **doit être connecté** et avoir uploadé le fichier.

**Conséquence** : impossible de planifier un import nocturne sans session utilisateur ni fileToken persistant.

## 1.2 Infrastructure async disponible

| Brique | Référence code |
|--------|----------------|
| BullMQ + Redis | `apps/api/src/modules/queue/` |
| Worker séparé | `pnpm start:worker`, `docker-compose*.yml` |
| Processors existants | email, licenses expiration, Microsoft Teams provisioning |
| Alertes / emails | RFC-038 `AlertsTriggerSchedulerService`, `EmailService` |

Le pattern **enqueue job → worker → mise à jour statut entité → notification** est éprouvé sur le dépôt.

## 1.3 Manques pour l’automatisation

* Entité **planification** (`BudgetImportSchedule`) absente.
* Pas de **stockage persistant** de fichiers entrants (SFTP/dépôt).
* Pas de **compte technique** ou **jeton de service** scoped client pour execute headless.
* Execute lié à `uploadedByUserId === userId` sur fileToken.

---

# 2. Objectif

Permettre à un administrateur budget de **configurer des imports automatiques** depuis **Configuration → Imports → Automatisations** :

1. **Planification cron** : ex. « chaque 5 du mois à 06:00, appliquer le profil *Compta Sage* sur le budget RUN 2026 ».
2. **Source fichier** (lots) :
   - **Lot 1** : déclenchement manuel différé « importer le dernier fichier déposé » (API).
   - **Lot 2** : **SFTP** ou **dossier monté** (volume Docker / S3 prefix client).
   - **Lot 3** : **webhook** HTTP sécurisé (iPaaS Make/n8n).
3. **Exécution async** : job BullMQ, suivi dans l’historique RFC-BUD-043.
4. **Notifications** : email + alerte in-app en succès/échec partiel/total.

---

# 3. Hypothèses

| # | Hypothèse |
|---|-----------|
| H1 | Une planification cible **un profil** + **un budget** + **une source fichier** |
| H2 | Le fichier entrant respecte le profil (même structure CSV) — pas de auto-detect colonnes avancé |
| H3 | **Service account** par client (`BudgetImportServiceCredential`) ou réutilisation d’un user technique créé à l’activation |
| H4 | Fuseau horaire planification = **`Client.timezone`** ou `Europe/Paris` par défaut |
| H5 | En échec, **pas de retry infini** — max 3 tentatives espacées puis statut `FAILED` + alerte |

---

# 4. Modèle de données (Prisma)

## 4.1 `BudgetImportSchedule`

```prisma
enum BudgetImportScheduleStatus {
  ACTIVE
  PAUSED
  DISABLED
}

enum BudgetImportTriggerType {
  CRON
  SFTP_POLL
  WEBHOOK
  MANUAL_QUEUE
}

model BudgetImportSchedule {
  id              String                      @id @default(cuid())
  clientId        String
  name            String
  description     String?
  status          BudgetImportScheduleStatus  @default(ACTIVE)
  triggerType     BudgetImportTriggerType
  cronExpression  String?                     // CRON only, ex. "0 6 5 * *"
  timezone        String                      @default("Europe/Paris")
  mappingId       String
  budgetId        String
  /// Override options (importMode, defaultEnvelopeId, …) — merge avec mapping.optionsConfig
  optionsOverride Json?
  /// SFTP: host, path, credentials ref — jamais en clair
  sourceConfig    Json?
  notifyOnSuccess Boolean                     @default(true)
  notifyOnFailure Boolean                     @default(true)
  notifyUserIds   String[]                    @default([])
  lastRunAt       DateTime?
  lastRunStatus   BudgetImportJobStatus?
  lastRunJobId    String?
  nextRunAt       DateTime?
  createdById     String?
  createdAt       DateTime                    @default(now())
  updatedAt       DateTime                    @updatedAt

  client   Client              @relation(...)
  mapping  BudgetImportMapping @relation(...)
  budget   Budget              @relation(...)
  runs     BudgetImportScheduledRun[]

  @@index([clientId, status])
  @@index([clientId, nextRunAt])
}
```

## 4.2 `BudgetImportScheduledRun`

Trace chaque déclenchement (planifié ou webhook) :

```prisma
model BudgetImportScheduledRun {
  id           String   @id @default(cuid())
  clientId     String
  scheduleId   String
  importJobId  String?  // lien vers BudgetImportJob une fois terminé
  triggerType  BudgetImportTriggerType
  status       BudgetImportScheduledRunStatus // PENDING | RUNNING | COMPLETED | FAILED
  sourceFileName String?
  errorMessage String?
  startedAt    DateTime @default(now())
  finishedAt   DateTime?

  schedule  BudgetImportSchedule @relation(...)
  importJob BudgetImportJob?     @relation(...)

  @@index([clientId, scheduleId, startedAt])
}
```

## 4.3 Extension `BudgetImportJob`

```prisma
model BudgetImportJob {
  // … existant …
  scheduleId     String?
  scheduledRunId String?
  triggerType    BudgetImportTriggerType? @default(MANUAL_QUEUE)
  sourceChannel  BudgetImportSourceChannel @default(UI)

  schedule BudgetImportSchedule? @relation(...)
}

enum BudgetImportSourceChannel {
  UI
  SCHEDULED
  SFTP
  WEBHOOK
  API
}
```

Alignement RFC-BUD-041 §3.7.4 : tag `sourceChannel` pour historique et décisions.

---

# 5. Architecture d’exécution

## 5.1 Flux cron (lot 1)

```
BudgetImportSchedulerService (cron Nest @Schedule ou BullMQ repeatable)
  → pour chaque schedule ACTIVE dont nextRunAt <= now
  → récupère fichier (sourceConfig)
  → BudgetImportAsyncService.enqueueRun(scheduleId, fileBuffer)
  → BullMQ queue `budget-import`
  → BudgetImportProcessor (worker)
       → parse + preview interne (sans HTTP)
       → execute transaction (réutilise BudgetImportService.executeInternal)
       → MAJ BudgetImportJob + ScheduledRun
       → notifications RFC-038
       → calcul nextRunAt
```

## 5.2 Refactor moteur (minimal)

Extraire de `BudgetImportService` :

* `executeFromBuffer(clientId, userId, budgetId, buffer, fileName, mapping, options, meta)` — sans fileToken.
* `executeInternal(...)` partagé UI sync et worker async.

**FileToken** reste pour le parcours UI manuel ; l’async passe par buffer en mémoire ou chemin staging chiffré.

## 5.3 Identité d’exécution

| Mode | `createdById` sur job |
|------|------------------------|
| UI manuel | Utilisateur connecté |
| Planifié | `schedule.createdById` ou user technique client |
| Webhook | User technique + audit `sourceIp` |

Audit : `budget_import.scheduled.executed`, `budget_import.scheduled.failed`.

## 5.4 Queue BullMQ

```typescript
// apps/api/src/modules/budget-import/budget-import.processor.ts
@Processor('budget-import')
export class BudgetImportProcessor {
  // Connexion Redis dédiée (pattern email.processor.ts)
}
```

Configuration : concurrency 2 par worker ; timeout job 15 min ; retry 3× backoff exponentiel.

---

# 6. Sources fichier

## 6.1 Lot 1 — Manuel en file (MVP auto)

Bouton hub « **Mettre en file d’attente** » : upload fichier + choix profil/budget → enqueue sans attendre la fin HTTP (réponse 202 + `scheduledRunId`).

## 6.2 Lot 2 — SFTP / dossier

`sourceConfig` (chiffré ou ref vault) :

```json
{
  "type": "SFTP",
  "host": "sftp.client.com",
  "port": 22,
  "username": "orchestra",
  "secretRef": "client:abc:import-sftp",
  "remotePath": "/exports/budget/",
  "filePattern": "compta_*.csv",
  "archivePath": "/exports/budget/done/"
}
```

Poll toutes les 15 min ou déclenchement post-cron : télécharger le **fichier le plus récent** matching pattern, idempotence via hash fichier (`lastProcessedFileHash` sur schedule).

**Sécurité** : credentials en env/vault ; jamais en DB clair ; TLS SFTP obligatoire.

## 6.3 Lot 3 — Webhook

`POST /api/budget-imports/webhook/:scheduleToken`

* Token opaque rotatable par schedule.
* Body : multipart file ou URL signée (phase 2).
* Rate limit + IP allowlist optionnelle client.
* Réponse 202 + run id.

---

# 7. UI — Configuration → Imports → Automatisations

Onglet supplémentaire dans le hub RFC-BUD-043 :

| Colonne | Contenu |
|---------|---------|
| Nom | Schedule |
| Profil | Mapping lié |
| Budget | Cible |
| Déclencheur | Cron lisible (« Tous les 5 du mois à 06:00 ») |
| Statut | ACTIVE / PAUSED |
| Dernière exécution | Statut + lien job |
| Prochaine | `nextRunAt` |

Actions : Créer · Pause · Modifier · **Exécuter maintenant** · Supprimer.

Formulaire création (`StariumModal`) :

1. Nom + profil + budget
2. Type déclencheur (cron / SFTP / webhook)
3. Expression cron (helper presets : mensuel, hebdo)
4. Destinataires notification (multi-select users client, libellés email)
5. Options override (mode import, enveloppe défaut)

---

# 8. API

| Méthode | Route | Permission | Description |
|---------|-------|------------|-------------|
| `GET` | `/api/budget-import-schedules` | `budgets.read` | Liste planifications |
| `POST` | `/api/budget-import-schedules` | `budgets.update` | Créer |
| `GET` | `/api/budget-import-schedules/:id` | `budgets.read` | Détail |
| `PATCH` | `/api/budget-import-schedules/:id` | `budgets.update` | Modifier / pause |
| `DELETE` | `/api/budget-import-schedules/:id` | `budgets.update` | Supprimer (soft ou hard) |
| `POST` | `/api/budget-import-schedules/:id/run-now` | `budgets.update` | Déclenchement immédiat |
| `POST` | `/api/budget-imports/queue` | `budgets.update` | Upload + enqueue (lot 1) |
| `POST` | `/api/budget-imports/webhook/:token` | token | Webhook (lot 3) |

---

# 9. Notifications (RFC-038)

| Événement | Canal |
|-----------|-------|
| Job COMPLETED, `errorRows = 0` | Email opt-in + notification in-app |
| Job COMPLETED, `errorRows > 0` | Email warning + alerte `budget_import.partial` |
| Job FAILED | Email + alerte `budget_import.failed` |
| Schedule désactivée après 3 échecs | Alerte admin client |

Template email : nom schedule, budget, compteurs, lien hub historique — **pas** de contenu CSV.

---

# 10. Liste des fichiers à créer / modifier

## Backend

| Fichier | Action |
|---------|--------|
| `apps/api/prisma/schema.prisma` | Schedules + runs + extensions job |
| `apps/api/prisma/migrations/…_rfc_bud_044_import_automation/` | Migration |
| `budget-import-schedules.controller.ts` | **Créer** |
| `budget-import-schedules.service.ts` | **Créer** |
| `budget-import-scheduler.service.ts` | **Créer** — cron nextRun |
| `budget-import-async.service.ts` | **Créer** — enqueue |
| `budget-import.processor.ts` | **Créer** |
| `budget-import.service.ts` | Refactor `executeFromBuffer` |
| `budget-import.module.ts` | Providers + imports QueueModule |
| `apps/api/src/worker/` | Enregistrer processor |
| `docs/API.md` | Nouvelle section |

## Frontend

| Fichier | Action |
|---------|--------|
| `apps/web/src/features/budgets/import-hub/import-automations-tab.tsx` | **Créer** |
| `apps/web/src/features/budgets/api/budget-import-schedules.api.ts` | **Créer** |
| Hub `/budgets/imports` | Onglet Automatisations |

---

# 11. Lots de delivery

| Lot | Livrable |
|-----|----------|
| **A1** | Refactor execute + queue manuelle (`/queue`) + worker + historique async |
| **A2** | CRUD schedules cron + scheduler + UI onglet Automatisations |
| **A3** | Notifications email/alertes |
| **B1** | SFTP poll + staging fichiers |
| **B2** | Webhook + rotation token |
| **B3** | Export symétrique + idempotence hash fichier |

---

# 12. Tests

* Unit : calcul `nextRunAt` (cron, timezone DST).
* Unit : merge `optionsOverride` + mapping.
* Integration : enqueue → worker → job COMPLETED, isolation client.
* Integration : schedule pause → pas de run.
* Integration : webhook token invalide → 401.
* E2E : création schedule UI → run-now → job visible historique.

---

# 13. Points de vigilance

* **Worker obligatoire en prod** : documenter runbook (comme emails RFC-038).
* **Fichiers SFTP mal formés** : échec explicite, pas de demi-import silencieux.
* **Concurrence** : une schedule ne doit pas s’exécuter deux fois en parallèle (lock Redis).
* **Budget verrouillé** entre planification et exécution → job FAILED avec message métier.
* **Coût Redis/BullMQ** : surveiller profondeur queue.
* **RGPD credentials SFTP** : rotation, chiffrement, audit accès secret.

---

# 14. Conformité by design

## RGPD

* Fichiers SFTP : minimisation — traiter puis archiver/supprimer selon rétention client (défaut 30 jours staging chiffré).
* Notifications : emails aux destinataires explicitement configurés.
* Logs : hash fichier OK, pas de lignes métier.

## RGAA

* Formulaire schedule : labels, erreurs cron invalides explicites.
* Statuts run : texte + icône.
* Onglet Automatisations : même stratégie mobile que RFC-BUD-043.

## Design System

* Réutilisation hub RFC-BUD-043, `StariumModal`, `FilterBar`, badges statut.
* Presets cron en chips sélectionnables.

## Sécurité

* Webhook token ≥ 32 octets aléatoires, rotatable.
* SFTP secrets hors repo ; `secretRef` uniquement.
* Execute headless : scope client strict ; pas d’élévation permissions.
* Rate limit webhook et `/queue`.

## Interface mobile

* Liste schedules en cartes ; formulaire cron simplifié (presets d’abord).

---

# 15. Références

* [RFC-018 — Budget Data Import](./RFC-018%20%E2%80%94%20Budget%20Data%20Import.md)
* [RFC-BUD-043 — Centre de gestion](./RFC-BUD-043%20%E2%80%94%20Import%20budg%C3%A9taire%20CSV%20Excel%20%E2%80%94%20centre%20de%20gestion.md)
* [RFC-038 — Socle alertes](./RFC-038%20%E2%80%94%20Socle%20alertes%20et%20emails%20async.md)
* [RFC-BUD-041 §3.7](./RFC-BUD-041%20%E2%80%94%20Ajouts%20structurels%20en%20cours%20d'exercice%20et%20gouvernance%20pr%C3%A9visionnel-atterrissage.md)
* Pattern worker : `apps/api/src/modules/email/email.processor.ts`
