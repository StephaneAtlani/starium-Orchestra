# RFC-PROJ-013-1 — Cycle de vie réunion Point projet (planification, invitations, tenue)

## Statut

Proposé (à faire) — extension de **RFC-PROJ-013**

## Périmètre de ce lot

> **Ce lot n'implémente QUE la Phase 1.** Les Phases 2 (invitations in-app) et 3 (email / Microsoft Graph / Teams / calendrier) sont décrites **uniquement comme trajectoire future** : aucun fichier n'est créé ou modifié pour elles dans ce lot, aucune route, aucun branchement `NotificationsService`, aucun appel Microsoft Graph. Elles feront l'objet de RFC/lots distincts.

## Dépendances

* **RFC-PROJ-013** — Points Projet COPIL/COPRO et Historisation (socle : `ProjectReview`, participants, décisions, actions, snapshot, éditeur)
* RFC-PROJ-001 — Cadrage fonctionnel Projets
* RFC-PROJ-009 — Audit logs
* RFC-PROJ-012 — Project Sheet

**Dépendances de trajectoire future (hors de ce lot) :**

* Module transverse `notifications` (in-app) — **Phase 2 future**
* RFC-PROJ-INT-001 / INT-005 / INT-007 — Intégration Microsoft 365 — **Phase 3 future**

---

# 1. Objectif

Aligner le module **Point projet** sur le **cycle de vie réel d'une réunion de pilotage** :

1. **Préparer** le point : participants, ordre du jour / éléments à trancher / actions à revoir, type (COPIL, COPRO, …).
2. **Inviter** : diffuser une invitation avec le **lien de réunion** (visio) **+ le lien vers le point projet**, ou marquer un point **présentiel** (avec lieu).
3. **Tenir** la réunion le jour J, puis **passer en revue** le point et le finaliser.

👉 Le point projet doit distinguer une **réunion planifiée** (à venir, invitée) d'un **compte rendu en cours de saisie**, puis d'un **point figé** (historisé).

---

# 2. Problème adressé

Aujourd'hui (RFC-PROJ-013 implémenté) :

* « Créer un point » crée immédiatement un `ProjectReview` en `DRAFT` **et** ouvre l'éditeur du compte rendu.
* Le statut `DRAFT` **fusionne** deux phases distinctes : « réunion planifiée / à venir » et « compte rendu en cours ».
* **Aucun champ** ne porte le **mode** (visio / présentiel / hybride), le **lien de réunion** ou le **lieu**.
* **Aucune invitation** n'est diffusée aux participants (le module `notifications` in-app existe mais n'est pas branché ; aucun email ; aucune réunion Teams/calendrier).

Conséquence : impossible de piloter un point « à venir » distinct d'un point « à saisir », ni de convier les participants depuis Starium.

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

**Seule la Phase 1 est implémentée dans ce lot.** Les Phases 2 et 3 sont documentées comme **trajectoire future** (aucun fichier modifié dans ce lot).

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

## 4.4 Phase 2 — Invitations in-app (TRAJECTOIRE FUTURE — hors de ce lot)

> **Non implémenté dans ce lot. Aucun fichier modifié.** Décrit pour la trajectoire seulement.

* À la planification / au changement de date, émettre une **notification in-app** (`NotificationsService`) à chaque participant ayant un `userId` plateforme.
* Contenu : type de point, date, mode + lien réunion, **deep link `?openReview=<id>`**.
* Participants « nom libre » (externes) : pas de notif in-app (couvert par email en Phase 3).
* Fera l'objet d'un lot dédié (route `invite`, audit `project.review.invited`).

## 4.5 Phase 3 — Email + réunion Microsoft (TRAJECTOIRE FUTURE — hors de ce lot)

> **Non implémenté dans ce lot. Aucun fichier modifié.** Décrit pour la trajectoire seulement.

* **Email d'invitation** : nécessite un transport mail (aucun mailer câblé aujourd'hui). Templates, opt-out, RGPD.
* **Réunion Teams / événement calendrier** : extension de `microsoft-graph.service` (`onlineMeetings` / `calendar events`), scopes Graph, consentement tenant.
* Persisterait le `meetingUrl` renvoyé par Graph (join URL) sur le `ProjectReview`.

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
| `GET`   | `/projects/:projectId/reviews[/:reviewId]` | `projects.read` | Retourne les nouveaux champs |

> Route `invite` = **Phase 2 (hors de ce lot)**, non implémentée ici.

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
| **2** | Invitations **in-app** (module `notifications`) | ❌ Hors de ce lot — trajectoire future | `NotificationsService` (existant) |
| **3** | Email + réunion Teams/calendrier | ❌ Hors de ce lot — trajectoire future | Mailer + Microsoft Graph (à câbler) |

La Phase 1 matérialise à elle seule le workflow « préparer → tenir → acter » (le « lien vers le point » reste le deep link `?openReview=`), sans aucune dépendance d'infrastructure. Les invitations (in-app puis email/Teams) sont explicitement reportées.
