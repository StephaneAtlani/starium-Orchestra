# RFC-PROJ-INT-010 — Provisioning Teams et canaux par défaut

## Statut

**Implémenté (MVP)** — lots 1 à 4 livrés (2026-07-17) ; voir §18 pour écarts documentés et suites possibles.

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

Permettre, **lorsque la connexion Microsoft 365 du client est active**, de **créer automatiquement une équipe Teams** pour un projet — **à la création du projet** ou **à la demande pendant sa vie** — avec des **canaux par défaut configurables** dans les **options du module Projets** (`/projects/options`).

Starium reste la source de vérité métier ; Microsoft Teams est un espace collaboratif provisionné depuis Starium, pas l’inverse.

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
| H4 | La création Planner automatique reste **hors scope** de cette RFC | L’utilisateur lie un plan existant via RFC-INT-007 après provisioning |
| H5 | L’ajout automatique des membres projet dans la Team est **phase 2** | MVP : **aucun** membre/propriétaire Starium ajouté ; propriétaire Teams effectif = identité OAuth déléguée active ; `triggeredByUserId` = trace Starium uniquement |
| H6 | Le nom d’équipe Teams est dérivé du projet (`code`, `name`) via un **modèle configurable** | Ajuster le modèle côté options client |

---

# 3. Périmètre

## 3.1 Inclus (MVP)

* Référentiel client **canaux Teams par défaut** (CRUD, ordre, libellés métier).
* Paramètres client : activation du provisioning, modèle de nom d’équipe, canal principal pour la sync documentaire.
* **Provisioning à la création** du projet (opt-in par case à cocher, visible si M365 connecté + feature activée côté client).
* **Provisioning à la demande** depuis l’onglet Microsoft 365 des options projet.
* Création Graph : équipe Teams + canaux template (type `standard` uniquement au MVP).
* Mise à jour / création de `ProjectMicrosoftLink` avec `teamId`, `teamName`, `channelId`, `channelName` (canal principal).
* Opération **asynchrone** avec statut (`PENDING` → `IN_PROGRESS` → `COMPLETED` \| `FAILED` \| `PARTIAL`).
* Audit logs des actions sensibles.
* UI `/projects/options` + extension formulaire création + carte Teams options projet.

## 3.2 Exclus (MVP)

* Création automatique d’un **plan Planner** (reste manuel, RFC-INT-007).
* Ajout automatique de **tous les membres** de l’équipe projet Starium dans la Team M365.
* Canaux **privés** ou **partagés** (`membershipType` ≠ `standard`).
* Suppression / archivage automatique de la Team à la clôture projet.
* Webhooks Graph de suivi fin de provisioning (polling / job interne suffisant au MVP).
* Permissions Microsoft par ressource Starium.

## 3.3 Évolutions futures (hors MVP)

* Provisioning Planner + dossier documentaire en une action.
* Mapping membres projet → membres Team (avec résolution annuaire RFC-TEAM-001).
* Templates différenciés par catégorie portefeuille ou type projet.
* Mode **application** (service principal) pour clients sans droits utilisateur individuel.

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
10. **Opt-in création** : case décochée par défaut même si feature client activée (éviter créations involontaires).

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

## 5.4 Exécution provisioning (par projet)

```prisma
model ProjectMicrosoftTeamsProvisioning {
  id        String @id @default(cuid())
  clientId  String
  projectId String

  status            ProjectMicrosoftTeamsProvisioningStatus @default(PENDING)
  triggeredByUserId String?

  resolvedTeamName  String?
  microsoftTeamId   String?
  primaryChannelId  String?
  primaryChannelName String?
  teamWebUrl        String?

  channelsRequested Int @default(0)
  channelsCreated   Int @default(0)
  lastError         String?
  detailsJson       Json? /// détail par canal / étapes Graph

  startedAt   DateTime?
  completedAt DateTime?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  client  Client  @relation(fields: [clientId], references: [id], onDelete: Cascade)
  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([clientId, projectId])
  @@index([clientId, status])
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

Corps POST provision : **aucun** (MVP). À la fin du job : upsert `ProjectMicrosoftLink` avec `teamId`, `channelId`, noms dénormalisés ; `plannerPlanId` reste `null` (configuration manuelle INT-007 ultérieure).

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

`POST /api/projects` — champ optionnel :

```json
{
  "provisionMicrosoftTeams": false
}
```

Comportement :

* ignoré si settings client `isEnabled=false` ou pas de connexion M365 ;
* si `true` : créer projet puis enfiler provisioning (même service que §6.3) ;
* réponse création projet enrichie optionnelle : `microsoftTeamsProvisioning: { provisioningId, status }`.

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
2. Créer ProjectMicrosoftTeamsProvisioning (PENDING → IN_PROGRESS)
3. Résoudre teamName depuis template + projet (troncature 50 car.)
4. Graph POST /teams (ou group + team) avec displayName, description, visibility private
5. Attendre disponibilité teamId (poll Location / GET team, backoff max 5 min)
6. Lister canaux existants ; déterminer canal principal (isPrimary template ou General)
7. Pour chaque channelTemplate (sortOrder) : POST channel si displayName absent
8. Upsert ProjectMicrosoftLink si demandé
9. Marquer COMPLETED ou PARTIAL ; audit ; notifier UI via polling GET status
```

Erreurs Graph : mapper en messages métier français (permissions insuffisantes, nom dupliqué, throttling).

## 7.3 Permissions Graph à documenter

Étendre le consentement OAuth client (RFC-INT-003 / INT-005) :

* `Team.Create` (ou `Group.ReadWrite.All` selon stratégie retenue au spike)
* `Channel.Create`
* Conserver les scopes existants (`Group.Read.All`, `Tasks.ReadWrite`, `Files.ReadWrite.All`, …)

Spike Graph (`POST /teams` vs `POST /groups` + bind, permissions déléguées) : **reporté** — ne pas bloquer le démarrage ; hypothèses H1–H2 et endpoints documentés Microsoft Learn servent de base ; ajuster en implémentation si le tenant de test contredit.

---

# 8. UX frontend

## 8.1 Options module — `/projects/options`

Nouvelle section **« Équipes Microsoft »** (après catégories / étiquettes) :

* interrupteur **Activer la création d’équipes Teams pour les projets** ;
* champ **Modèle de nom d’équipe** (aide : variables `{{code}}`, `{{name}}`) ;
* description équipe (optionnel) ;
* case **Proposer à la création de projet** ;
* tableau des **canaux par défaut** : nom, description, favori, principal, ordre (drag ou flèches) ;
* état vide : canaux suggérés en exemple (non persistés) — ex. « Pilotage », « Exécution », « Documentation ».

Afficher un bandeau si M365 non connecté → lien vers paramètres client Microsoft.

## 8.2 Création projet

Si `settings.isEnabled && offerOnProjectCreate && connection ACTIVE` :

* case **« Créer l’équipe Microsoft Teams »** (décochée par défaut) ;
* texte d’aide : canaux créés selon la configuration module ;
* après submit : toast + lien vers options projet si provisioning en cours.

## 8.3 Options projet — onglet Microsoft 365

Carte Teams enrichie :

* si pas de `teamId` : bouton **« Créer l’équipe Teams »** (si M365 OK + settings client actifs) ;
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

* Options : CRUD canaux, désactivation si pas M365.
* Création projet : case visible / masquée selon settings.
* Carte Teams : états loading / empty / error / in progress.

---

# 11. Critères d’acceptation

* [x] Un admin client configure des canaux par défaut dans `/projects/options`.
* [x] La feature est désactivable globalement par client (`isEnabled=false` par défaut).
* [x] À la création projet, l’utilisateur peut opt-in la création Teams (si M365 connecté + `offerOnProjectCreate`).
* [x] Depuis les options projet, l’utilisateur peut créer l’équipe a posteriori.
* [x] L’équipe et les canaux configurés sont créés dans M365 (sous réserve des droits tenant).
* [x] `ProjectMicrosoftLink` est renseigné avec team + canal principal.
* [x] L’état de provisioning est consultable (polling React Query sur runs actifs).
* [x] Aucune fuite inter-client ; pas de `clientId` en body.
* [x] Audits émis sur actions sensibles.
* [x] Échec Microsoft ne supprime ni ne corrompt le projet Starium.
* [x] Flux manuel INT-007 conservé (rattachement équipe existante).

---

# 12. Plan de livraison

| Lot | Contenu |
|-----|---------|
| **1 — Data + API template** | Prisma, CRUD settings + canaux, UI `/projects/options` |
| **2 — Service provisioning** | Graph create team/channels (hypothèses doc Microsoft), statuts, audits |
| **3 — Points d’entrée projet** | POST provision, hook création projet, UI options projet |
| **4 — Durcissement** | Tests, messages d’erreur, doc API.md, runbook ops |

> Spike Graph dédié : **hors planning immédiat** (décision produit 2026-07-08).

---

# 13. Récapitulatif

Cette RFC ajoute le **provisioning Teams configurable** manquant au socle M365 :

* **Configuration** centralisée dans les options module Projets (canaux par défaut, nommage).
* **Déclenchement** à la création ou en cours de vie projet.
* **Lien automatique** vers `ProjectMicrosoftLink` pour enchaîner sync tâches/documents (RFC-INT-008/009).

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

| Ordre | Canal | Description | Favori | Principal |
|-------|-------|-------------|--------|-----------|
| — | Général | (créé par Microsoft) | oui | oui si aucun autre |
| 1 | Pilotage | COPIL, COPROJ, décisions | oui | non |
| 2 | Exécution | Suivi opérationnel | non | non |
| 3 | Documentation | Livrables et références | non | non |

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
| `offerOnProjectCreate` | défaut `true` | défaut **`false`** (opt-in explicite côté client) |
| Champ `isFavoriteByDefault` sur template canal | prévu | **non implémenté** (hors MVP) |
| Réponse POST provision | `202 Accepted` | **200** avec DTO run |
| Corps POST provision | `activateMicrosoftLink` | **aucun body** ; lien créé en fin de job |
| Audits canaux | préfixe `project.microsoft_teams.channel_template.*` | codes courts `channel_template.*` |
| Audits provision | préfixe `project.microsoft_teams.provision.*` | codes courts `provision.*` |
| Composants FE canaux | table + dialog dédiés | **formulaire intégré** dans `microsoft-teams-provisioning-settings.tsx` |
| `aria-live` sur statut provisioning | exigé | **à densifier** (polling + alertes présents ; annonce live perfectible) |

## 18.3 Suites possibles (hors MVP)

* Tests controller / intégration cross-client sur les nouvelles routes.
* Tests FE intégrés (création projet + options projet).
* Suffixe auto sur nom d’équipe dupliqué côté tenant M365.
* `aria-live="polite"` explicite sur la carte Teams pendant `PENDING` / `IN_PROGRESS`.
