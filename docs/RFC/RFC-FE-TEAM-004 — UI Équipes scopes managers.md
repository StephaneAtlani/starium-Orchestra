# RFC-FE-TEAM-004 — UI Équipes / scopes managers

## Statut

| Volet | État |
| --- | --- |
| **Référentiel équipes métier** (CRUD, hiérarchie, statut) | ✅ MVP FE — `/teams/structure/teams` (liste + vue arbre), détail, archivage/restauration (`teams.update`) |
| **Rattachements** collaborateur ↔ équipe (côté équipe) | ✅ MVP FE — membres sur la fiche équipe (`GET/POST/PATCH/DELETE` membres) |
| **Périmètres managers** (direct / étendu, racines d’équipes) | ✅ MVP FE — `/teams/structure/manager-scopes` (lecture + PUT si `teams.manage_scopes`, preview) |
| Navigation **Équipes** (entrée « Structure & équipes ») | ✅ MVP FE — sidebar si `teams.read`, parent Équipes avec `teams.read` en `any` ([`navigation.ts`](../../apps/web/src/config/navigation.ts)) |
| Encart **équipes** sur fiche collaborateur (`GET /collaborators/:id/work-teams`) | ❌ Hors MVP — lot suivant (RFC-FE-TEAM-004b ou fiche collaborateur dédiée) |

**Référence code (web)** : `apps/web/src/features/teams/work-teams/` (API client, query keys, hooks, composants) ; routes `apps/web/src/app/(protected)/teams/structure/` ; redirection `/teams/structure` → `/teams/structure/teams`. Backend : **RFC-TEAM-005** (inchangé).

## Priorité

Haute (Phase 3 — staffing et affectations ; prérequis pour vues manager ultérieures RFC-TEAM-013 / RFC-FE-TEAM-007)

## Dépendances

- **RFC-TEAM-005** — Référentiel Équipes / périmètres managers (API + Prisma + RBAC) — **prérequis backend** (livré) ; consommation FE via `/api/work-teams`, `/api/manager-scopes`, etc.
- RFC-TEAM-002 — Référentiel Collaborateurs (affichage collaborateurs, options, relation manager hiérarchique)
- RFC-FE-TEAM-001 — Frontend Foundation — Équipes
- RFC-FE-TEAM-002 — UI Collaborateurs
- `docs/ARCHITECTURE.md` — multi-client, `X-Client-Id`, API-first
- `docs/FRONTEND_UI-UX.md` — états loading / error / empty, tokens, patterns liste / formulaires
- `.cursorrules` — **inputs / référentiels** : libellé métier visible, jamais UUID ou ID seul en UI

---

# 1. Analyse de l’existant

**Constat produit** (`docs/RFC/_Plan de déploiement - Equipe.md`) : le lot **RFC-TEAM-005** couvre la définition des équipes métier, le rattachement des collaborateurs et les scopes managers (équipe directe / étendue). Le **MVP FE** consomme ces APIs sous `/api/work-teams`, `/api/manager-scopes`, etc.

**Frontend (état au MVP livré)** :

- Routes sous `/teams/*` : `collaborators`, `skills`, **`structure`** (liste / détail équipes, périmètres managers — voir statut ci-dessus).
- Sidebar **Equipes** : **Collaborateurs**, **Catalogue compétences**, **Structure & équipes** si `teams.read` (`sidebar.tsx` ; parent avec `teams.read` en `any` avec `collaborators.read` / `skills.read`).
- **Vue inverse** collaborateurs ↔ équipes sur la fiche collaborateur : **hors MVP** (lot suivant).

**Objectif de cette RFC** : spécifier l’UI pour :

1. **Référentiel des équipes** — création, édition, archivage, hiérarchie (parent / enfants), responsable d’équipe optionnel, codes libellés lisibles.
2. **Rattachements** — associer un ou plusieurs collaborateurs à une ou plusieurs équipes, avec rôle métier simple si le backend l’expose (ex. membre / référent), et vue inverse depuis la fiche collaborateur.
3. **Périmètres managers** — écran ou panneau de configuration du **scope** de pilotage : collaboreurs **directs** (hiérarchie `managerId`) vs **équipe étendue** (sous-arborescence d’équipes, listes explicites, etc. selon RFC-TEAM-005).

Cette UI alimente ensuite les lots **affectations** (RFC-FE-TEAM-005) et **vue Manager** (RFC-FE-TEAM-007).

---

# 2. Hypothèses éventuelles

- Les **chemins et DTO** REST sont **canonisés par RFC-TEAM-005** ; les sections ci-dessous décrivent le **minimum attendu** côté UI. En cas d’écart, le backend et la RFC-TEAM-005 priment ; le frontend adapte types + client API.
- Permissions dédiées du type `teams.read` / `teams.update` (noms exacts à figer côté backend) : **lecture** pour consulter structure et rattachements ; **écriture** pour CRUD équipes et rattachements ; **scopes managers** possiblement réservé aux rôles `CLIENT_ADMIN` ou permission fine — à verrouiller en RFC-TEAM-005.
- Toutes les réponses liste / détail incluent les **champs de libellé** pour entités liées : `displayName` / `name` pour collaborateurs et équipes, **pas** seulement des UUID.
- Le client actif (`X-Client-Id`) est la seule portée ; changement de client → invalidation des query keys `['teams', 'work-teams', …]` (namespace exact aligné sur l’implémentation).
- La hiérarchie d’équipes peut être **arborescente** ; l’UI doit supporter navigation **arbre + table** ou **liste indentée** sans imposer une profondeur maximale côté maquette (limite éventuelle documentée côté API).

---

# 3. Liste des fichiers à créer / modifier

## Frontend (à la livraison)

- `apps/web/src/features/teams/work-teams/` (ou nom aligné sur la ressource API : `org-teams`, etc.)
  - `api/work-teams.api.ts` — appels CRUD + rattachements + endpoints scopes managers
  - `types/work-team.types.ts`
  - `lib/work-team-query-keys.ts`
  - `hooks/*` — list, detail, mutations, memberships, manager-scopes
  - `components/*` — table équipes, arbre ou vue hiérarchique, formulaire équipe, panneau rattachements, configurateur scope manager
  - `lib/*-label-mappers.ts` — statuts, types de scope, rôles de rattachement
- `apps/web/src/app/(protected)/teams/...` — pages liste / détail (voir §4.2)
- `apps/web/src/components/shell/sidebar.tsx` — ajout sous-menu **Equipes** (ex. « Structure & équipes ») + règles `isTeamsChildActive`
- `apps/web/src/config/navigation.ts` — si besoin d’élargir `requiredPermissions` pour l’entrée parente (ex. `teams.read` en `any` avec `collaborators.read`)
- `apps/web/src/features/teams/collaborators/...` — sur la fiche collaborateur : bloc **Équipes** (liste des équipes rattachées, liens vers détail équipe)
- Tests unitaires : query keys, mappers de libellés, visibilité navigation ; tests composants critiques (table + formulaire) selon conventions du repo

## Documentation

- Ce document
- Mise à jour ciblée de `docs/RFC/_Plan de déploiement - Equipe.md` et `docs/ARCHITECTURE.md` (routes `/teams/...`) lorsque l’implémentation est mergée

---

# 4. Implémentation complète

## 4.1 Règle UX obligatoire : valeur métier, jamais ID

- **Équipes** : titre, code métier, chemin hiérarchique lisible (ex. « DSI › Infrastructure › Exploitation »), pas une chaîne d’UUID.
- **Collaborateurs** dans rattachements : avatar / nom / email comme ailleurs dans le module.
- **Managers** et **responsables d’équipe** : combobox avec **label** = `displayName` (+ email secondaire si utile), valeur technique = id interne.
- **Types de périmètre** (enum backend) : badges ou select avec **libellés français** mappés côté FE (`*-label-mappers.ts`).
- Tableaux : colonnes triables sur libellés ; filtres sur statut / équipe parente avec **noms**, pas ids en chip.

## 4.2 Routes frontend proposées

| Route | Rôle |
| ----- | ---- |
| `/teams/structure` | **Page hub** (recommandé) : onglets ou sections *Équipes* \| *Rattachements* \| *Périmètres managers*, ou layout avec sous-navigation latérale |
| `/teams/structure/teams` | Liste / arbre des équipes + actions CRUD (si on découpé par ressource) |
| `/teams/structure/teams/[teamId]` | Détail équipe : métadonnées, membres, sous-équipes, actions |
| Alternative compacte | `/teams/work-teams` + `/teams/work-teams/[id]` si le hub unique est reporté |

Les chemins exacts peuvent être ajustés tant que le fil d’Ariane et la sidebar restent cohérents (« Organisation › Equipes › … »).

## 4.3 Écran référentiel équipes

- Liste paginée ou **vue arbre** (toggle liste / arbre si charge utile).
- Colonnes typiques : nom, code, parent (libellé), responsable (nom), statut (actif / archivé), effectif (si API fournit un agrégat), actions.
- Création / édition : formulaire validé (Zod + schémas projet), **sélection parent** via arbre déroulant ou combobox **filtrée** (pas de saisie d’UUID).
- **Archivage** : action destructive douce ; les équipes archivées peuvent être masquées par défaut avec toggle « inclure archivées ».
- **Garde-fous** : empêcher ou signaler les cycles parent/enfant selon règles API (erreur métier affichée en toast lisible).

## 4.4 Rattachements collaborateur ↔ équipe

- Depuis **détail équipe** : tableau des membres avec recherche, ajout (picker collaborateur), retrait, édition rôle si prévu.
- Depuis **fiche collaborateur** (`/teams/collaborators/[id]`) : encart **Équipes** listant les équipes (lien vers `/teams/structure/teams/[teamId]`), bouton « Ajouter à une équipe » (combobox **noms d’équipes**).
- Cohérence cache : mutation côté équipe **ou** collaborateur invalide les deux domaines (`collaborator` + `work-teams` query keys).

## 4.5 Périmètres managers

- Vue dédiée ou onglet : pour un **collaborateur** désigné comme manager (ou pour un rôle applicatif « manager équipe » si modèle distinct — suivre RFC-TEAM-005), configurer :
  - **Mode de scope** : ex. directs uniquement / équipe + sous-équipes / liste personnalisée (les valeurs exactes viennent du backend).
  - **Racines d’équipes** ou **équipes incluses** : multi-select **par noms**, ordre ou priorité si requis.
- Prévisualisation optionnelle : nombre de collaborateurs couverts / liste compacte (avec pagination) **sans** fuite hors client.
- Alignement avec **RFC-TEAM-013** (Vue Manager) : les indicateurs futurs doivent **réutiliser** la même définition de périmètre — pas de second système de filtrage côté UI seule.

## 4.6 Contrats API consommés (indicatif — finaliser dans RFC-TEAM-005)

Le frontend attend des endpoints **client-scopés**, du type :

- `GET/POST/PATCH/DELETE` sur la ressource équipes métier (nom de ressource à fixer : ex. `/api/work-teams`, `/api/org-teams`).
- `GET .../members`, `POST .../members`, `DELETE .../members/:collaboratorId` (ou variantes batch).
- `GET/PATCH .../manager-scopes/:managerCollaboratorId` ou ressource équivalente pour la configuration périmètre.

Réponses : toujours inclure `id` pour les mutations mais **afficher** `name`, `displayName`, `parentTeamName`, etc.

Format liste paginé homogène : `{ items, total, offset, limit }` si aligné avec le reste du module Équipes.

## 4.7 Permissions frontend

- Masquer les routes et actions si pas de `teams.read` / `teams.update` (noms à confirmer).
- Gestion explicite **403** / **404** : message métier, pas de dump technique.

---

# 5. Modifications Prisma si nécessaire

**Aucune** dans cette RFC **frontend**. Le modèle relationnel (équipes, clés étrangères, tables de jointure, scopes) est défini dans **RFC-TEAM-005**.

---

# 6. Tests

## 6.1 Unitaires

- Query keys : inclusion systématique de `clientId`.
- Mappers : enums scope / statut équipe → libellés FR stables.
- `navigation-visibility` / sidebar : entrée **Structure** visible selon permissions ; préfixe route `/teams/structure` actif.

## 6.2 Intégration / composants

- Création équipe avec parent : options parent affichent des **libellés**.
- Ajout membre à une équipe : le picker ne montre **pas** d’UUID en liste.
- Changement de client : plus de données d’équipe précédente (cache invalidé).

## 6.3 Non-régression

- Liste collaborateurs et catalogue compétences inchangés fonctionnellement ; seule la navigation **Equipes** s’enrichit.

---

# 7. Récapitulatif final

**RFC-FE-TEAM-004** définit l’UI du **référentiel équipes**, des **rattachements** (depuis la fiche équipe) et des **périmètres managers**, en respect strict du **multi-client**, des **libellés métier** et des patterns **RFC-FE-TEAM-001**. Le **MVP FE** est aligné sur **RFC-TEAM-005** (endpoints stabilisés). Reste **hors périmètre MVP** : encart équipes sur la **fiche collaborateur** (consommation éventuelle de `GET /api/collaborators/:id/work-teams`).

---

# 8. Points de vigilance

- **RFC-TEAM-005** : toute évolution de contrat API côté équipes / scopes doit rester documentée dans la RFC backend et reflétée dans le client `work-teams.api.ts`.
- **Collision sémantique** : ne pas confondre **Microsoft Teams** (intégrations projet / Graph) et **équipes métier** Starium — préfixer clairement les routes API et les libellés UI (« Équipe organisationnelle », « Structure »).
- **Performance** : arbres profonds ou gros effectifs → pagination / lazy expansion des nœuds, pas chargement récursif infini côté client sans API dédiée.
- **Sécurité métier** : un utilisateur ne doit voir que les périmètres et collaborateurs **autorisés** par le backend ; l’UI ne sert pas de filtre de sécurité définitif.
- **Cohérence avec manager `Collaborator.managerId`** : clarifier en RFC-TEAM-005 comment les **scopes** s’articulent avec la hiérarchie annuaire (complément vs remplacement partiel) pour éviter double vérité contradictoire en UI.
