# RFC-PROJ-013-1 — Cycle de vie réunion Point projet (planification, invitations, tenue)

## Statut

**Implémenté (Phases 1–3)** — extension de **RFC-PROJ-013** (2026-07-04). **Phase 2 livrée** (invitations in-app, cf. §13). **Phase 3 livrée** (email + Microsoft Teams / calendrier, cf. §14).

## Périmètre de ce lot

> **Phases 1–3 livrées.** Phase 1 : cycle `PLANNED` / `IN_REVIEW`, champs réunion, `creationMode`, `start-review`. Phase 2 : invitations **in-app** (§13). Phase 3 : **email**, **Teams** et **calendrier** Microsoft via la même route `POST .../invite` (§14) — canaux de notification (`in_app` \| `email`) **séparés** des actions Microsoft (`createTeamsMeeting`, `createCalendarEvent`), toutes **opt-in** par défaut.
>
> **RFC-PROJ-013-2 (implémentée)** : le cycle métier cible est désormais **`PREPARING` → `SCHEDULED` → `IN_PROGRESS`** ; `PLANNED`/`IN_REVIEW` restent en lecture legacy (migrés en base). Les routes invitations, Teams et email de cette RFC restent valides sur une revue **`SCHEDULED`**. L’éditeur expose **« Planifier »** (in-app + e-mail, avec confirmation) et **« Démarrer le point »** (confirmation) en footer modale — voir RFC-PROJ-013-2 §15.5–15.6. Détail : [RFC-PROJ-013-2](./RFC-PROJ-013-2%20—%20Point%20projet%20de%20pilotage%20(COPIL,%20COPROJ,%20revues,%20arbitrages).md).

## Dépendances

* **RFC-PROJ-013** — Points Projet COPIL/COPRO et Historisation (socle : `ProjectReview`, participants, décisions, actions, snapshot, éditeur)
* RFC-PROJ-001 — Cadrage fonctionnel Projets
* RFC-PROJ-009 — Audit logs
* RFC-PROJ-012 — Project Sheet

**Dépendances de trajectoire future (hors de ce lot) :**

* **RFC-038** — Socle alertes et notifications in-app — **Phase 2 ✅**
* **RFC-PROJ-INT-001** / **INT-004** / **INT-005** / **INT-007** — Intégration Microsoft 365 (Graph, connexion client, lien projet) — **Phase 3 ✅**
* Module **email** (`EmailService`, `EmailDelivery`, templates) — **Phase 3 ✅**

---

# 1. Objectif

Aligner le module **Point projet** sur le **cycle de vie réel d'une réunion de pilotage** :

1. **Préparer** le point : participants, ordre du jour / éléments à trancher / actions à revoir, type (COPIL, COPRO, …).
2. **Inviter** : diffuser une invitation avec le **lien de réunion** (visio) **+ le lien vers le point projet**, ou marquer un point **présentiel** (avec lieu).
3. **Tenir** la réunion le jour J, puis **passer en revue** le point et le finaliser.

👉 Le point projet doit distinguer une **réunion planifiée** (à venir, invitée) d'un **compte rendu en cours de saisie**, puis d'un **point figé** (historisé).

---

# 2. Problème adressé

Avant **RFC-PROJ-013-1** (RFC-PROJ-013 seul) :

* « Créer un point » créait immédiatement un `ProjectReview` en `DRAFT` **et** ouvrait l'éditeur du compte rendu.
* Le statut `DRAFT` **fusionnait** deux phases distinctes : « réunion planifiée / à venir » et « compte rendu en cours ».
* **Aucun champ** ne portait le **mode** (visio / présentiel / hybride), le **lien de réunion** ou le **lieu**.
* **Aucune invitation** n'était diffusée aux participants (le module `notifications` in-app existe mais n'est pas branché ; aucun email ; aucune réunion Teams/calendrier).

**Phase 1 livrée** : cycle `PLANNED` / `IN_REVIEW`, champs réunion, `creationMode`, `start-review`, conduite de réunion (ordre du jour, participants `attendanceStatus`, responsable unique sur actions). **Phases 2–3 livrées** : invitations in-app (§13), email + Teams/calendrier (§14).

### Ce qui existe déjà et qu'on réutilise

* **Deep links** vers un point : `?openReview=<id>` et `?createRetourExperience=1` (`project-reviews-tab.tsx`) → sert de **« lien vers le point projet »** dans l'invitation, sans rien construire de neuf.
* Sous-entités `participants` / `decisions` / `actionItems` créées avec la revue (patron réutilisé).
* Module `notifications` (in-app, table `Notification`, `NotificationsService`).

---

# 3. Concepts clés

## 3.1 Cycle de vie cible

```
PLANNED     (préparé + invité, réunion à venir)
   → IN_REVIEW  (réunion tenue, saisie du compte rendu en cours)
        → FINALIZED  (figé + snapshot, historisé)
   → CANCELLED  (annulable depuis PLANNED ou IN_REVIEW)
```

Aujourd'hui `DRAFT` couvre à la fois `PLANNED` et `IN_REVIEW`. On introduit la séparation.

## 3.2 Mapping avec l'existant (rétrocompatibilité)

| Statut (`ProjectReviewStatus`) | Action de ce lot | Règle |
| ------------------------------ | ---------------- | ----- |
| **`PLANNED`** (nouveau)        | ajouté à l'enum  | réunion préparée / à venir (créée via `creationMode = PLANNED`) |
| **`IN_REVIEW`** (nouveau)      | ajouté à l'enum  | réunion tenue, compte rendu en saisie (remplace fonctionnellement `DRAFT`) |
| `DRAFT` (legacy)               | **conservé** dans l'enum | valeur legacy temporaire ; **non supprimée** dans cette itération ; données migrées vers `IN_REVIEW` (cf. §5.1 migration) |
| `FINALIZED`                    | inchangé         | figé + snapshot |
| `CANCELLED`                    | inchangé         | annulé |

> **Choix de conception (résolu)** : la création n'expose **pas** de champ `status` libre. Le frontend/API envoie un champ **métier** `creationMode` (voir §4.2 et §5.1) :
> * `creationMode = PLANNED` → crée une revue **planifiée** (`status = PLANNED`) ;
> * `creationMode = IMMEDIATE` → conserve le comportement actuel « créer + saisir » (`status = IN_REVIEW`).
>
> `DRAFT` n'est plus jamais écrit par le code applicatif ; il ne subsiste que comme valeur legacy le temps de purger les usages.

## 3.3 Mode de réunion

| `meetingMode` | Sens | Champs attendus |
| ------------- | ---- | --------------- |
| `REMOTE`      | visio | `meetingUrl` (obligatoire recommandé) |
| `ONSITE`      | présentiel | `location` (texte lieu) |
| `HYBRID`      | mixte | `meetingUrl` + `location` |

---

# 4. Découpage en phases

**Phases 1–3 implémentées** (§12–§14). La Phase 1 initiale ne couvrait que le cycle de vie ; les Phases 2–3 étendent invitations et intégrations Microsoft/email.

## 4.1 Phase 1 — Cycle de vie + réunion (SEUL périmètre de ce lot)

Périmètre :

* Nouveaux statuts **`PLANNED`** + **`IN_REVIEW`** (+ conservation de `DRAFT` legacy) et transitions serveur.
* Champs réunion : `meetingMode`, `meetingUrl`, `location`.
* Champ de création métier **`creationMode`** (`PLANNED` | `IMMEDIATE`) — pas de `status` libre exposé.
* Bouton **« Démarrer la revue »** (`PLANNED → IN_REVIEW`).
* Réutilisation du deep link `?openReview=<id>` comme « lien vers le point ».
* UI : mode + lien/lieu dans le dialogue de création et l'éditeur ; badge de statut « Planifié / En revue / Finalisé ».

**Explicitement hors périmètre de ce lot** : toute diffusion d'invitation (in-app, email), tout appel Microsoft Graph / Teams / calendrier, toute route `invite`, tout branchement `NotificationsService`.

### 4.2 Modèle de création (`creationMode`)

La création n'expose **jamais** un `status` libre. Le payload porte un champ métier `creationMode` :

```
creationMode = PLANNED    → status = PLANNED     (revue planifiée, compte rendu non éditable)
creationMode = IMMEDIATE  → status = IN_REVIEW   (comportement actuel : créer + saisir)
```

### 4.3 Transitions serveur (Phase 1)

```
create(creationMode=PLANNED)     → PLANNED
create(creationMode=IMMEDIATE)   → IN_REVIEW
start-review                     → PLANNED   → IN_REVIEW
finalize                         → IN_REVIEW → FINALIZED   (+ snapshot)
cancel                           → PLANNED | IN_REVIEW → CANCELLED
```

Règles serveur strictes :

* **Interdiction stricte de finaliser une revue `PLANNED`** : `finalize` doit rejeter (erreur explicite) tout point encore `PLANNED` — il faut d'abord `start-review`.
* `PLANNED → IN_REVIEW` uniquement via `start-review`.
* `IN_REVIEW → FINALIZED` uniquement via `finalize`.
* `PLANNED` **ou** `IN_REVIEW → CANCELLED` via `cancel`.
* `FINALIZED` et `CANCELLED` sont **terminaux** : non modifiables, hormis les règles déjà existantes explicites de RFC-PROJ-013 (aucune nouvelle transition ouverte par ce lot).
* `meetingUrl` validé `@IsUrl` + schéma `https?` uniquement (pas de `javascript:` / `data:`).
* `POST_MORTEM` (projet clos) : `meetingMode` optionnel ; le flux REX **conserve la création immédiate** si c'est le comportement actuel (cf. §9).

## 4.4 Phase 2 — Invitations in-app

> **Statut : livré (Phase 2).** Détail en **§13**.

Résumé :

* Notifications **in-app uniquement** (table `Notification`, cloche RFC-038) — pas d'email, pas de Microsoft Graph.
* Cibles : participants `ProjectReviewParticipant` avec `userId` actif sur le client ; externes (`displayName` seul) ignorés in-app (email en Phase 3).
* Déclencheurs : bouton **« Inviter »** manuel + renvoi automatique à la création `PLANNED` et au **changement de `reviewDate`** (`channels: ['in_app']` uniquement).
* Deep link `actionUrl` → fiche projet `?openReview=<reviewId>` ; **`meetingUrl` jamais** dans logs, audits, metadata notification.
* Route `POST .../reviews/:reviewId/invite`, audit `project.review.invited`.

## 4.5 Phase 3 — Email + réunion Microsoft

> **Statut : livré (Phase 3).** Détail en **§14**.

Résumé :

* **Canaux notification** (`channels`) : `in_app` \| `email` — défaut `['in_app']` ; email **uniquement si demandé**.
* **Actions Microsoft** (opt-in, défaut `false`) : `createTeamsMeeting`, `createCalendarEvent`, `forceOverwriteMeetingUrl` — **pas** des canaux ; lien M365 actif **ne déclenche pas** Teams/calendrier automatiquement.
* **Email** : template `project_review_invitation`, `externalEmail` sur participants externes, traçabilité `EmailDelivery.projectReviewId`.
* **Teams** : `POST /me/onlineMeetings` si action explicite + mode `REMOTE`/`HYBRID` + lien projet Microsoft ; organisateur Graph = `MicrosoftConnection.connectedByUserId` (V1).
* **Calendrier** : `POST/PATCH /me/events` si action explicite ; patch auto sur `auto_date_change` **uniquement** si `microsoftEventId` déjà créé par Starium.

---

# 5. Fichiers à créer / modifier

## 5.1 Backend

**Modifier**

* `apps/api/prisma/schema.prisma`
  * `enum ProjectReviewStatus` : **ajouter** `PLANNED` et `IN_REVIEW`. **Conserver `DRAFT`** (legacy — ne pas le retirer dans cette itération).
  * `enum ProjectReviewMeetingMode` (nouveau) : `REMOTE`, `ONSITE`, `HYBRID`.
  * `model ProjectReview` : `meetingMode ProjectReviewMeetingMode?`, `meetingUrl String?`, `location String?`, `startedAt DateTime?`, `startedByUserId String?` (+ relation `User?`).
* `apps/api/src/modules/projects/project-reviews/dto/create-project-review.dto.ts`
  * Champs optionnels `meetingMode` (`@IsIn`), `meetingUrl` (`@IsUrl` + schéma https), `location` (`@IsString @MaxLength(300)`).
  * **Nouveau champ métier** `creationMode?: 'PLANNED' | 'IMMEDIATE'` (`@IsIn`, défaut `IMMEDIATE` pour rétrocompat). **Ne pas exposer de champ `status` libre.** Le service dérive le `status` du `creationMode`.
* `apps/api/src/modules/projects/project-reviews/dto/update-project-review.dto.ts` — `meetingMode` / `meetingUrl` / `location` en `@IsOptional`. **Pas** de mutation de `status` via update (les transitions passent par les endpoints dédiés).
* `apps/api/src/modules/projects/project-reviews/project-reviews.service.ts`
  * `create` : dériver `status` depuis `creationMode` (`PLANNED → PLANNED`, `IMMEDIATE → IN_REVIEW`) ; **ne jamais écrire `DRAFT`** ; renseigner les champs réunion.
  * Nouvelle méthode `startReview(clientId, projectId, reviewId, context)` : `PLANNED → IN_REVIEW`, set `startedAt` / `startedByUserId`, audit `project.review.started`. Rejette si statut ≠ `PLANNED`.
  * `finalize` : **garde-fou strict** — rejet explicite si `status === PLANNED`.
  * Inclure les nouveaux champs dans le mapper de détail/liste.
* `apps/api/src/modules/projects/project-reviews/project-reviews.controller.ts`
  * `POST /projects/:projectId/reviews/:reviewId/start-review` (`projects.update`).
* `apps/api/src/modules/projects/project-reviews/project-reviews-snapshot.builder.ts`
  * Inclure `meetingMode` et `location` dans le snapshot. **Ne pas inclure `meetingUrl`** (lien pouvant expirer / contenir un token).

**Migration Prisma / PostgreSQL** (stratégie retenue, sans suppression de `DRAFT`)

1. Migration **additive** : ajouter les valeurs d'enum `PLANNED` et `IN_REVIEW` à `ProjectReviewStatus` (`ALTER TYPE ... ADD VALUE`), le nouvel enum `ProjectReviewMeetingMode`, et les nouveaux champs **nullable** sur `ProjectReview`. `DRAFT` **reste** dans l'enum.
2. **Data migration** (si possible dans la même livraison) : `UPDATE "ProjectReview" SET status = 'IN_REVIEW' WHERE status = 'DRAFT';` — migre les données existantes.
3. **`DRAFT` conservé comme valeur legacy temporaire** : ne pas le supprimer tant que tous les usages (code + seeds + tests) n'ont pas été purgés, afin de ne casser ni Prisma (enum généré), ni Postgres (valeur référencée), ni les seeds, ni les tests.
4. La suppression éventuelle de `DRAFT` fera l'objet d'une **itération ultérieure distincte** (hors de ce lot).

> ⚠️ `ALTER TYPE ... ADD VALUE` n'est pas transactionnel avant PG 12 et une valeur ajoutée n'est pas utilisable dans la même transaction que son ajout — prévoir la data-migration `DRAFT→IN_REVIEW` dans une **étape/migration séparée** de l'ajout de valeur.

**Tâche obligatoire préalable — recherche globale de `DRAFT`**

Avant toute bascule, faire une **recherche exhaustive de tous les usages de `DRAFT`** (`ProjectReviewStatus`) et statuer sur chacun :

* **Backend** : service, controller, snapshot builder, DTO, guards, tout `=== 'DRAFT'` / `status: 'DRAFT'`.
* **Frontend** : `project-reviews-tab.tsx`, `project-review-editor-dialog.tsx`, `project-reviews-context-banner.tsx`, `constants/project-enum-labels.ts`, helpers `project-review-post-mortem.ts`, types `project.types.ts`.
* **Tests** : `project-reviews.service.spec.ts` et tout spec référant `DRAFT`.
* **Seeds** : `seed-project-demo-reviews.ts` (rebasculer les points démo sur `PLANNED` / `IN_REVIEW`).

Chaque usage doit être basculé sur `IN_REVIEW` (compte rendu en cours) ou `PLANNED` (à venir), ou explicitement conservé/justifié. Cette liste conditionne la sécurité de la migration.

## 5.2 Frontend

**Modifier**

* `apps/web/src/features/projects/types/project.types.ts`
  * `ProjectReviewStatus` (ajouter `PLANNED`, `IN_REVIEW`), `ProjectReviewMeetingMode`, champs `meetingMode` / `meetingUrl` / `location` / `startedAt` sur détail & liste.
* `apps/web/src/features/projects/constants/project-enum-labels.ts`
  * `PROJECT_REVIEW_STATUS_LABEL` : `PLANNED` = « Planifié », `IN_REVIEW` = « En revue ».
  * `PROJECT_REVIEW_MEETING_MODE_LABEL` : Visio / Présentiel / Hybride.
* `apps/web/src/features/projects/components/project-reviews-tab.tsx`
  * Dialogue création : section **« Réunion »** (mode radio Visio/Présentiel/Hybride → `meetingUrl` et/ou `location`), et choix de `creationMode` : **« Planifier »** (`PLANNED`) vs **« Créer et saisir »** (`IMMEDIATE`). Envoi de `creationMode`, jamais de `status` brut.
  * Badges de statut incluant `PLANNED` / `IN_REVIEW` (couleurs DS).
* `apps/web/src/features/projects/components/project-review-editor-dialog.tsx`
  * Afficher mode + lien réunion (`rel="noopener noreferrer" target="_blank"`) / lieu.
  * **Sections compte rendu non éditables tant que `PLANNED`** (éditables uniquement en `IN_REVIEW`).
  * Bouton **« Démarrer la revue »** visible **uniquement** si `status === PLANNED` (déclenche `start-review`).
  * *(Le bloc « Inviter » est Phase 2 — hors de ce lot, ne rien ajouter ici.)*
* `apps/web/src/features/projects/api/project-reviews.api.ts`
  * `startProjectReview(projectId, reviewId)` (POST `.../start-review`).
* `apps/web/src/features/projects/hooks/use-project-review-mutations.ts`
  * Mutation `startReview`.

---

# 6. Modèle de données (Prisma)

```prisma
enum ProjectReviewStatus {
  PLANNED     // réunion préparée + invitée, à venir
  IN_REVIEW   // réunion tenue, compte rendu en saisie (remplace DRAFT)
  FINALIZED
  CANCELLED
  DRAFT       // LEGACY — conservé temporairement, plus jamais écrit par le code ; à retirer dans une itération ultérieure
}

enum ProjectReviewMeetingMode {
  REMOTE
  ONSITE
  HYBRID
}

model ProjectReview {
  // … champs existants (RFC-PROJ-013) …

  meetingMode     ProjectReviewMeetingMode?
  meetingUrl      String?
  location        String?

  startedAt       DateTime?
  startedByUserId String?
  startedBy       User? @relation("ProjectReviewStartedBy", fields: [startedByUserId], references: [id], onDelete: SetNull)
}
```

Contraintes :

* `meetingUrl` : validation applicative `@IsUrl({ protocols: ['http','https'], require_protocol: true })` + rejet des schémas dangereux.
* `location` : `@MaxLength(300)`.
* Scope : `clientId` + `projectId` dérivés du contexte (jamais du payload) — inchangé RFC-PROJ-013.

---

# 7. API

Préfixe `/api`.

| Méthode | Route | Permission | Effet |
| ------- | ----- | ---------- | ----- |
| `POST`  | `/projects/:projectId/reviews` | `projects.update` | Création selon `creationMode` : `PLANNED` → `status=PLANNED`, `IMMEDIATE` → `status=IN_REVIEW` (+ champs réunion). Jamais de `status` brut dans le payload. |
| `POST`  | `/projects/:projectId/reviews/:reviewId/start-review` | `projects.update` | `PLANNED → IN_REVIEW` (refuse si statut ≠ `PLANNED`) |
| `POST`  | `/projects/:projectId/reviews/:reviewId/finalize` | `projects.update` | `IN_REVIEW → FINALIZED` (**refuse si `PLANNED`**) |
| `POST`  | `/projects/:projectId/reviews/:reviewId/cancel` | `projects.update` | `PLANNED|IN_REVIEW → CANCELLED` |
| `GET`   | `/projects/:projectId/reviews[/:reviewId]` | `projects.read` | Retourne les nouveaux champs (+ `agendaItems`, participants enrichis) |
| `POST`  | `/projects/:projectId/reviews/:reviewId/agenda-items` | `projects.update` | Créer un point d'ordre du jour (si `PLANNED` ou `IN_REVIEW`) |
| `PATCH` | `/projects/:projectId/reviews/:reviewId/agenda-items/reorder` | `projects.update` | Réordonner (`items: { id, orderIndex }[]`) — route déclarée **avant** `:agendaItemId` |
| `PATCH` | `/projects/:projectId/reviews/:reviewId/agenda-items/:agendaItemId` | `projects.update` | Modifier titre / notes / `decisionSummary` (notes interdites en `PLANNED`) |
| `POST`  | `…/agenda-items/:agendaItemId/start` \| `complete` \| `skip` | `projects.update` | Transitions point d'ordre du jour |
| `POST`  | `/projects/:projectId/reviews/:reviewId/participants` | `projects.update` | Ajouter participant (interne `userId` ou externe `displayName`) |
| `PATCH` | `/projects/:projectId/reviews/:reviewId/participants/:participantId` | `projects.update` | Modifier (`attendanceStatus` source de vérité en `IN_REVIEW`) |
| `DELETE`| `/projects/:projectId/reviews/:reviewId/participants/:participantId` | `projects.update` | Supprimer (si `PLANNED` ou `IN_REVIEW`) |

> Route `invite` = **Phases 2–3 ✅** (in-app, email, Teams/calendrier opt-in) — cf. §13–§14 et [API.md](../API.md).

**Audits Phase 1 complémentaires** : `project.review.started`, `project.review.agenda_item.*`, `project.review.action.responsibility_assigned`, `project.review.participant.{added,updated,removed}`. **Jamais** `meetingUrl` ni email externe en clair dans les audits.

---

# 8. Tests

**Backend** (`project-reviews.service.spec.ts` + nouveaux) :

* `create` avec `creationMode=PLANNED` → `status=PLANNED` + `meetingMode`/`meetingUrl`/`location`.
* `create` avec `creationMode=IMMEDIATE` (et défaut) → `status=IN_REVIEW` (comportement actuel préservé).
* Aucun chemin de code n'écrit `DRAFT`.
* `startReview` : `PLANNED → IN_REVIEW` (set `startedAt`/`startedByUserId`, audit `project.review.started`) ; refus si statut ≠ `PLANNED`.
* `finalize` **refusé si `PLANNED`** (garde-fou strict).
* `cancel` : autorisé depuis `PLANNED` et `IN_REVIEW`.
* Validation `meetingUrl` : rejet `javascript:`, `data:`, URL sans protocole.
* **Isolation client** : `startReview` sur un `reviewId` d'un autre client → 404 (scope `getProjectForScope`).
* Migration : un enregistrement `DRAFT` existant est lu / migré en `IN_REVIEW`.
* Snapshot : contient `meetingMode`/`location`, **ne contient pas** `meetingUrl`.

**Frontend** :

* Rendu du badge par statut (`Planifié` / `En revue` / `Finalisé`).
* Dialogue création : mode Présentiel masque `meetingUrl` et exige `location` ; Visio l'inverse ; envoi de `creationMode` (jamais `status`).
* Éditeur : sections compte rendu non éditables tant que `PLANNED` ; bouton « Démarrer la revue » visible seulement en `PLANNED`.

> Tests d'invitation in-app = Phase 2 (hors de ce lot).

---

# 9. Points de vigilance

* **Migration de l'enum (stratégie retenue)** : **ne pas retirer `DRAFT`** dans ce lot. On ajoute `PLANNED`/`IN_REVIEW`, on migre les données `DRAFT→IN_REVIEW`, et on conserve `DRAFT` comme valeur legacy temporaire pour ne casser ni Prisma, ni Postgres, ni les seeds, ni les tests. Suppression de `DRAFT` = itération ultérieure séparée, après purge complète des usages.
* **Recherche globale `DRAFT` obligatoire** (cf. §5.1) : auditer et rebasculer **tous** les usages `status === 'DRAFT'` (backend, frontend `project-review-post-mortem.ts`/éditeur/bannières, tests, seeds) sur `IN_REVIEW` (+ `PLANNED` en lecture seule côté compte rendu). Cette recherche conditionne la sécurité de la migration.
* **Snapshot** : figer `meetingMode` et `location` ; **ne pas inclure `meetingUrl`** dans le `snapshotPayload` (lien pouvant expirer et/ou contenir un token).
* **Sécurité URL** : `meetingUrl` est une entrée utilisateur affichée en lien → validation stricte + `rel="noopener noreferrer"`, jamais de rendu de schéma non http(s).
* **Deep link** : `?openReview=<id>` ne doit pas contourner l'autorisation — l'ouverture reste soumise à `projects.read` + scope client (déjà le cas).
* **POST_MORTEM** : le REX n'est pas une réunion planifiée classique → `meetingMode` optionnel ; **le flux REX conserve la création immédiate** (`creationMode=IMMEDIATE`, `status=IN_REVIEW`) si c'est le comportement actuel — ne pas lui imposer le cycle `PLANNED`.

---

# 10. Conformité by design

### RGPD / Privacy

* **DCP concernées** : participants (nom, `userId`), éventuellement e-mails en Phase 3. Finalité : convier et tracer un point de pilotage.
* **Minimisation** : `meetingUrl` / `location` = données de réunion, pas de DCP superflue ; pas de stockage d'agenda externe.
* **Rétention / effacement** : les points suivent le cycle de vie du projet (cascade `onDelete: Cascade` sur `projectReview`). Le `startedByUserId` en `SetNull` à la suppression de l'utilisateur.
* **Logs** : ne jamais logger `meetingUrl` en clair si elle contient un token (Teams join URL) ; pseudonymiser les participants dans l'audit (id, pas e-mail).
* **Scope client** : toute DCP scopée `clientId`, aucune fuite inter-client (inchangé RFC-PROJ-013).

### RGAA / Accessibilité

* Choix du mode réunion = `radiogroup` natif avec `<label>` associés (pas de `div` cliquable) ; annonce du changement d'état.
* Badge de statut : information **jamais** portée par la couleur seule (libellé texte + éventuelle icône), contrastes ≥ 4.5:1.
* Bouton « Démarrer la revue » atteignable clavier, `focus-visible`, cible ≥ 44×44 px.
* Liens réunion : libellé explicite (« Rejoindre la réunion »), pas l'URL brute comme seul texte.
* Contenu dynamique (changement de statut après « Démarrer la revue ») annoncé via `aria-live`.

### Design System

* Réutiliser la **norme modale §11.4.1** (déjà appliquée au dialogue de création) : `DialogBody`, `.starium-form-section`, champs `.starium-form-*`, `DialogFooter` + `starium-btn`.
* Badges statut via `starium-ds-badge` (variantes existantes), **aucune couleur en dur**.
* Libellés métier affichés (statut, mode), **jamais** d'ID technique (ex. `meetingMode` affiché « Visio », participant affiché par son nom).
* États loading / empty / error systématiques (liste, création, « Démarrer la revue »).

### Sécurité by design

* Authz `projects.update` sur toutes les transitions ; `projects.read` en lecture. Isolation tenant via `getProjectForScope`.
* DTO + `class-validator` sur tous les écrits ; `meetingUrl` strictement validée.
* `clientId` / `projectId` dérivés du scope authentifié, jamais du payload.
* Audit log de chaque transition sensible de ce lot : `created`, **`project.review.started`** (au passage `PLANNED → IN_REVIEW`), `finalized`, `cancelled`. (`invited` = Phase 2, hors de ce lot.)
* **Ne jamais logger `meetingUrl` en clair** (peut contenir un token de réunion) — ni dans l'audit, ni dans les logs applicatifs.
* Pas de sur-exposition : whitelist des champs dans le mapper de réponse.

### Interface mobile (mobile-first)

* Dialogue création/éditeur déjà en **bottom-sheet** < `sm` (socle `DialogContent`).
* Section réunion et badges responsives dès 320px ; radios mode empilés en colonne sur mobile.
* Actions principales (Démarrer, Finaliser, Annuler) atteignables au pouce, cibles ≥ 44px.

---

# 11. Récapitulatif

| Phase | Contenu | Statut de ce lot | Dépendance externe |
| ----- | ------- | ---------------- | ------------------ |
| **1** | Statuts `PLANNED` + `IN_REVIEW` (+ `DRAFT` legacy conservé), `creationMode`, champs réunion (mode/URL/lieu), « Démarrer la revue », snapshot `meetingMode`/`location`, lien via `?openReview=` | ✅ **Implémenté (ce lot)** | Aucune |
| **2** | Invitations **in-app** (module `notifications`) | ✅ **Implémenté (Phase 2)** | RFC-038 / table `Notification` (existant) |
| **3** | Email + réunion Teams/calendrier | ✅ **Implémenté (Phase 3)** | `EmailService` + Microsoft Graph (RFC-PROJ-INT-*) ; migration `20260705140000` |

Les trois phases couvrent le workflow « préparer → inviter → tenir → acter ». Le lien vers le point reste le deep link `?openReview=`.

---

# 12. Implémentation livrée (Phase 1)

## Backend

* **Prisma** : `ProjectReviewStatus` (+ `PLANNED`, `IN_REVIEW`, `DRAFT` legacy conservé), `ProjectReviewMeetingMode`, champs réunion sur `ProjectReview`, `ProjectReviewAgendaItem`, `ProjectReviewActionItemContributor`, extension `ProjectReviewParticipant` (`attendanceStatus`, `roleLabel`, timestamps).
* **Migrations** (5 dossiers séparés, ordre obligatoire) :
  * `20260704120000_proj_013_1_meeting_lifecycle_enums_columns`
  * `20260704120100_proj_013_1_migrate_draft_reviews` (`DRAFT → IN_REVIEW`)
  * `20260704120200_proj_013_1_review_status_default_in_review`
  * `20260704120300_proj_013_1_review_conduct_agenda_actions`
  * `20260704120400_proj_013_1_review_participant_attendance`
* **Services** : `project-reviews.service.ts` (cycle de vie), `project-review-agenda.service.ts`, `project-review-participants.service.ts`.
* **Controllers** : `project-reviews.controller.ts` (`start-review`), `project-review-agenda.controller.ts`, `project-review-participants.controller.ts`.
* **Snapshot** : `project-reviews-snapshot.builder.ts` — fige `meetingMode`, `location`, participants (`attendanceStatus`), agenda ordonné, actions (responsable + intervenants), points non traités ; **exclut** `meetingUrl`.
* **Seeds** : `seed-project-demo-reviews.ts` — statuts démo rebasculés sur `IN_REVIEW` / `PLANNED`.
* **Tests** : `project-reviews.service.spec.ts`, `project-review-agenda.service.spec.ts`, `project-review-participants.service.spec.ts`.

## Frontend

* Types / labels : `project.types.ts`, `project-enum-labels.ts` (`PLANNED`, `IN_REVIEW`, modes réunion, `attendanceStatus`).
* API / hooks : `project-reviews.api.ts`, `use-project-review-mutations.ts` (`startReview`, agenda, participants, **`inviteReview`**).
* UI : `project-reviews-tab.tsx` (création + `creationMode` + section Réunion), `project-review-editor-dialog.tsx` (lecture seule `PLANNED`, « Démarrer la revue », **invitations**), `review-agenda-section.tsx`, `review-participants-section.tsx`, **`review-invitations-section.tsx`**, **`review-planned-planning-fields.tsx`**.
* Post-mortem : `project-review-post-mortem.ts` — brouillon REX filtré sur `IN_REVIEW`.

## Phase 2 — Invitations in-app (livré)

* **Prisma** : `invitedAt`, `lastInvitedAt` sur `ProjectReviewParticipant` (migration `20260705120000`).
* **Backend** : `project-review-invitations.service.ts`, `NotificationsService.createForUser`, route `POST .../invite`, auto-triggers post-commit (`auto_create`, `auto_date_change`), PATCH `PLANNED` partiel, audits `project.review.invited` / `project.review.invite_failed`.
* **Frontend** : section Invitations + badges « Notifié le … », édition planning en `PLANNED`.
* **Tests** : `project-review-invitations.service.spec.ts` + extensions `project-reviews.service.spec.ts`.

## Phase 3 — Email + Microsoft Teams / calendrier (livré)

* **Prisma** : `externalEmail`, `lastEmailedAt` (participant) ; `microsoftOnlineMeetingId`, `microsoftEventId`, `microsoftMeetingOrganizerUserId` (revue) ; `EmailDelivery.projectReviewId` — migration `20260705140000`.
* **Backend** :
  * `project-review-email-invitations.service.ts` — canal `email`, template `project_review_invitation`, pseudonymisation audit ;
  * `project-review-microsoft-meeting.service.ts` — Teams + calendrier Graph (`OnlineMeetings.ReadWrite`, `Calendars.ReadWrite` dans scopes par défaut) ;
  * orchestrateur multi-canaux dans `project-review-invitations.service.ts` ;
  * helpers Graph : `createOnlineMeeting`, `createCalendarEvent`, `patchCalendarEvent` ;
  * audits : `project.review.emailed`, `email_failed`, `teams_meeting.*`, `calendar_event.*`.
* **Contrat invite** : `channels` = `in_app` \| `email` (défaut `['in_app']`) ; actions Microsoft séparées (`createTeamsMeeting`, `createCalendarEvent`, `forceOverwriteMeetingUrl` — défaut `false`) ; réponse `notifiedInApp`, compteurs email/Teams/calendrier.
* **Organisateur Graph (V1)** : token de `MicrosoftConnection` client (`connectedByUserId`) — pas d'OAuth utilisateur individuel.
* **Frontend** : `review-invitations-section.tsx` (cases notification vs actions Microsoft), `review-participants-section.tsx` (`externalEmail` externes), badge « Réunion Teams créée ».
* **Tests** : `project-review-email-invitations.service.spec.ts`, `project-review-microsoft-meeting.service.spec.ts`, `invite-project-review.dto.spec.ts` + extensions orchestrateur (40 tests project-review).

## Déploiement

```bash
cd apps/api && npx prisma migrate deploy
```

---

# 13. Plan d'implémentation Phase 2 — Invitations in-app

> **Statut : livré (Phase 2).** Ce lot s'appuie sur la Phase 1 (revue `PLANNED`, participants, deep link `?openReview=`). Aucun email ni intégration Microsoft (Phase 3).

## 13.1 Objectif et périmètre

Permettre au pilote du point projet de **notifier les participants internes** qu'une réunion est planifiée, directement dans la **cloche in-app** (RFC-038).

**Inclus**

* Création de notifications `Notification` (`type = INFO`) pour chaque participant avec `userId` plateforme, scopé `clientId`.
* Route dédiée `POST .../invite` + déclenchement automatique contrôlé (cf. §13.3).
* Traçabilité : audit `project.review.invited`, horodatage par participant.
* UI : bloc « Invitations » dans l'éditeur `PLANNED` (bouton, retour succès/échec, indicateur « notifié »).

**Exclus (Phase 3 ou hors scope)**

* Email SMTP / templates mail.
* Création Teams / événement calendrier Graph.
* Notifications aux participants **externes** (`displayName` sans `userId`).
* Opt-out granulaire par type de notification projet (hors scope V1 — tous les utilisateurs avec `notifications.read` voient la cloche).

## 13.2 Analyse de l'existant (Phase 1 + socle notifications)

| Élément | État | Usage Phase 2 |
| ------- | ---- | --------------- |
| `ProjectReview` `PLANNED` + champs réunion | ✅ Phase 1 | Seules revues `PLANNED` invitables ; refus si `IN_REVIEW` / terminal |
| `ProjectReviewParticipant.userId` / `displayName` | ✅ Phase 1 | Notifier **uniquement** si `userId` non null |
| Deep link `?openReview=<id>` | ✅ Frontend | `actionUrl` de la notification |
| `Notification` (Prisma) | ✅ RFC-038 | `clientId`, `userId`, `type`, `title`, `message`, `entityType`, `entityId`, `entityLabel`, `actionUrl`, `metadata` |
| `NotificationsService` | ✅ RFC-038 + Phase 2 | `createForUser` centralisé ; list / markRead / markAllRead |
| Création notification | ✅ Patron `alerts.service.ts` | `prisma.notification.create` + audit `notification.created` |
| Cloche frontend | ✅ `notification-bell.tsx` | Affiche `actionUrl` comme lien cliquable |
| `ProjectsModule` | ✅ Phase 2 | import `NotificationsModule` + `ProjectReviewInvitationsService` |

**Hypothèse retenue** : introduire une méthode dédiée `NotificationsService.createForUser(...)` (ou helper interne `project-review-invitations.service.ts`) pour uniformiser la création et l'audit, plutôt que dupliquer le bloc `prisma.notification.create` du module alertes.

## 13.3 Déclencheurs et règles métier

### 13.3.1 Qui peut inviter

* Permission **`projects.update`** (même garde que `start-review`).
* Revue dans le scope `clientId` + `projectId` (via `getProjectForScope`).
* Statut revue **`PLANNED` uniquement** — refus explicite si `IN_REVIEW`, `FINALIZED`, `CANCELLED`.

### 13.3.2 Qui reçoit une notification

Pour chaque participant éligible :

1. `userId` renseigné ;
2. utilisateur **actif** sur le client (`client_users.status = ACTIVE`) ;
3. participant appartient à la revue courante.

**Ignorés (sans erreur bloquante)** :

* Participants externes (`displayName` seul) → comptés dans le résumé `skippedExternal`.
* `userId` absent du client ou utilisateur inactif → `skippedInactive`.
* Doublon dans la même requête → dédupliquer par `userId`.

### 13.3.3 Modes de déclenchement

| Mode | Quand | Comportement |
| ---- | ----- | ------------ |
| **Manuel** | `POST .../invite` (bouton UI « Inviter les participants ») | Notifie les participants ciblés (tous par défaut, ou sous-ensemble via DTO) |
| **Auto — création** | `create` avec `creationMode = PLANNED` **et** participants fournis dans le même flux | Appel interne `invite` en fin de transaction si ≥1 participant `userId` (option `autoInviteOnCreate`, défaut `true`) |
| **Auto — date** | `PATCH` revue modifiant `reviewDate` (revue toujours `PLANNED`) | Renvoi automatique à **tous** les participants `userId` (`skippedAlreadyInvited` = false : une replanification doit re-notifier) |

> **Choix explicite** : pas d'invitation auto à l'**ajout** d'un participant seul (POST participants) en V1 — l'organisateur clique « Inviter » ou attend le prochain changement de date. Extension possible en V1.1 via flag `inviteOnParticipantAdd`.

### 13.3.4 Idempotence et re-invitation

* Chaque envoi réussi met à jour `ProjectReviewParticipant.lastInvitedAt` (et `invitedAt` au premier envoi).
* Re-cliquer « Inviter » **crée de nouvelles notifications** (comportement attendu pour rappel) ; l'UI affiche la date du dernier envoi.
* Pas de table `ProjectReviewInvitation` en V1 — la traçabilité repose sur `Notification` + audit + timestamps participant.

## 13.4 Contenu des notifications

### 13.4.1 Payload `Notification`

```typescript
{
  clientId,           // scope authentifié
  userId,             // destinataire participant
  type: 'INFO',
  title: 'Point projet planifié — {projectName}',
  message: '{reviewTypeLabel} · {reviewDateFormatted} · {meetingModeLabel}{locationSuffix}',
  status: 'UNREAD',
  entityType: 'project_review',
  entityId: reviewId,
  entityLabel: '{reviewTitle ou type COPIL/COPRO}',
  actionUrl: '/projects/{projectId}?openReview={reviewId}',
  metadata: {
    projectId,
    reviewId,
    reviewDate: ISO8601,
    meetingMode: 'REMOTE' | 'ONSITE' | 'HYBRID',
    // location autorisée (texte lieu, pas DCP)
    // meetingUrl INTERDIT (token / fuite logs)
  },
}
```

### 13.4.2 Règles de rédaction

* **Titre** : nom du projet + nature du point (libellé métier, pas UUID).
* **Message** : date/heure locale client, mode réunion en libellé (« Visio », « Présentiel », « Hybride »), lieu texte si `ONSITE`/`HYBRID` ; pour le mode visio, phrase du type « Lien de réunion disponible dans le point projet » — **ne pas** inclure `meetingUrl` dans `message` ni `metadata`.
* **`actionUrl`** : chemin frontend relatif (comme les alertes existantes) ; ouverture soumise à `projects.read` + scope client (inchangé).
* **Audit `project.review.invited`** : `{ reviewId, notifiedInAppCount, skippedExternal, skippedInactive, trigger, channels }` — **jamais** `meetingUrl`.

## 13.5 Modèle de données (évolution Prisma)

**Migration additive** (1 dossier) :

```prisma
model ProjectReviewParticipant {
  // … champs Phase 1 …
  invitedAt     DateTime?  // premier envoi réussi
  lastInvitedAt DateTime?  // dernier envoi (manuel ou auto)
}
```

Pas de nouvel enum. Pas de modification de `NotificationType` (réutiliser `INFO`).

Optionnel Phase 2+ : index `(clientId, projectReviewId, userId)` si requêtes fréquentes — non bloquant V1.

## 13.6 API

| Méthode | Route | Permission | Effet |
| ------- | ----- | ---------- | ----- |
| `POST` | `/projects/:projectId/reviews/:reviewId/invite` | `projects.update` | Émet les notifications in-app ; met à jour `invitedAt` / `lastInvitedAt` |

**DTO `InviteProjectReviewDto`** (body optionnel) :

```typescript
{
  participantIds?: string[];  // sous-ensemble ; défaut = tous éligibles
  // trigger : paramètre interne service uniquement — absent du DTO HTTP
}
```

**Réponse `InviteProjectReviewResultDto` (Phase 2 — étendue Phase 3 en §14.8)** :

```typescript
{
  notifiedInApp: number;      // ex-notified (Phase 2)
  skippedExternal: number;
  skippedInactive: number;
  participantIds: string[];
  // Phase 3 : emailed, skippedNoEmail, emailFailed, teamsMeeting*, calendarEvent*
}
```

**Hooks internes** (service, pas de route supplémentaire) :

* `ProjectReviewsService.create` → si `PLANNED` + participants → `invite(..., { trigger: 'auto_create' })`.
* `ProjectReviewsService.update` → si `reviewDate` modifiée et statut `PLANNED` → `invite(..., { trigger: 'auto_date_change' })`.

> La route `invite` reste la **seule** entrée HTTP explicite ; les auto-triggers restent encapsulés dans le service revue.

## 13.7 Backend — fichiers à créer / modifier

**Créer**

* `apps/api/src/modules/projects/project-reviews/project-review-invitations.service.ts` — logique invite, composition message, boucle destinataires, mise à jour timestamps participant.
* `apps/api/src/modules/projects/project-reviews/dto/invite-project-review.dto.ts`
* `apps/api/src/modules/projects/project-reviews/dto/invite-project-review-result.dto.ts`
* `apps/api/prisma/migrations/20260705120000_proj_013_1_participant_invited_at/` — colonnes `invitedAt`, `lastInvitedAt`

**Modifier**

* `apps/api/prisma/schema.prisma` — champs participant (§13.5).
* `apps/api/src/modules/projects/project-reviews/project-reviews.module.ts` — provider `ProjectReviewInvitationsService` ; import **`NotificationsModule`** (ou accès `PrismaService` + `AuditLogsService` si helper minimal).
* `apps/api/src/modules/projects/project-reviews/project-reviews.controller.ts` — route `POST .../invite`.
* `apps/api/src/modules/projects/project-reviews/project-reviews.service.ts` — auto-triggers create/update date.
* `apps/api/src/modules/projects/project-reviews/project-reviews.constants.ts` (ou équivalent audit) — `PROJECT_REVIEW_AUDIT_INVITED = 'project.review.invited'`.
* `apps/api/src/modules/notifications/notifications.service.ts` — **optionnel mais recommandé** : `createForUser({ clientId, userId, ... })` factorisé.
* Mappers réponse participant — exposer `invitedAt`, `lastInvitedAt` au frontend.

## 13.8 Frontend — fichiers à créer / modifier

**Modifier**

* `apps/web/src/features/projects/api/project-reviews.api.ts` — `inviteProjectReview(projectId, reviewId, body?)`.
* `apps/web/src/features/projects/hooks/use-project-review-mutations.ts` — mutation `inviteReview` + invalidation liste participants / détail revue.
* `apps/web/src/features/projects/types/project.types.ts` — champs `invitedAt`, `lastInvitedAt` sur participant ; type résultat invite.
* `apps/web/src/features/projects/components/project-review-editor-dialog.tsx` — section **Invitations** visible si `status === 'PLANNED'` :
  * bouton « Inviter les participants » (`projects.update`) ;
  * résumé : « X participant(s) notifiable(s) » / « Y externe(s) non notifiable(s) in-app » ;
  * états loading / error / succès (`aria-live`) ;
  * **pas** d'affichage d'URL brute comme seule info.
* `apps/web/src/features/projects/components/review-participants-section.tsx` — badge « Notifié le {date} » si `lastInvitedAt` (libellé métier, date localisée).

**Comportement cloche**

* Aucun changement obligatoire sur `notification-bell.tsx` si `actionUrl` déjà géré — vérifier que le lien `/projects/...?openReview=...` ouvre bien l'éditeur (déjà Phase 1).

## 13.9 Tests

**Backend** (`project-review-invitations.service.spec.ts` + extensions) :

* Invite manuel `PLANNED` → N notifications `INFO`, audit `project.review.invited`, timestamps participant.
* Refus si statut ≠ `PLANNED`.
* Participant externe seul → `notified = 0`, `skippedExternal = 1`, pas d'erreur.
* `userId` inactif / hors client → `skippedInactive`.
* Auto create `PLANNED` avec 2 participants internes → 2 notifications.
* Changement `reviewDate` → re-notification tous internes.
* **Isolation client** : invite sur revue autre client → 404.
* **Sécurité contenu** : snapshot audit / metadata notification sans `meetingUrl`.
* Permission : utilisateur `projects.read` seul → 403 sur `POST invite`.

**Frontend** :

* Bouton visible uniquement en `PLANNED` ; masqué en `IN_REVIEW`.
* Toast succès avec compteurs ; erreur API affichée.
* Badge « Notifié le … » sur participant après succès.

## 13.10 Conformité by design (Phase 2)

### RGPD

* **DCP** : `userId` destinataire (référence utilisateur), pas d'email en Phase 2.
* **Finalité** : informer les participants internes d'une réunion planifiée.
* **Minimisation** : pas de `meetingUrl` dans notification / metadata / logs ; lieu texte limité (déjà `MaxLength(300)`).
* **Rétention** : notifications suivent RFC-038 ; participants cascade avec revue.
* **Effacement** : suppression utilisateur → `userId` participant `SetNull` (existant) ; notifications historiques conservées liées à `userId` (comportement RFC-038).

### RGAA

* Bouton « Inviter » : label explicite, cible ≥ 44px, `focus-visible`.
* Retour dynamique (compteurs, erreurs) via `aria-live="polite"`.
* Badge « Notifié » : texte + date, pas couleur seule.

### Design System

* Section `.starium-form-section` dans l'éditeur ; bouton `starium-btn` ; toasts existants.
* Libellés métier (nom participant, type point, mode réunion) — **jamais** UUID visible.

### Sécurité

* Authz `projects.update` ; scope client strict.
* DTO validé ; pas de `clientId` / `userId` destinataire arbitraire dans le payload (dérivés des participants de la revue).
* Audit sans fuite URL signée.

### Mobile

* Bouton Inviter pleine largeur < `sm` ; section empilée ; badge notifié lisible sur carte participant mobile.

## 13.11 Critères d'acceptation

- [x] Un organisateur peut inviter depuis une revue `PLANNED` ; les participants internes reçoivent une notification cloche cliquable vers le point.
- [x] Les externes ne reçoivent pas de notification ; le résumé API/UI l'indique clairement.
- [x] Replanifier (`reviewDate`) renvoie une notification aux internes.
- [x] `meetingUrl` absent des audits, metadata notification et logs.
- [x] Audit `project.review.invited` présent avec compteurs.
- [x] Tests backend isolation client + statut + contenu passent.
- [x] Documentation `docs/API.md` et `docs/modules/projects-mvp.md` mises à jour (route `invite`).

## 13.12 Ordre d'implémentation suggéré

1. Migration Prisma `invitedAt` / `lastInvitedAt`.
2. `ProjectReviewInvitationsService` + tests unitaires.
3. Route controller + constante audit.
4. Auto-triggers dans `ProjectReviewsService` (create / update date).
5. API client + mutation frontend.
6. UI éditeur + badges participants.
7. Sync doc (`API.md`, `_RFC Liste.md`, statut RFC → « Partiel Phase 1–2 »).

## 13.13 Dépendances et risques

| Risque | Mitigation |
| ------ | ---------- |
| Spam notifications si dates modifiées en rafale | Debounce côté UI ; côté serveur, comparer ancienne/nouvelle date (ignore si identique à la seconde près) |
| `NotificationsService` sans `create` | Ajouter helper centralisé ou service invitations isolé |
| Participants ajoutés après création sans auto-invite | Documenté §13.3.3 ; bouton manuel obligatoire |
| Fuite `meetingUrl` | Revue code + test assertion sur metadata/audit |
| Phase 3 email pour externes | Livré §14 — canal `email` opt-in ; UI explicite |

---

# 14. Plan d'implémentation Phase 3 — Email + Microsoft Teams / calendrier

> **Statut : livré (Phase 3).** Ce lot **étend** la Phase 2 sans la remplacer. Les participants internes reçoivent la notification in-app par défaut (`channels: ['in_app']`). Teams et calendrier ne se créent **pas** automatiquement lorsque Microsoft est actif — action explicite requise.

## 14.1 Objectif et périmètre

Compléter la diffusion d'invitation pour une revue **`PLANNED`** :

1. **Email** — notifier les participants **externes** (et optionnellement renforcer le canal pour les internes).
2. **Teams** — créer une réunion en ligne Microsoft et renseigner automatiquement `meetingUrl` (join URL officiel).
3. **Calendrier** — créer ou mettre à jour un événement Outlook invitant les participants éligibles.

### Sous-lots recommandés

| Sous-lot | Contenu | Peut être livré seul |
| -------- | ------- | -------------------- |
| **3a — Email** | Template mail, email externe, traçabilité `EmailDelivery`, opt-out minimal | ✅ Oui |
| **3b — Teams** | `onlineMeeting` Graph, persistance join URL, replanification | Non — dépend INT-005/007 + scopes |
| **3c — Calendrier** | `calendar/events`, attendees, replanification / annulation | Non — dépend 3b ou meetingUrl existant |

**Inclus (livré)**

* Orchestrateur d'invitation : **canaux** (`in_app` \| `email`) séparés des **actions Microsoft** (`createTeamsMeeting`, `createCalendarEvent`).
* Email aux externes via `externalEmail` ; email internes si canal `email` demandé.
* Création Teams **uniquement** si `createTeamsMeeting=true` + lien Microsoft + mode visio.
* Mise à jour `meetingUrl` depuis Graph avec protection `forceOverwriteMeetingUrl` si URL manuelle existante.
* Audits complémentaires sans fuite de token / join URL signé.

**Exclus (hors Phase 3 ou lot ultérieur)**

* Rappels automatiques J-1 / H-1 (job planifié — lot séparé).
* Opt-out granulaire par type « point projet » dans l'admin studio (V1 : respect `User.email` + flag client `emailInvitationsEnabled`).
* Synchronisation bidirectionnelle présence Teams → `attendanceStatus` (hors scope).
* Invitations SMS ou webhook tiers.

## 14.2 Analyse de l'existant

| Élément | État | Usage Phase 3 |
| ------- | ---- | --------------- |
| `ProjectReviewInvitationsService` | ✅ Phase 2–3 | Orchestrateur multi-canaux + délégation email / Microsoft |
| `POST .../invite` + auto-triggers | ✅ Phase 2–3 | Point d'entrée unique ; DTO Phase 3 (canaux + flags Microsoft) |
| `EmailService.queueEmail` | ✅ Phase 3 | Template **`project_review_invitation`** |
| `EmailDelivery` | ✅ Phase 3 | Colonne `projectReviewId` |
| `MicrosoftGraphService` | ✅ Phase 3 | `createOnlineMeeting`, `createCalendarEvent`, `patchCalendarEvent` |
| `MicrosoftOAuthService` | ✅ Phase 3 | Jeton connexion client (`MicrosoftConnection`) |
| `ProjectMicrosoftLink` | ✅ Phase 3 | Prérequis Teams/calendrier : `isEnabled`, connexion `ACTIVE` |
| Participants externes | ✅ Phase 3 | `externalEmail` (normalisé trim/lowercase) |
| `meetingUrl` sur `ProjectReview` | ✅ Phase 3 | Saisie manuelle ou Graph ; écrasement protégé |

**Hypothèse retenue** : ne pas créer de `ProjectReviewInvitation` dédiée en V1 — réutiliser `Notification` (in-app), `EmailDelivery` (email), champs Graph sur `ProjectReview` (Teams/calendrier), timestamps participant Phase 2.

## 14.3 Déclencheurs et règles métier

### 14.3.1 Canaux de notification vs actions Microsoft

| Élément | Cible | Prérequis / défaut |
| ----- | ----- | ------------------ |
| **`in_app`** (canal) | Participant avec `userId` actif | Défaut si `channels` absent |
| **`email`** (canal) | Externe `externalEmail` ou interne `User.email` | **Uniquement si** `channels` contient `email` ; SMTP ou log-only |
| **`createTeamsMeeting`** (action) | Revue `REMOTE`/`HYBRID` + lien Microsoft | Défaut **`false`** — opt-in explicite |
| **`createCalendarEvent`** (action) | Événement Outlook + attendees | Défaut **`false`** — opt-in explicite |

**DTO `InviteProjectReviewDto` (livré)** :

```typescript
{
  participantIds?: string[];
  channels?: ('in_app' | 'email')[];  // défaut = ['in_app'] ; whitelist stricte
  createTeamsMeeting?: boolean;       // défaut false
  createCalendarEvent?: boolean;      // défaut false
  forceOverwriteMeetingUrl?: boolean; // défaut false
}
```

> **`trigger` reste interne** (manual \| auto_create \| auto_date_change) — jamais exposé au client.

### 14.3.2 Qui reçoit quoi

| Participant | in_app (Phase 2) | email (Phase 3) | Teams / calendrier |
| ----------- | ---------------- | --------------- | ------------------ |
| Interne `userId` actif | ✅ | Option (email `User.email`) | Attendee Graph si email résolu |
| Externe `displayName` + `externalEmail` | ❌ (skippedExternal) | ✅ | Attendee si email fourni |
| Externe sans email | ❌ | `skippedNoEmail` | Ignoré |
| Inactif / hors client | `skippedInactive` | ❌ | ❌ |

### 14.3.3 Teams — création / replanification

* **Création** : uniquement si `createTeamsMeeting=true` (action explicite — **pas** auto lorsque M365 est actif).
* **Organisateur Graph (V1)** : `MicrosoftConnection.connectedByUserId` (connexion client) — pas de résolution facilitateur/acteur individuel.
* **Protection URL** : si `meetingUrl` manuel sans `microsoftOnlineMeetingId` → refus sauf `forceOverwriteMeetingUrl=true` + audit `overwrite_confirmed`.
* **Persistance** : `meetingUrl` ← join URL Graph ; `microsoftOnlineMeetingId`, `microsoftMeetingOrganizerUserId`.
* **Replanification calendrier** : `auto_date_change` + `microsoftEventId` existant → `patchCalendarEvent` ; sans `microsoftEventId` → pas de création auto.
* **Annulation** revue (`cancel`) : événement Graph laissé en place (V1 documenté).

### 14.3.4 Gestion des erreurs (alignée Phase 2)

| Contexte | Comportement |
| -------- | ------------ |
| `POST /invite` manuel | Erreur HTTP si canal demandé échoue **bloquant** (ex. Teams explicite) ; réponse partielle possible si canaux multiples avec détail par canal |
| `auto_create` / `auto_date_change` | Email / Teams en échec → **ne pas rollback** revue ; audit `project.review.invite_failed` / `project.review.teams_failed` |
| Partout | **Jamais** join URL / token Graph en clair dans audit, logs, metadata notification |

## 14.4 Email d'invitation

### 14.4.1 Template

* Nouveau template **`project_review_invitation`** dans `email.templates.ts` (sujet : « Point projet — {projectName} », corps : type, date, lieu, CTA vers `/projects/{projectId}?openReview={reviewId}`).
* **Join URL Teams** : lien bouton « Rejoindre la réunion » **uniquement** si `meetingUrl` présent — acceptable en email (destinataire invité) ; **interdit** dans notification in-app metadata (Phase 2 inchangée).

### 14.4.2 File d'envoi

* `EmailService.queueEmail({ clientId, recipient, templateKey: 'project_review_invitation', title, message, actionUrl })`.
* Lier optionnellement `EmailDelivery` à la revue via metadata interne ou colonne `projectReviewId` (migration additive recommandée).
* Compteurs réponse invite : `emailed`, `skippedNoEmail`, `emailFailed`.

### 14.4.3 RGPD email

* **Base légale** : intérêt légitime / exécution mission pilotage (à valider DPO client).
* **Minimisation** : email externe saisi uniquement pour invitation ; pas de revente / pas d'usage marketing.
* **Opt-out V1** : pas d'email si `User` a désactivé les notifications email client (flag à introduire) ou adresse absente.
* **Rétention** : `EmailDelivery` alignée politique existante ; purge/anonymisation `recipient` après délai configurable.

## 14.5 Microsoft Graph — réunion Teams

### 14.5.1 API Graph (indicatif)

```
POST /me/onlineMeetings
POST /users/{organizerId}/onlineMeetings   // si application permissions — hors V1 déléguée
```

Corps minimal : `startDateTime`, `endDateTime` (dérivés `reviewDate` + durée par défaut 60 min ou somme agenda), `subject` (titre revue).

### 14.5.2 Scopes OAuth additionnels

* `OnlineMeetings.ReadWrite` (délégué)
* `Calendars.ReadWrite` (si sous-lot 3c)

Documenter dans RFC-PROJ-INT-003 / consentement admin tenant.

### 14.5.3 Service dédié

* **`project-review-microsoft-meeting.service.ts`** (ou sous-module `microsoft/meetings/`) :
  * `createOrUpdateTeamsMeeting(clientId, projectId, reviewId, context)`
  * utilise `MicrosoftGraphService` + token organisateur
  * retourne `{ joinUrl, onlineMeetingId }`
  * **ne pas** logger `joinUrl`

## 14.6 Événement calendrier

```
POST /me/events
{
  subject, start, end, location?,
  onlineMeeting: { joinUrl } | null,
  attendees: [{ emailAddress, type: required | optional }]
}
```

* Persister **`microsoftEventId`**, **`microsoftCalendarId`** (optionnel) sur `ProjectReview`.
* Replanification : PATCH event si IDs présents.
* Participants : emails résolus (`User.email` ou `externalEmail`) — **jamais** d'UUID en attendee Graph.

## 14.7 Modèle de données (évolution Prisma)

**Migration additive** :

```prisma
model ProjectReviewParticipant {
  // … Phase 1–2 …
  externalEmail String?   // DCP — email externe pour invitation Phase 3
  lastEmailedAt DateTime?
}

model ProjectReview {
  // … Phase 1 …
  microsoftOnlineMeetingId String?
  microsoftEventId         String?
  microsoftMeetingOrganizerUserId String?  // User Starium ayant créé via Graph
}
```

Contraintes :

* `externalEmail` : `@IsEmail`, `@MaxLength(320)`, validation serveur ; commentaire Prisma **DCP**.
* Index optionnel `(clientId, microsoftEventId)` si requêtes de sync.

## 14.8 API

| Méthode | Route | Évolution |
| ------- | ----- | --------- |
| `POST` | `…/reviews/:reviewId/invite` | Body : `channels?`, `createTeamsMeeting?`, `createCalendarEvent?`, `forceOverwriteMeetingUrl?` |
| `PATCH` | `…/reviews/:reviewId/participants/:id` | Accepte `externalEmail` (externes uniquement) |

**Réponse `InviteProjectReviewResultDto` (livré)** :

```typescript
{
  notifiedInApp: number;
  skippedExternal: number;
  skippedInactive: number;
  participantIds: string[];
  emailed: number;
  skippedNoEmail: number;
  emailFailed: number;
  emailDisabled?: boolean;
  teamsMeetingCreated: boolean;
  teamsMeetingUpdated: boolean;
  teamsMeetingSkipped: boolean;
  calendarEventCreated: boolean;
  calendarEventUpdated: boolean;
  calendarEventSkipped: boolean;
}
```

> Route optionnelle `POST …/create-teams-meeting` : **non implémentée** — Teams via `createTeamsMeeting` sur `invite`.

## 14.9 Backend — fichiers livrés

**Créés** : `project-review-microsoft-meeting.service.ts`, `project-review-email-invitations.service.ts`, `project-review-invitation-privacy.helpers.ts`, migration `20260705140000`, template `project_review_invitation`, specs associées.

**Modifiés** : `project-review-invitations.service.ts`, DTOs invite/participants/résultat, `microsoft-graph.service.ts`, `microsoft.constants.ts` (scopes), `email.templates.ts`, `email.service.ts`, `project-audit.constants.ts`, `projects.module.ts` (`EmailModule`, `MicrosoftModule`).

## 14.10 Frontend (livré)

* `review-participants-section.tsx` — `externalEmail` externes, badges `lastEmailedAt`.
* `review-invitations-section.tsx` — cases **notification** (in-app, email) vs **actions Microsoft** (Teams, calendrier) ; confirmation overwrite URL ; `aria-live`.
* `project-review-editor-dialog.tsx` — props réunion + badge Teams.
* `project-reviews.api.ts` / mutations — body/réponse Phase 3.

**RGAA**

* Cases canaux avec `<label>` ; annonce résultats `aria-live` ; pas d'URL brute comme seule info (bouton « Rejoindre »).

## 14.11 Tests

**Backend**

* Invite externe avec email → `EmailDelivery` PENDING, `emailed=1`, in_app `skippedExternal` inchangé
* Externe sans email → `skippedNoEmail`, pas de crash
* Teams : mock Graph → `meetingUrl` persisté, audit sans join URL en clair
* Replanification date → PATCH event ou recréation selon IDs
* Cross-client / statut ≠ PLANNED → refus
* Auto-triggers : email/Teams échoue → revue conservée

**Frontend**

* Champ email visible pour externe ; masqué pour interne (email dérivé User)
* Options Teams désactivées si pas de lien Microsoft

## 14.12 Conformité by design (Phase 3)

### RGPD

* **DCP** : `externalEmail`, emails utilisateurs, attendees calendrier.
* **Finalité** : convocation réunion de pilotage uniquement.
* **Minimisation** : email externe optionnel jusqu'à invite ; pas de copie cachée.
* **Logs / audit** : pas de join URL signé ; pseudonymiser emails dans logs (`j***@example.com`).

### RGAA

* Formulaire email externe : label, `aria-invalid`, erreurs explicites.
* Canaux invitation : checkboxes natives, focus visible.

### Design System

* Réutiliser `.starium-form-section`, `starium-btn`, toasts ; libellés métier (nom participant, pas UUID).

### Sécurité

* Authz `projects.update` ; token Graph **jamais** exposé API ; scopes minimaux.
* Validation email ; isolation client sur toutes les opérations Graph.

### Mobile

* Champ email pleine largeur ; options canaux empilées ; CTA Teams ≥ 44px.

## 14.13 Critères d'acceptation

- [x] Un organisateur peut inviter un **externe par email** depuis une revue `PLANNED`.
- [x] Avec Microsoft actif, une réunion Teams peut être créée (opt-in) et le **join URL** renseigne `meetingUrl`.
- [x] Un événement calendrier peut être créé (opt-in) avec les attendees résolus (emails).
- [x] Replanifier `reviewDate` met à jour l'événement si `microsoftEventId` Starium existe (auto-triggers).
- [x] Canaux in-app Phase 2 **inchangés** par défaut (`channels: ['in_app']`).
- [x] Audits / logs sans join URL ni token Graph.
- [x] Tests backend canaux + isolation client passent (40 tests project-review).
- [x] `docs/API.md` et `docs/modules/projects-mvp.md` mis à jour.

## 14.14 Ordre d'implémentation suggéré

1. Migration Prisma (`externalEmail`, champs Graph revue, optional `EmailDelivery.projectReviewId`).
2. Template email + service email invitations + tests.
3. Extension DTO / résultat invite + UI email externe.
4. Helpers Graph (onlineMeeting) + `project-review-microsoft-meeting.service.ts`.
5. Événement calendrier + replanification.
6. Orchestration multi-canaux dans `ProjectReviewInvitationsService`.
7. UI canaux + bouton Teams ; doc API + `_RFC Liste.md`.

## 14.15 Dépendances et risques

| Risque | Mitigation |
| ------ | ---------- |
| SMTP absent en dev | Mode log-only documenté ; canal email désactivé si `EmailService.isLogOnlyMode()` |
| Consentement Graph insuffisant | Vérifier scopes à l'invite ; message UI « reconnecter Microsoft » |
| Organisateur sans compte Microsoft | Fallback facilitateur ; sinon désactiver Teams avec message clair |
| Join URL différent manuel vs Graph | UX : avertir avant écrasement `meetingUrl` |
| Spam email sur replanifications | Même garde-fou date (seconde près) ; debounce UI |
| Complexité orchestrateur | Sous-services email / Teams ; tests unitaires par canal |
