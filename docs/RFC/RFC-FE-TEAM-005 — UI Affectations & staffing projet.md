# RFC-FE-TEAM-005 — UI Affectations & staffing projet

## Statut

| Volet | État |
| --- | --- |
| **Vue module Équipes** — `/teams/assignments` (API TEAM-007) | ✅ Implémentée (MVP FE) |
| **Vue projet** — `/projects/[projectId]/staffing`, onglet **Charge** (API TEAM-008) | ✅ Implémentée (MVP FE) |
| **Composants partagés** — `features/teams/team-assignments/` (table, dialog, hooks, API client) | ✅ Implémentée (MVP FE) |
| Navigation **Équipes** — sous-menu **Affectations** (`team_assignments.read` dans le parent `any`) | ✅ Implémentée |
| **Encart fiche collaborateur** (aperçu + lien filtré) | ❌ P1 / hors MVP (non livré) |
| **`projectTeamRoleId`** en UI | ❌ P1 / hors MVP (non livré) |

## Implémentation livrée (référence code)

- **Feature** : [`apps/web/src/features/teams/team-assignments/`](../../apps/web/src/features/teams/team-assignments/) — `api/team-assignments.api.ts`, `api/activity-types.api.ts`, `types/`, `hooks/`, `components/` (`team-assignments-table`, `team-assignment-form-dialog`, `team-assignment-status-badge`, `team-assignments-list-view`), `lib/` (`team-assignment-query-keys`, `team-assignment-label-mappers`, `team-assignment-list-query`).
- **Pages** : [`apps/web/src/app/(protected)/teams/assignments/page.tsx`](../../apps/web/src/app/(protected)/teams/assignments/page.tsx), [`apps/web/src/app/(protected)/projects/[projectId]/staffing/page.tsx`](../../apps/web/src/app/(protected)/projects/[projectId]/staffing/page.tsx).
- **Projet** : [`project-staffing-view.tsx`](../../apps/web/src/features/projects/components/project-staffing-view.tsx), [`project-workspace-tabs.tsx`](../../apps/web/src/features/projects/components/project-workspace-tabs.tsx) (onglet Charge), [`project-routes.ts`](../../apps/web/src/features/projects/constants/project-routes.ts) (`projectStaffing`).
- **Navigation** : [`navigation.ts`](../../apps/web/src/config/navigation.ts), [`sidebar.tsx`](../../apps/web/src/components/shell/sidebar.tsx), [`equipes-nav-helpers.ts`](../../apps/web/src/components/shell/equipes-nav-helpers.ts).
- **Permissions UI** : lecture `team_assignments.read` ; écriture `team_assignments.manage` ; selects types d’activité et actions de création/édition si `activity_types.read` absent → message métier, pas d’écriture (voir plan MVP).
- **Tests** : `*.spec.ts` sous `team-assignments/lib/` ; `equipes-nav-helpers.spec.ts`, `navigation.spec.ts`, `navigation-visibility.spec.ts` (non-régression parent Équipes).

Les endpoints **GET** détail par `id` sont exposés dans le client API ; l’UI MVP édite à partir des lignes liste (pas de refetch détail obligatoire).

## Priorité

Très haute — **Phase 3** du plan Équipes (voir [`_Plan de déploiement - Equipe.md`](./_Plan%20de%20d%C3%A9ploiement%20-%20Equipe.md)) ; cœur UX du **staffing planifié** après livraison backend **RFC-TEAM-007** et **RFC-TEAM-008**.

## Dépendances

- **RFC-TEAM-007** — [`/api/team-resource-assignments`](../../docs/API.md) — liste paginée, CRUD, annulation ; permissions `team_assignments.read` / `team_assignments.manage`
- **RFC-TEAM-008** — [`/api/projects/:projectId/resource-assignments`](../../docs/API.md) — même métier, `projectId` imposé par l’URL
- **RFC-TEAM-006** — types d’activité (`ActivityType`) — selects obligatoires côté formulaire
- **RFC-TEAM-002** — collaborateurs — combobox / options enrichies (`displayName`, etc.)
- Module **Projets** — accès fiche projet, `projectCode` / `name` pour affichage
- **RFC-FE-TEAM-001** — fondations `features/teams`, patterns React Query, client actif
- **RFC-FE-TEAM-002** — fiche collaborateur — bloc **« Affectations »** (résumé + lien filtré) **P1**, non livré dans le MVP courant
- **RFC-FE-TEAM-004** (optionnel mais recommandé) — détail équipe métier : lien ou préfiltre vers affectations des **membres** (voir §4.5)
- `docs/ARCHITECTURE.md` — `X-Client-Id`, API-first
- `docs/FRONTEND_UI-UX.md` — états loading / error / empty, fiche projet, onglets workspace
- `.cursorrules` / `inputs-value-not-id.mdc` — **libellé métier partout**, jamais UUID seul

---

# 1. Analyse de l’existant

**Constat backend** — Les entités et routes sont **livré** :

- Une seule vérité métier : `TeamResourceAssignment` (période, `%` charge, rôle, type d’activité, projet optionnel).
- **Deux façons d’appeler l’API** (même service Nest) :
  1. **Globale (client)** : `GET/POST/PATCH … /api/team-resource-assignments` — le body peut fixer ou omettre `projectId` (règles TEAM-007 : projet vs hors projet / taxonomie).
  2. **Contextualisée projet** : `GET/POST/PATCH … /api/projects/:projectId/resource-assignments` — `projectId` **verrouillé** par l’URL ; pas de `projectId` dans le corps.

**Constat frontend** — Livré : pages `/teams/assignments` et `/projects/[projectId]/staffing`, onglet **Charge** dans `ProjectWorkspaceTabs`, navigation Équipes **Affectations**.

**Objectif produit** — Offrir **deux parcours complémentaires** :

| Parcours | Point d’entrée | API utilisée | Cas d’usage |
| --- | --- | --- | --- |
| **A. Depuis le module Équipes** | Menu Équipes → **Affectations** (ou **Charge planifiée**) ; fiche collaborateur ; (optionnel) fiche équipe métier | Principalement **`/api/team-resource-assignments`** | Staffer un collaborateur sur un projet **ou** une charge hors projet ; vue transverse filtrable par collaborateur, projet, période, type d’activité |
| **B. Depuis le projet** | Fiche / workspace projet → onglet **Charge** ou **Staffing** | **`/api/projects/:projectId/resource-assignments`** | Le responsable ou le rôle staffing travaille **dans le contexte du projet** : liste déjà filtrée, création sans ambiguïté sur le projet cible |

Les deux parcours doivent **réutiliser les mêmes composants** (tableau, ligne, dialogue création/édition, annulation) pour éviter divergence fonctionnelle et réduire la dette UX.

---

# 2. Hypothèses éventuelles

- Les **DTO de réponse** exposent les champs d’affichage décrits dans TEAM-007 (`collaboratorDisplayName`, `projectName`, `projectCode`, `activityTypeName`, `activityTypeKind`, etc.) ; en cas d’écart, aligner le client API TypeScript sur `docs/API.md` et le backend.
- **Permissions UI** : afficher les entrées navigation et les actions si `team_assignments.read` (lecture) et `team_assignments.manage` (création / édition / annulation). L’accès à la **fiche projet** reste conditionné au module Projets ; l’appel API staffing peut nécessiter **les deux** contextes (utilisateur sans `projects.read` ne voit pas l’onglet projet même avec `team_assignments.*` — comportement à assumer explicitement).
- **Filtre par équipe métier (`workTeamId`)** : non garanti dans TEAM-007 ; **MVP** — liste globale + filtres `collaboratorId`, `projectId`, plage temporelle. Une évolution **filtre équipe** = extension API ultérieure ou agrégation côté client à partir des membres d’équipe (appels multiples documentés comme limite).
- **Un seul libellé produit** pour l’utilisateur : privilégier **« Affectation »**, **« Charge planifiée »** ou **« Staffing »** de façon cohérente dans les menus ; éviter le terme seul **« ressource »** (ambigu avec le référentiel technique `Resource`), conformément TEAM-007/008.
- **Convention dates** — suivre celle documentée côté API (fin inclusive ou intervalle) ; l’UI affiche des **dates calendaires** claires et la même sémantique dans les deux parcours.

---

# 3. Liste des fichiers à créer / modifier

## Frontend (cible livraison)

- `apps/web/src/features/teams/team-assignments/` (nom exact aligné sur le module API : `team-assignments`)
  - `api/team-assignments.api.ts` — wrappers `GET/POST/PATCH` + `cancel` pour **les deux** bases d’URL (fonctions distinctes ou paramètre `mode: 'global' | 'project'` + `projectId`)
  - `types/team-assignment.types.ts` — types réponse / payload alignés backend
  - `lib/team-assignment-query-keys.ts` — clés incluant **`clientId`** et, si pertinent, **`projectId`**
  - `hooks/*` — liste, détail, mutations (invalidation croisée global ↔ projet)
  - `components/*` :
    - `team-assignments-table.tsx` — colonnes métier (voir §4)
    - `team-assignment-form-dialog.tsx` (ou `Sheet`) — champs formulaire partagés
    - `team-assignment-status-badge.tsx` — actif / annulé (`cancelledAt`)
    - `lib/team-assignment-label-mappers.ts` — kinds d’activité, formatage %, période
  - variante projet : `ProjectStaffingView` + réutilisation table/dialog (pas de panneau séparé `project-resource-assignments-panel`)
- `apps/web/src/app/(protected)/teams/assignments/page.tsx` — **liste globale** (parcours A)
- `apps/web/src/features/projects/constants/project-routes.ts` — route onglet / sous-chemin staffing (si route dédiée)
- `apps/web/src/app/(protected)/projects/...` — intégration onglet **Charge / Staffing** dans le layout workspace existant (voir §4.4)
- `apps/web/src/features/projects/components/project-workspace-tabs.tsx` — ajout lien onglet + icône
- `apps/web/src/features/teams/collaborators/...` — encart **Affectations** (P1, non livré MVP)
- `apps/web/src/components/shell/sidebar.tsx` + `apps/web/src/config/navigation.ts` — entrée **Équipes** → Affectations ; `requiredPermissions` `team_assignments.read` (et règles `isTeamsChildActive` / équivalent)

## Documentation

- Ce document ; `docs/ARCHITECTURE.md` ; `docs/API.md` (pointeur UI) ; `_Plan de déploiement - Equipe.md` — synchronisés avec l’implémentation MVP.

---

# 4. Implémentation complète

## 4.1 Règle UX obligatoire : valeur métier, jamais ID

- **Collaborateur** : `displayName` (+ email secondaire en sous-texte optionnel) dans combobox et colonnes.
- **Projet** : `name` + `code` (badge ou sous-titre) ; si hors projet, libellé explicite du type d’activité (ex. RUN / SUPPORT) sans laisser une cellule vide ambiguë.
- **Type d’activité** : nom + **badge** `kind` (couleurs/token depuis design system).
- **Rôle** : `roleLabel` texte ; si `projectTeamRoleId` utilisé, afficher le libellé résolu par l’API.
- **Taux** : `allocationPercent` formaté (ex. « 50 % »).
- **Période** : plage lisible (fuseau / date-only selon conventions app).
- Aucune colonne « id » visible ; tooltips debug réservés au mode dev si existant.

## 4.2 Parcours A — Module Équipes (API globale)

### Route proposée

| Route | Rôle |
| --- | --- |
| `/teams/assignments` | Page principale : **tableau paginé**, filtres (ressource humaine, projet, type d’activité, plage `from`/`to`, `activeOn`, `includeCancelled`), actions créer / éditer / annuler |

### Filtres (query alignée TEAM-007)

Exposer dans l’UI les filtres supportés par `GET /api/team-resource-assignments` : **`resourceId`** (Resource HUMAN), `projectId`, `activityTypeId`, `from`, `to`, `activeOn`, `includeCancelled`, pagination `limit`/`offset`.

### Formulaire création / édition (global)

- `resourceId` — obligatoire ; Combobox **Resource HUMAN** (libellé nom/prénom, pas d’UUID seul en UI — RFC-TEAM-020).
- `projectId` — **optionnel** ; si renseigné, afficher sélecteur projet (nom + code). Si vide : affectation **hors projet** ; dans ce cas `activityTypeId` doit respecter les règles TEAM-007 (kind ≠ PROJECT selon validation backend).
- `activityTypeId` — obligatoire ; liste des `ActivityType` du client avec filtrage contextuel (si projet sélectionné → privilégier kinds PROJECT ou règle seed).
- `roleLabel`, `startDate`, `endDate?`, `allocationPercent`, `projectTeamRoleId?`, `notes?` — comme DTO backend.

Les erreurs **400** métier (incohérence projet / taxonomie) doivent afficher le **message** renvoyé par l’API, pas un libellé générique seul.

### Annulation

- Action **Annuler** (destructive douce) → `POST /api/team-resource-assignments/:id/cancel` ; état ligne **annulé** avec `cancelledAt` ; toggle liste « inclure annulées ».

## 4.3 Parcours B — Depuis le projet (API projet-scopée)

### Emplacement UI

- Ajouter un onglet dans **`ProjectWorkspaceTabs`** (ex. **« Charge »** ou **« Staffing »**) pointant vers une route du type :
  - `/projects/[projectId]/.../staffing` **ou**
  - même URL workspace avec segment dédié cohérent avec `project-routes.ts`

### Comportement

- **Liste** : `GET /api/projects/:projectId/resource-assignments` uniquement — pas de sélecteur de projet dans le formulaire.
- **Création** : `POST` même base ; body **sans** `projectId` ; champs alignés sur `CreateProjectResourceAssignmentDto`.
- **Édition / détail / annulation** : chemins TEAM-008 ; vérifier **404** si `assignmentId` n’appartient pas au projet (anti-énumération) → message utilisateur neutre.

### Préremplissage

- À l’ouverture du formulaire création depuis le projet : pré-sélectionner le **`ActivityType`** par défaut `kind === PROJECT` pour le client (TEAM-006 / seed) si disponible ; laisser l’utilisateur changer si plusieurs lignes.

### Réutilisation

- **`TeamAssignmentsTable`** reçoit une prop `variant: 'global' | 'project'` : en `project`, masquer colonne « Projet » ou la remplacer par un rappel compact du projet courant dans le header de page uniquement.

## 4.4 Cohérence cache (React Query)

- Mutation depuis **projet** : invalider `['team-assignments', clientId, { projectId }]` **et** `['team-assignments', clientId]` (liste globale).
- Mutation depuis **global** : invalider selon `projectId` touché pour rafraîchir les vues projet ouvertes.
- Changement de **client actif** : purge des clés `team-assignments` (pattern déjà utilisé ailleurs dans le module Équipes).

## 4.5 Intégrations secondaires (recommandées)

- **Fiche collaborateur** (`/teams/collaborators/[id]`) : bloc **Affectations** — sous-ensemble des lignes (3–5 dernières) + lien « Voir tout » vers `/teams/assignments?resourceId=...` (ID de la **Resource HUMAN** liée au collaborateur, pas l’ID collaborateur seul dans la query).
- **Fiche équipe métier** (RFC-FE-TEAM-004) : lien « Affectations des membres » → soit page globale avec instruction utilisateur (sélectionner un membre), soit **v2** avec filtre backend par équipe.

## 4.6 Permissions et états

- **403** / **404** : messages métier ; pas de dump JSON.
- **Empty state** global : illustration courte + CTA « Créer une affectation » si `team_assignments.manage`.
- **Empty state** projet : même logique + rappel que le **roster** projet (`ProjectTeamMember`) est distinct de la **charge planifiée** (texte d’aide une ligne).

---

# 5. Modifications Prisma si nécessaire

**Aucune** — cette RFC est **frontend uniquement**. Le modèle et les migrations sont couverts par **RFC-TEAM-007**.

---

# 6. Tests

## 6.1 Unitaires

- Query keys : présence systématique de `clientId` ; pour variante projet, présence de `projectId`.
- Mappers : `activityTypeKind` → libellé / variante badge ; format `%` et dates.
- Helpers : construction URL API — pas de `projectId` dans le body des appels projet-scopés.

## 6.2 Composants / intégration

- Tableau : colonnes affichent des **libellés** ; aucun UUID en texte visible.
- Formulaire projet : absence de champ **projet** modifiable.
- Après création depuis projet, la liste globale (mock) reçoit bien une invalidation déclenchée (si test d’intégration disponible).

## 6.3 Non-régression

- Navigation projet existante (Synthèse, Fiche, Planning, etc.) inchangée hors ajout d’onglet.
- Liste collaborateurs et compétences non cassées.

---

# 7. Récapitulatif final

**RFC-FE-TEAM-005** couvre l’UI des **affectations planifiées** : parcours **module Équipes** (`/teams/assignments`, API TEAM-007), parcours **projet** (`/projects/[projectId]/staffing`, API TEAM-008), **composants partagés** sous `features/teams/team-assignments/`, **multi-client**, permissions **`team_assignments.*`** + **`activity_types.read`** pour les selects et écritures, **libellés métier** en tableau et listes de choix. **P1** : encart collaborateur, sélecteur `projectTeamRoleId`. La logique métier reste **backend** (TEAM-007 / 008).

---

# 8. Points de vigilance

- **Ne pas dupliquer les règles** projet vs taxonomie côté UI : la validation définitive reste **serveur** ; l’UI peut assister par filtres de selects (ex. kinds compatibles).
- **Permissions** : l’objectif métier « le responsable projet staff son projet » suppose que les profils cibles aient bien **`team_assignments.manage`** (et accès projet si onglet dans le workspace) — à valider côté **seed / profils** sans assouplir l’isolation client.
- **Performance** : listes paginées ; ne pas charger l’intégralité des collaborateurs sans recherche / pagination.
- **Parité fonctionnelle** : toute action disponible en global doit l’être en contexte projet pour les champs métier (sauf sélection du projet, implicite).
- **RFC-FE-TEAM-004** référence historique : le fichier mentionne « RFC-FE-TEAM-007 » pour la vue Manager — la numérotation **vue Manager** est **RFC-FE-TEAM-007** dans le plan ; ne pas confondre avec cette RFC (**005**).

---

# 9. Références croisées

- [RFC-TEAM-007](./RFC-TEAM-007%20%E2%80%94%20Affectations%20ressources.md)
- [RFC-TEAM-008](./RFC-TEAM-008%20%E2%80%94%20Staffing%20projet%20par%20manager%20responsable%20projet.md)
- [RFC-FE-TEAM-004](./RFC-FE-TEAM-004%20%E2%80%94%20UI%20%C3%89quipes%20scopes%20managers.md)
- Plan : [`docs/RFC/_Plan de déploiement - Equipe.md`](./_Plan%20de%20d%C3%A9ploiement%20-%20Equipe.md)
- API : [`docs/API.md`](../API.md) — sections TEAM-007 et TEAM-008
