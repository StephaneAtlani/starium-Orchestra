# RFC-PROJ-INT-010 — Provisioning Teams et canaux par défaut

## Statut

**Implémenté (MVP Teams)** — lots 1 à 4 livrés (2026-07-17) : Team + canaux template uniquement.

**Planifié (lot 5)** — provisioning **modulaire** : l’utilisateur coche explicitement chaque brique M365 à créer (Planner, dossier documents, sync tâches) en plus de la Team ; voir §3.4, §6.3–6.4, §8.2–8.3, §12.

## Priorité

Haute

## Dépend de

* [RFC-PROJ-INT-001](./RFC-PROJ-INT-001%20—%20Intégration%20Microsoft%20365.md) — cadrage M365 (exclusions MVP levées par cette RFC)
* [RFC-PROJ-INT-002](./RFC-PROJ-INT-002%20—%20Prisma%20Schema%20Microsoft.md) — `MicrosoftConnection`, `ProjectMicrosoftLink`
* [RFC-PROJ-INT-004](./RFC-PROJ-INT-004%20—%20Microsoft%20Graph%20Service.md) — transport Graph v1.0
* [RFC-PROJ-INT-005](./RFC-PROJ-INT-005%20—%20Connexion%20client%20Microsoft.md) — connexion client active
* [RFC-PROJ-INT-007](./RFC-PROJ-INT-007%20—%20Lien%20projet%20Microsoft.md) — persistance du lien projet
* [RFC-PROJ-OPT-001](./RFC-PROJ-OPT-001%20—%20Project%20Options.md) — UI options projet (onglet Microsoft 365)
* [RFC-PROJ-017](./RFC-PROJ-017%20—%20Étiquettes%20du%20portefeuille%20projets.md) — pattern référentiel client sous `/projects/options`

## Objectif

Permettre, **lorsque la connexion Microsoft 365 du client est active**, de **provisionner un espace collaboratif Microsoft** pour un projet — **à la création du projet** ou **à la demande pendant sa vie** — avec des **canaux par défaut configurables** dans les **options du module Projets** (`/projects/options`).

**Règle produit** : rien n’est créé côté Microsoft sans **case cochée** par l’utilisateur. Au minimum : équipe Teams (+ canaux template). En option, cochées indépendamment : **plan Planner**, **préparation dossier documents** (drive du canal), **activation sync tâches** (nécessite Planner).

Starium reste la source de vérité métier ; Microsoft Teams / Planner sont des espaces provisionnés depuis Starium, pas l’inverse.

---

# 1. Analyse de l’existant

## 1.1 Intégration Microsoft actuelle

| Élément | État | Limite pour ce besoin |
|--------|------|------------------------|
| `MicrosoftConnection` | ✅ Implémenté | Connexion OAuth déléguée par client |
| `ProjectMicrosoftLink` | ✅ Implémenté | Liaison manuelle team / canal / plan existants |
| `GET /api/microsoft/teams` + canaux + plans | 🟡 Partiel (RFC-INT-006) | **Lecture** seule — pas de création |
| Page `/projects/[projectId]/options` | ✅ Implémenté | Sélection manuelle INT-007 + provisioning Teams INT-010 |
| Page `/projects/options` | ✅ Implémenté | Référentiels tags, catégories portefeuille, **Équipes Microsoft** (settings + canaux) |
| Création projet `POST /api/projects` | ✅ Implémenté | Champ optionnel `provisionMicrosoftTeams` (opt-in, ignoré si feature désactivée) |

## 1.2 Exclusions historiques (à lever)

[RFC-PROJ-INT-001](./RFC-PROJ-INT-001%20—%20Intégration%20Microsoft%20365.md) et [RFC-PROJ-OPT-001](./RFC-PROJ-OPT-001%20—%20Project%20Options.md) excluaient explicitement :

* création automatique d’une Team
* création automatique d’un canal Teams
* provisioning Microsoft

Cette RFC **étend le périmètre** de manière cadrée : provisioning **opt-in**, **configurable par client**, **asynchrone**, **traçable**.

## 1.3 Capacités Microsoft Graph (v1.0)

Création d’équipe (asynchrone, souvent `202 Accepted`) :

* `POST /teams` — équipe complète avec canaux initiaux possibles dans le corps
* ou `POST /groups` puis `POST /teams` avec `group@odata.bind` (recommandé Microsoft pour membres/owners)

Création de canaux supplémentaires :

* `POST /teams/{team-id}/channels`

Permissions déléguées typiques : `Group.ReadWrite.All`, `Team.Create` (ou équivalent consenti), `Channel.Create`.

> **Contrainte** : l’utilisateur déclencheur doit disposer des droits M365 suffisants dans le tenant. Starium ne contourne pas les politiques Teams du client.

## 1.4 Conclusion analyse

Le socle de liaison projet ↔ Teams existe ; il manque :

1. un **référentiel client** de canaux par défaut + règles de nommage d’équipe ;
2. un **service de provisioning** Graph ;
3. des **points d’entrée** création projet + options projet ;
4. un **suivi d’état** asynchrone et des audits.

---

# 2. Hypothèses

| # | Hypothèse | Impact si fausse |
|---|-----------|------------------|
| H1 | Une **connexion Microsoft active** par client suffit au MVP | Prévoir sélection de connexion si multi-connexion future |
| H2 | Le token **OAuth délégué** de l’utilisateur peut créer des Teams | Basculer vers permissions **application** + admin consent (hors MVP) |
| H3 | Le canal **« Général »** est toujours créé par Microsoft | Ne pas recréer « Général » ; le canal principal de sync est ce canal ou un canal template marqué `isPrimary` |
| H4 | La création Planner est **opt-in** (case utilisateur), jamais implicite | Si non cochée : `plannerPlanId` reste `null` ; rattachement manuel INT-007 possible |
| H5 | L’ajout automatique des membres projet dans la Team est **phase 2** | MVP : **aucun** membre/propriétaire Starium ajouté ; propriétaire Teams effectif = identité OAuth déléguée active ; `triggeredByUserId` = trace Starium uniquement |
| H6 | Le nom d’équipe Teams est dérivé du projet (`code`, `name`) via un **modèle configurable** | Ajuster le modèle côté options client |

---

# 3. Périmètre

## 3.1 Livré (MVP — lots 1 à 4)

* Référentiel client **canaux Teams par défaut** (CRUD, ordre, libellés métier).
* Paramètres client : activation du provisioning, modèle de nom d’équipe, proposition à la création projet.
* **Provisioning à la création** du projet : case unique **« Créer l’équipe Microsoft Teams »** (décochée par défaut).
* **Provisioning à la demande** depuis l’onglet Microsoft 365 des options projet.
* Création Graph : équipe Teams + canaux template (`standard` uniquement).
* Mise à jour / création de `ProjectMicrosoftLink` avec `teamId`, `teamName`, `channelId`, `channelName` (canal principal).
* `plannerPlanId`, `filesDriveId`, `syncTasksEnabled`, `syncDocumentsEnabled` laissés à **`null` / `false`** après provisioning (pas de Planner ni fichiers auto).
* Opération **asynchrone** (`PENDING` → `IN_PROGRESS` → `COMPLETED` \| `FAILED` \| `PARTIAL`).
* Audit logs ; UI `/projects/options`, création projet, carte Teams options projet.
* Cohabitation **INT-007** (rattachement manuel conservé).

## 3.2 Exclus (tous lots)

* Ajout automatique de **tous les membres** de l’équipe projet Starium dans la Team M365.
* Canaux **privés** ou **partagés** (`membershipType` ≠ `standard`).
* Suppression / archivage automatique de la Team à la clôture projet.
* Webhooks Graph de suivi fin de provisioning (polling / job interne suffisant).
* Permissions Microsoft par ressource Starium.
* Création Planner **sans** case utilisateur explicite (interdit).

## 3.3 Évolutions futures (hors lot 5)

* Mapping membres projet → membres Team (RFC-TEAM-001).
* Templates différenciés par catégorie portefeuille ou type projet.
* Mode **application** (service principal) pour clients sans droits utilisateur individuel.
* Suffixe auto sur nom d’équipe dupliqué côté tenant M365.

## 3.4 Planifié (lot 5) — provisioning modulaire

Lors du déclenchement (création projet ou options projet), l’utilisateur choisit **explicitement** les briques à provisionner :

| Case UI | Effet backend (si cochée) | Dépendances |
|---------|---------------------------|-------------|
| **Créer l’équipe Teams** (+ canaux template) | `POST /teams` + canaux ; lien `teamId` / `channelId` | Case maîtresse ; aucune autre case sans elle |
| **Créer un plan Planner** | `POST /planner/plans` (ou API Graph équivalente) ; `plannerPlanId` + `plannerPlanTitle` sur le lien | Team créée (étape 1 du job) |
| **Préparer le dossier documents** | Résolution `filesDriveId` du canal principal ; création dossier `starium-project-{projectId}` ; `syncDocumentsEnabled=true` | Canal principal connu |
| **Activer la sync des tâches** | `syncTasksEnabled=true` sur le lien | **Planner coché** (validation DTO + UI désactivée sinon) |

Règles :

* Toutes les cases **décochées par défaut** (y compris Teams).
* Aucune ressource Microsoft créée pour une option non cochée.
* Échec d’une option cochée → `PARTIAL` si Team + canal OK ; détail par étape dans le run (sans DCP en clair).
* Options cochées **persistées sur le run** (`ProjectMicrosoftTeamsProvisioning`) pour retry idempotent.

---

# 4. Modèle métier

## 4.1 Concepts

| Concept | Rôle |
|--------|------|
| `ProjectMicrosoftTeamsProvisioningSettings` | Configuration **client** : feature on/off, modèle de nom, canal principal par défaut |
| `ProjectMicrosoftTeamsChannelTemplate` | Ligne de référentiel : nom canal, description, ordre, favori |
| `ProjectMicrosoftTeamsProvisioning` | Exécution de provisioning **par projet** (historique + état courant) |
| Canal principal | Canal utilisé pour `channelId` du `ProjectMicrosoftLink` et sync documents (RFC-INT-009) |

## 4.2 Règles métier

1. **Scope client** : toute configuration et exécution filtrée par `clientId` actif ; jamais de `clientId` en body.
2. **Prérequis** : `MicrosoftConnection` `ACTIVE` pour le client ; projet appartenant au client.
3. **Idempotence** : si `ProjectMicrosoftLink.teamId` déjà renseigné → refus explicite (`409`) sauf action `force=false` par défaut.
4. **Un provisioning actif** par projet à la fois (`IN_PROGRESS` → refus `409`).
5. **Nom d’équipe** : résolu côté backend à partir du modèle et des champs projet (`{{code}}`, `{{name}}`, `{{ownerName}}` — liste fermée documentée).
6. **Canaux template** : créés **après** disponibilité de la Team ; ignorer un template dont le `displayName` existe déjà (idempotent).
7. **Échec partiel** : Team créée mais canaux en erreur → statut `PARTIAL` + détail par canal ; lien projet enregistré si Team + canal principal OK.
8. **Échec total** : projet Starium **inchangé** (pas de rollback projet) ; statut provisioning `FAILED` + message exploitable.
9. **Permissions** : `projects.update` pour déclencher ; `projects.read` pour consulter état ; référentiel options : `projects.update`.
10. **Opt-in création** : toutes les cases décochées par défaut même si feature client activée (éviter créations involontaires).
11. **Modularité (lot 5)** : le backend exécute **uniquement** les étapes correspondant aux booléens demandés ; pas de Planner / fichiers / sync si non cochés.
12. **Dépendance sync tâches** : `enableTasksSync=true` refuse si `createPlannerPlan=false` (400 métier).
13. **Ordre d’exécution job** : Team → canaux → (si coché) Planner → (si coché) drive + dossier → upsert `ProjectMicrosoftLink` avec flags sync selon cases.
14. **Retry** : un retry reprend les étapes manquantes selon les mêmes flags persistés sur le run (pas de nouvelles ressources pour options décochées).

---

# 5. Modifications Prisma

## 5.1 Enum

```prisma
enum ProjectMicrosoftTeamsProvisioningStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  PARTIAL
  FAILED
}
```

## 5.2 Settings client (1:1 avec Client)

```prisma
model ProjectMicrosoftTeamsProvisioningSettings {
  id        String   @id @default(cuid())
  clientId  String   @unique
  isEnabled Boolean  @default(false)

  /// Modèle : "{{code}} — {{name}}" (max 50 car. après résolution — tronquer avec règle documentée)
  teamNameTemplate String @default("{{code}} — {{name}}")

  /// Description équipe Teams (optionnelle)
  teamDescriptionTemplate String?

  /// Si true, proposition case à cocher à la création projet
  offerOnProjectCreate Boolean @default(false)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  client           Client @relation(fields: [clientId], references: [id], onDelete: Cascade)
  channelTemplates ProjectMicrosoftTeamsChannelTemplate[]
}
```

## 5.3 Templates de canaux

```prisma
model ProjectMicrosoftTeamsChannelTemplate {
  id         String @id @default(cuid())
  clientId   String
  settingsId String

  displayName         String  /// libellé métier affiché (max 50 car. Graph)
  description         String?
  sortOrder           Int     @default(0)
  isPrimary           Boolean @default(false) /// canal principal pour ProjectMicrosoftLink

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  client   Client @relation(fields: [clientId], references: [id], onDelete: Cascade)
  settings ProjectMicrosoftTeamsProvisioningSettings @relation(fields: [settingsId], references: [id], onDelete: Cascade)

  @@unique([clientId, displayName])
  @@index([clientId])
  @@index([settingsId, sortOrder])
}
```

> **Règle** : au plus **un** `isPrimary=true` par client ; validation service. Si aucun, le canal **Général** Microsoft est le canal principal.

## 5.4 Exécution provisioning (par projet) — implémenté

Modèle livré (simplifié ; voir `schema.prisma`) :

```prisma
model ProjectMicrosoftTeamsProvisioning {
  id                    String @id @default(cuid())
  clientId              String
  projectId             String
  microsoftConnectionId String?
  triggeredByUserId     String?
  status                ProjectMicrosoftTeamsProvisioningStatus @default(PENDING)
  teamDisplayName       String
  teamDescription       String?
  graphCreateRequestedAt DateTime?
  graphOperationUrl     String?
  graphContentLocation  String?
  microsoftTeamId       String?
  teamWebUrl            String?
  retryCount            Int @default(0)
  errorCode             String?
  errorMessage          String?
  // … résolution UNKNOWN, version, heartbeat, jobId — voir migration 20260717100000
  @@index([clientId, projectId, createdAt])
}
```

Index partiel SQL (migration explicite) : un seul run `PENDING|IN_PROGRESS` par `(clientId, projectId)`.

## 5.5 Extension lot 5 — options demandées par l’utilisateur

Ajouter sur `ProjectMicrosoftTeamsProvisioning` (migration dédiée) :

```prisma
  /// Options cochées au déclenchement — seules ces étapes sont exécutées
  requestCreateTeam           Boolean @default(true)   /// case maîtresse Teams
  requestCreatePlannerPlan    Boolean @default(false)
  requestSetupDocumentsFolder Boolean @default(false)
  requestEnableTasksSync    Boolean @default(false)

  /// Résultats optionnels (remplis si étape réussie)
  microsoftPlannerPlanId    String?
  plannerPlanTitle          String?
  filesDriveId              String?
  filesFolderId             String?
```

Validation service : `requestEnableTasksSync` ⇒ `requestCreatePlannerPlan` ; `requestCreatePlannerPlan` / `requestSetupDocumentsFolder` / `requestEnableTasksSync` ⇒ `requestCreateTeam`.

DTO partagé `ProvisionMicrosoftTeamsOptionsDto` :

```typescript
{
  createTeam?: boolean;           // défaut false si absent sur création projet
  createPlannerPlan?: boolean;    // défaut false
  setupDocumentsFolder?: boolean; // défaut false
  enableTasksSync?: boolean;        // défaut false
}
```

## 5.5 Extension `ProjectMicrosoftLink` (optionnelle mais recommandée)

Ajouter pour éviter requêtes croisées :

```prisma
provisionedAt DateTime?
provisioningId String? /// FK vers dernière exécution réussie ou en cours
```

Relations `Client` : ajouter les collections correspondantes.

---

# 6. API backend

Namespace existant `microsoft` + `projects/options`. Toutes les routes : `JwtAuthGuard`, `ActiveClientGuard`, `ModuleAccessGuard`, `PermissionsGuard`.

## 6.1 Référentiel client — settings

| Méthode | Ressource | Permission | Description |
|---------|-----------|------------|-------------|
| GET | `/api/projects/options/microsoft-teams-provisioning` | `projects.read` | Settings + canaux ordonnés (création settings par défaut si absent) |
| PUT | `/api/projects/options/microsoft-teams-provisioning` | `projects.update` | Mise à jour settings (sans `clientId`) |

Corps PUT (exemple) :

```json
{
  "isEnabled": true,
  "teamNameTemplate": "{{code}} — {{name}}",
  "teamDescriptionTemplate": "Espace collaboratif du projet {{name}}",
  "offerOnProjectCreate": true
}
```

## 6.2 Référentiel client — canaux template

| Méthode | Ressource | Permission |
|---------|-----------|------------|
| POST | `/api/projects/options/microsoft-teams-channels` | `projects.update` |
| PATCH | `/api/projects/options/microsoft-teams-channels/:channelTemplateId` | `projects.update` |
| DELETE | `/api/projects/options/microsoft-teams-channels/:channelTemplateId` | `projects.update` |
| PUT | `/api/projects/options/microsoft-teams-channels/reorder` | `projects.update` |

Corps POST canal :

```json
{
  "displayName": "Pilotage",
  "description": "COPIL, arbitrages et décisions",
  "isPrimary": false
}
```

Validation : `displayName` 1–50 caractères ; unicité par client ; un seul `isPrimary`.

## 6.3 Provisioning projet

| Méthode | Ressource | Permission | Description |
|---------|-----------|------------|-------------|
| POST | `/api/projects/:projectId/microsoft-teams/provision` | `projects.update` | Démarre provisioning (async, file BullMQ) |
| GET | `/api/projects/:projectId/microsoft-teams/provision` | `projects.read` | Dernier run du projet ou `null` |
| POST | `/api/projects/:projectId/microsoft-teams/provision/:provisioningId/retry` | `projects.update` | Relance un run `FAILED` ou `PARTIAL` |
| POST | `/api/projects/:projectId/microsoft-teams/provision/:provisioningId/resolve-unknown` | `projects.update` | Résolution manuelle si issue Graph incertaine (`TEAM_CREATION_OUTCOME_UNKNOWN`) |

Guards provisioning projet : `JwtAuthGuard`, `ActiveClientGuard`, `ModuleAccessGuard`, `PermissionsGuard`, `MicrosoftIntegrationAccessGuard`, `ResourceAccessDecisionGuard` + `@RequireAccessIntent({ module: 'projects', intent: 'read|write' })`.

Corps POST provision (**lot 5** — aujourd’hui corps vide = Teams seul, équivalent `createTeam: true` seul) :

```json
{
  "options": {
    "createTeam": true,
    "createPlannerPlan": false,
    "setupDocumentsFolder": false,
    "enableTasksSync": false
  }
}
```

Comportement job :

1. Toujours (si `createTeam`) : Team + canaux template → `teamId`, `channelId`, noms.
2. Si `createPlannerPlan` : création plan lié à la Team → `plannerPlanId`, `plannerPlanTitle`.
3. Si `setupDocumentsFolder` : drive du canal + dossier `starium-project-{projectId}` → `filesDriveId` ; `syncDocumentsEnabled=true`.
4. Si `enableTasksSync` : `syncTasksEnabled=true` (Planner requis).
5. Upsert `ProjectMicrosoftLink` avec uniquement les champs des étapes réussies ; sync flags selon cases.

**MVP actuel** : étapes 2–4 **non exécutées** ; lien avec `plannerPlanId=null`, `syncTasksEnabled=false`, `syncDocumentsEnabled=false`.

Réponse POST provision (MVP : **200** avec le run créé) :

```json
{
  "id": "…",
  "status": "PENDING",
  "teamDisplayName": "PRJ-001 — Mon projet",
  "microsoftTeamId": null,
  "errorCode": null
}
```

## 6.4 Création projet (extension)

`POST /api/projects` — champs optionnels :

**MVP livré** (booléen simple) :

```json
{
  "provisionMicrosoftTeams": false
}
```

Équivalent lot 5 : `provisionMicrosoftTeams: true` ⇒ `options.createTeam: true` uniquement (pas de Planner / fichiers / sync).

**Lot 5** — objet recommandé (remplace le booléen ou le complète) :

```json
{
  "microsoftProvisioning": {
    "createTeam": true,
    "createPlannerPlan": true,
    "setupDocumentsFolder": true,
    "enableTasksSync": false
  }
}
```

Comportement :

* ignoré si settings client `isEnabled=false` ou connexion M365 inactive ;
* si aucune option à `true` : pas de run provisioning ;
* si au moins une option : créer projet puis enfiler provisioning avec flags persistés sur le run ;
* validation : `enableTasksSync` sans `createPlannerPlan` → **400**.

## 6.5 Connexion Microsoft (lecture pour UI)

Réutiliser `GET /api/microsoft/connection` — la UI masque le provisioning si statut ≠ `ACTIVE`.

---

# 7. Service backend — logique provisioning

## 7.1 Fichiers à créer / modifier

### Backend — nouveau

```
apps/api/src/modules/microsoft/
├── project-microsoft-teams-provisioning.service.ts
├── project-microsoft-teams-provisioning.controller.ts
├── project-microsoft-teams-template.service.ts
├── project-microsoft-teams-template.controller.ts
├── dto/
│   ├── update-teams-provisioning-settings.dto.ts
│   ├── create-teams-channel-template.dto.ts
│   ├── update-teams-channel-template.dto.ts
│   ├── reorder-teams-channel-templates.dto.ts
│   └── resolve-project-microsoft-teams-provisioning.dto.ts
├── project-microsoft-teams-provisioning.processor.ts
└── tests/
    ├── project-microsoft-teams-provisioning.service.spec.ts
    └── project-microsoft-teams-template.service.spec.ts

apps/api/src/modules/projects/
├── dto/create-project.dto.ts                    # + provisionMicrosoftTeams?
└── projects.service.ts                          # hook post-create
```

### Backend — modifier

```
apps/api/src/modules/microsoft/microsoft-graph.service.ts   # createTeam, createChannel, poll async op
apps/api/src/modules/microsoft/microsoft.module.ts
apps/api/src/modules/microsoft/project-microsoft-links.service.ts  # helper upsert après provision
apps/api/prisma/schema.prisma
```

### Frontend — nouveau / modifier

```
apps/web/src/features/projects/options/
├── api/microsoft-teams-provisioning-settings.api.ts
├── components/microsoft-teams-provisioning-settings.tsx
├── api/project-microsoft-teams-provisioning.ts
└── hooks/use-project-microsoft-teams-provisioning-query.ts

apps/web/src/features/projects/
├── components/project-create-form.tsx           # case à cocher
└── options/components/microsoft-teams-card.tsx  # bouton Créer l'équipe + statut

apps/web/src/app/(protected)/projects/options/page.tsx  # section référentiel
```

## 7.2 Algorithme (résumé)

```
1. Valider client, projet, connexion M365, settings.isEnabled, pas de teamId existant
2. Créer ProjectMicrosoftTeamsProvisioning (PENDING) avec flags request* selon options utilisateur
3. Si requestCreateTeam :
   a. Résoudre teamName depuis template + projet (troncature 50 car.)
   b. Graph POST /teams (displayName, description?, visibility private)
   c. Poll jusqu’à teamId disponible (backoff max 5 min)
   d. Canaux template + canal principal
4. Si requestCreatePlannerPlan (lot 5) :
   a. Graph POST plan Planner pour la Team
   b. Persister plannerPlanId / plannerPlanTitle
5. Si requestSetupDocumentsFolder (lot 5) :
   a. Résoudre filesDriveId du canal principal (Graph channel files folder)
   b. Créer dossier starium-project-{projectId} si absent
6. Upsert ProjectMicrosoftLink :
   - champs Team/Planner/drive selon étapes réussies
   - syncTasksEnabled / syncDocumentsEnabled selon flags cochés ET étapes OK
7. Marquer COMPLETED ou PARTIAL ; audit ; UI polling GET status
```

**MVP actuel** : étapes 4–5 absentes ; étape 6 force sync à `false`.

Erreurs Graph : mapper en messages métier français (permissions insuffisantes, nom dupliqué, throttling).

## 7.3 Permissions Graph à documenter

Étendre le consentement OAuth client (RFC-INT-003 / INT-005) :

* `Team.Create`, `Channel.Create` — **livré**
* `Tasks.ReadWrite` — requis si création Planner (lot 5 ; déjà dans scopes par défaut)
* Conserver : `Group.Read.All`, `Files.ReadWrite.All`, …

Graph lot 5 (à ajouter dans `MicrosoftGraphService`) :

* `createPlannerPlanForTeam` — `POST /planner/plans` (payload : titre dérivé du projet, lien Team)
* `getChannelFilesFolder` — drive / folder du canal principal pour `filesDriveId`
* Réutiliser `ensureFolderUnderDriveRoot` (RFC-INT-009) pour `starium-project-{projectId}`

Spike Graph (`POST /teams` vs `POST /groups` + bind, permissions déléguées) : **reporté** — ne pas bloquer le démarrage ; hypothèses H1–H2 et endpoints documentés Microsoft Learn servent de base ; ajuster en implémentation si le tenant de test contredit.

---

# 8. UX frontend

## 8.1 Options module — `/projects/options`

Nouvelle section **« Équipes Microsoft »** (après catégories / étiquettes) :

* interrupteur **Activer la création d’équipes Teams pour les projets** ;
* champ **Modèle de nom d’équipe** (aide : variables `{{code}}`, `{{name}}`) ;
* description équipe (optionnel) ;
* case **Proposer à la création de projet** ;
* tableau des **canaux par défaut** : nom, description, principal, ordre (flèches) ;
* état vide : canaux suggérés en exemple (non persistés) — ex. « Pilotage », « Exécution », « Documentation ».

Afficher un bandeau si M365 non connecté → lien vers paramètres client Microsoft.

## 8.2 Création projet

Si `settings.isEnabled && offerOnProjectCreate && connection ACTIVE` :

**MVP livré** : une case **« Créer l’équipe Microsoft Teams »** (décochée par défaut).

**Lot 5** — panneau **« Espace Microsoft 365 »** (cases imbriquées, toutes décochées par défaut) :

```
☐ Créer l’équipe Microsoft Teams (+ canaux configurés)
    ☐ Créer un plan Planner
    ☐ Préparer le dossier documents (sync fichiers Starium → Teams)
    ☐ Activer la synchronisation des tâches   [désactivé si Planner non coché]
```

* Labels + `<label htmlFor>` sur chaque case ; aide contextuelle sous le groupe.
* Soumission : envoyer uniquement les booléens cochés (pas de provisioning si tout décoché).
* Après submit : toast + lien options projet si run actif.

## 8.3 Options projet — onglet Microsoft 365

Carte Teams enrichie :

* si pas de `teamId` : bouton **« Créer l’équipe Teams »** → **lot 5** : ouvrir un dialogue avec les **mêmes cases** que §8.2 (pas de provisioning sans choix explicite) ;
* **MVP livré** : POST provision sans body (Teams seul) ;
* si provisioning en cours : badge + polling statut (`aria-live="polite"`) ;
* si terminé : afficher `teamName`, lien `teamWebUrl` (nouvel onglet), canal principal ;
* si échec : alerte + bouton réessayer (si pas de teamId).

Conserver le flux existant **« Configurer »** (sélection manuelle) pour les clients qui n’utilisent pas le provisioning.

## 8.4 Règle affichage

Toujours **libellés métier** (`teamName`, `displayName`) — jamais UUID seul en UI.

---

# 9. Audit logs

Écrits dans les **services** :

| Action | Déclencheur |
|--------|-------------|
| `project.microsoft_teams.settings.updated` | PUT settings |
| `channel_template.created` | POST canal |
| `channel_template.updated` | PATCH canal / reorder |
| `channel_template.deleted` | DELETE canal |
| `provision.started` | POST provision / retry |
| `provision.completed` | succès COMPLETED |
| `provision.partial` | PARTIAL |
| `provision.failed` | FAILED |
| `provision.unknown_resolved` | POST resolve-unknown |

Payload audit : `projectId`, `provisioningId`, `microsoftTeamId` (pas de token).

---

# 10. Tests

## 10.1 Unitaires (service provisioning)

* Refus si projet hors client actif.
* Refus si pas de connexion M365.
* Refus si `teamId` déjà présent sur le lien.
* Refus si provisioning `IN_PROGRESS` existant.
* Résolution template nom : `{{code}} — {{name}}` → troncature 50 car.
* Idempotence canaux : template « Pilotage » non recréé si existe.
* Échec Graph → statut `FAILED`, projet intact.
* Succès → `ProjectMicrosoftLink` mis à jour, champs dénormalisés.
* **Lot 5** : si Planner coché mais Graph refuse → `PARTIAL`, Team conservée, `plannerPlanId` null.
* **Lot 5** : `enableTasksSync` sans `createPlannerPlan` → rejet validation.
* Un seul `isPrimary` par client — rejet validation.

## 10.2 Unitaires (template service)

* CRUD canaux scopé client.
* DELETE cascade cohérent.
* Réordonnancement.

## 10.3 Controller / intégration

* `POST provision` → `202` + enfilage job.
* Création projet avec `provisionMicrosoftTeams=true` → provisioning créé.
* Isolation inter-client sur toutes les routes.

## 10.4 Frontend

* Options : CRUD canaux, désactivation si pas M365 ; lecture seule sans `projects.update`.
* Création projet : cases visibles / masquées selon settings ; **lot 5** : sous-cases Planner / fichiers / sync.
* Carte Teams : états loading / empty / error / in progress ; dialogue options sur provisioning à la demande.

---

# 11. Critères d’acceptation

## 11.1 MVP Teams (livré)

* [x] Un admin client configure des canaux par défaut dans `/projects/options`.
* [x] La feature est désactivable globalement par client (`isEnabled=false` par défaut).
* [x] À la création projet, l’utilisateur peut opt-in la création Teams (si M365 connecté + `offerOnProjectCreate`).
* [x] Depuis les options projet, l’utilisateur peut créer l’équipe a posteriori.
* [x] L’équipe et les canaux configurés sont créés dans M365 (sous réserve des droits tenant).
* [x] `ProjectMicrosoftLink` est renseigné avec team + canal principal.
* [x] Planner / fichiers / sync **non** créés automatiquement sans case dédiée.
* [x] L’état de provisioning est consultable (polling React Query sur runs actifs).
* [x] Aucune fuite inter-client ; pas de `clientId` en body.
* [x] Audits émis sur actions sensibles.
* [x] Échec Microsoft ne supprime ni ne corrompt le projet Starium.
* [x] Flux manuel INT-007 conservé (rattachement équipe existante).

## 11.2 Lot 5 — provisioning modulaire (à livrer)

* [ ] Cases distinctes : Teams, Planner, dossier documents, sync tâches — **toutes décochées par défaut**.
* [ ] Aucune ressource M365 créée pour une option non cochée.
* [ ] Sync tâches impossible sans Planner coché (UI + API).
* [ ] Run persisté avec flags `request*` ; retry respecte les mêmes options.
* [ ] `PARTIAL` si Team OK mais Planner ou dossier en échec ; message exploitable par option.
* [ ] Même panneau de cases à la création projet et au provisioning à la demande (options projet).

---

# 12. Plan de livraison

| Lot | Contenu |
|-----|---------|
| **1 — Data + API template** | Prisma, CRUD settings + canaux, UI `/projects/options` |
| **2 — Service provisioning** | Graph create team/channels (hypothèses doc Microsoft), statuts, audits |
| **3 — Points d’entrée projet** | POST provision, hook création projet, UI options projet |
| **4 — Durcissement** | Tests, messages d’erreur, doc API.md | ✅ livré |
| **5 — Options modulaires** | Cases Planner / fichiers / sync ; Prisma `request*` ; Graph plan + drive ; UI création + dialogue options projet | 🔲 planifié |

> Spike Graph dédié : **hors planning immédiat** (décision produit 2026-07-08).

---

# 13. Récapitulatif

Cette RFC ajoute le **provisioning Microsoft 365 configurable** au socle INT-007 :

* **Configuration** centralisée (canaux par défaut, nommage).
* **Déclenchement** à la création ou en cours de vie projet.
* **Modularité (lot 5)** : l’utilisateur coche Teams, Planner, fichiers, sync tâches — rien d’autre n’est créé.
* **Lien automatique** vers `ProjectMicrosoftLink` pour enchaîner sync tâches/documents (RFC-INT-008/009) **uniquement si demandé**.

---

# 14. Points de vigilance

* **Délai Graph** : création Team asynchrone (jusqu’à plusieurs minutes) — UX non bloquante obligatoire.
* **Quotas / throttling** Graph : backoff et messages clairs.
* **Droits utilisateur** : un chef de projet sans droit de création Teams verra une erreur métier — prévoir message orientant vers admin M365.
* **Noms dupliqués** : politique tenant M365 peut rejeter un displayName déjà pris — suffixe auto ` (2)` optionnel phase 2.
* **Suppression** : désassocier un lien Starium **ne supprime pas** la Team M365 (comportement aligné RFC-INT-007).
* **RGPD** : noms d’équipe / canaux peuvent contenir des données métier ; pas de DCP superflue dans `detailsJson` ni les logs.

---

# 15. Conformité by design

## 15.1 RGPD / Privacy

| Sujet | Traitement |
|-------|------------|
| DCP concernées | Nom/prénom éventuel dans `{{ownerName}}` ; identité de l’utilisateur déclencheur (`triggeredByUserId`) |
| Finalité | Provisionnement d’espaces collaboratif M365 pour projets client |
| Minimisation | Templates sans email ; `detailsJson` technique sans contenu message Teams |
| Rétention | `ProjectMicrosoftTeamsProvisioning` conservé pour traçabilité (durée = politique audit client / 24 mois suggérés) |
| Effacement | Suppression client → cascade Prisma ; Team M365 hors scope Starium (responsabilité admin client) |
| Logs | Pas de token OAuth ; pas d’email en clair dans `lastError` |

## 15.2 RGAA / Accessibilité

* Section options : titres hiérarchiques, labels sur tous les champs de template.
* Tableau canaux : navigation clavier, boutons ≥ 44×44 px.
* Statut provisioning : région `aria-live="polite"` sur changement d’état.
* Lien Teams : libellé explicite (« Ouvrir l’équipe … dans Microsoft Teams »), pas « cliquer ici ».
* Erreurs : texte + icône, pas couleur seule.
* Case création projet : `<label>` associé, annonce du résultat via toast accessible.

## 15.3 Design System

* Réutiliser `Card`, `Switch`, `Button`, `Table`, `Dialog`, `Badge`, `Alert`, `Toast` (shadcn).
* Tokens thème uniquement — pas de couleurs hex en dur.
* États loading (skeleton), empty (message + CTA connexion M365), error (retry).
* Libellés métier partout (noms canaux, équipe).

## 15.4 Sécurité

* Authz : `projects.read` / `projects.update` ; isolation `ActiveClientGuard`.
* DTO + class-validator sur tous les écrits.
* `clientId` jamais depuis le body.
* Tokens Graph uniquement backend chiffré (RFC-INT-003).
* Audit sur provisioning et modification templates.
* Pas d’exposition de `detailsJson` brut sensible au frontend (whitelist champs).

## 15.5 Interface mobile

* Section `/projects/options` : cartes empilées, tableau canaux scroll horizontal contrôlé ou vue cartes < `md`.
* Formulaire création : case Teams pleine largeur, cible tactile ≥ 44 px.
* Options projet : bouton provisioning visible sans hover ; statut lisible sur 320 px.

---

# 16. Annexe — Canaux suggérés (valeurs par défaut UI, non imposées)

Exemple de jeu initial proposé à la première activation (à valider métier) :

| Ordre | Canal | Description | Principal |
|-------|-------|-------------|-----------|
| — | Général | (créé par Microsoft) | oui si aucun autre |
| 1 | Pilotage | COPIL, COPROJ, décisions | non |
| 2 | Exécution | Suivi opérationnel | non |
| 3 | Documentation | Livrables et références | non |

---

# 17. Mise à jour documentation associée

* [x] [docs/API.md](../API.md) — routes `projects/options/microsoft-teams-*`, `projects/:id/microsoft-teams/provision*`, champ `provisionMicrosoftTeams` sur `POST /api/projects`
* [x] [docs/RFC/_RFC Liste.md](./_RFC Liste.md) — entrée RFC-PROJ-INT-010
* [x] [docs/INVENTAIRE-COMPOSANTS.md](../INVENTAIRE-COMPOSANTS.md) — composants UI
* [x] [docs/ARCHITECTURE.md](../ARCHITECTURE.md) — module `microsoft` (provisioning Teams)

---

# 18. Implémentation — écarts et suites

## 18.1 Livré

* Migration Prisma `20260717100000_project_microsoft_teams_provisioning` avec **index partiels uniques** SQL (`one_primary_per_client`, `one_active_run_per_project`).
* Services : `ProjectMicrosoftTeamsTemplateService`, `ProjectMicrosoftTeamsProvisioningService` ; worker `ProjectMicrosoftTeamsProvisioningProcessor` (BullMQ).
* Graph : `createTeam`, `pollAsyncOperation`, `createTeamChannel`, `listTeamChannels`, `getTeam` ; scopes `Team.Create`, `Channel.Create`.
* UI : `/projects/options` (section Équipes Microsoft), création projet (case opt-in), options projet (carte Teams + retry/resolve).

## 18.2 Écarts documentés (MVP acceptés)

| Sujet | RFC initiale | Implémentation |
|-------|--------------|----------------|
| `offerOnProjectCreate` | défaut `true` | défaut **`false`** |
| Réponse POST provision | `202 Accepted` | **200** avec DTO run |
| Audits canaux / provision | préfixe long | codes courts `channel_template.*` / `provision.*` |
| Composants FE canaux | table + dialog dédiés | formulaire intégré `microsoft-teams-provisioning-settings.tsx` |
| `aria-live` sur statut provisioning | exigé | **à densifier** |

## 18.3 Lot 5 — non livré (spec §3.4)

| Capacité | Statut code |
|----------|-------------|
| Cases UI Planner / fichiers / sync tâches | ❌ |
| DTO `microsoftProvisioning` / `options` sur POST provision | ❌ |
| Champs Prisma `requestCreatePlannerPlan`, etc. | ❌ |
| Graph `createPlannerPlan`, résolution `filesDriveId` canal | ❌ |
| Job : étapes conditionnelles + sync flags sur lien | ❌ |

Comportement actuel si `provisionMicrosoftTeams: true` : **Team + canaux uniquement** ; Planner et fichiers restent manuels (INT-007).

## 18.4 Autres suites

* Tests controller / intégration cross-client.
* Tests FE intégrés (création projet + options modulaires).
* Suffixe auto nom d’équipe dupliqué tenant M365.
* `aria-live="polite"` explicite sur carte Teams.
