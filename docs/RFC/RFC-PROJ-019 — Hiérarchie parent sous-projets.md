# RFC-PROJ-019 — Hiérarchie parent / sous-projets

## Statut

**Implémenté** — 2026-07-07 (MVP livré : schéma, API, UI portefeuille et fiche projet)

## Objectif

Introduire une **relation parent → enfants entre entités `Project`** du même client, afin de modéliser des **programmes**, **lots** ou **chantiers regroupants** d’autres projets ou activités.

Exemple métier :

* **Transformation SI 2026** (projet parent)
  * **Migration ERP** (sous-projet)
  * **Refonte portail** (sous-projet)

Cette RFC introduit le **premier mécanisme de hiérarchie inter-projets** de Starium Orchestra (livré — voir §16). Elle complète la structuration portefeuille (catégories RFC-PROJ-014) par une **relation métier directe** entre initiatives.

---

# 1. Analyse de l’existant

> **Note** : cette section décrit l’état **avant** implémentation (rédaction 2026-07-06). Le livrable est documenté en **§16**.

## 1.1 Modèle `Project` actuel

Référence : [`apps/api/prisma/schema.prisma`](../../apps/api/prisma/schema.prisma) — modèle `Project`.

Chaque projet possède :

* `clientId`, `name`, `code` (unique par client)
* `kind` : `PROJECT` \| `ACTIVITY` (distinction **projet structuré vs activité de suivi**, pas une hiérarchie)
* `portfolioCategoryId` : rattachement à une **catégorie portefeuille** (référentiel externe, voir RFC-PROJ-014)
* liens transverses : budget, risques, tâches, cycles de pilotage, stratégie, etc.

**Absent aujourd’hui** : champ `parentProjectId`, relation self `parent` / `children`, endpoint ou filtre associé.

## 1.2 Concepts proches mais distincts

| Concept | Rôle | Relation avec cette RFC |
|--------|------|-------------------------|
| `ProjectPortfolioCategory` (RFC-PROJ-014) | Taxonomie portefeuille (catégorie / sous-catégorie) | **Orthogonal** — classement transversal, pas un lien projet→projet |
| `ProjectKind` (`PROJECT` / `ACTIVITY`) | Nature du conteneur (initiative vs suivi récurrent) | **Orthogonal** — un parent et un enfant peuvent avoir des `kind` différents |
| `GovernanceCycle` (RFC-PROJ-CYCLE-xxx) | Programme de gouvernance (arbitrage trimestriel, etc.) | **Distinct** — cycle ≠ projet parent ; un projet peut être candidat à un cycle **et** avoir un parent projet |
| `ProjectTask` hiérarchie (phases / buckets, RFC-PROJ-011) | Planification interne au projet | **Interne** au projet — ne remplace pas la hiérarchie inter-projets |
| `OrgUnit` (RFC-ORG-003) | Propriété organisationnelle | **Distinct** — une direction peut posséder plusieurs projets sans lien parent/enfant entre eux |

## 1.3 Backend / API actuels

* CRUD : `apps/api/src/modules/projects/projects.service.ts`, `projects.controller.ts`
* DTO création / mise à jour : `parentProjectId` optionnel (`create-project.dto.ts`, `update-project.dto.ts`)
* Liste : `list-projects.query.dto.ts` — filtres `parentProjectId`, `rootOnly` (mutuellement exclusifs)
* Utilitaires : `project-hierarchy.util.ts` (cycle, profondeur, descendants)
* Endpoints dédiés : `GET /api/projects/assignable-parents`, `GET /api/projects/:id/children`
* Réponses enrichies : `parentProject`, `childrenCount`, `ancestorChain` sur le détail
* Audits : `project.parent.assigned` / `detached` / `changed`

## 1.4 Frontend actuel

* Portefeuille : filtres parent / racines (`projects-portfolio-filters-bar`, `projects-toolbar`)
* Fiche projet : `ProjectHierarchyBreadcrumb` (ancêtres cliquables), `ProjectChildrenSection`, `ProjectParentEditField`
* Création / édition : `ProjectParentCombobox` (libellé `code — name`, option « Aucun (projet racine) »)
* Topbar : fil d’Ariane workspace via `ProjectWorkspaceShell` + `useWorkspaceBreadcrumbOverride` (nom projet, pas le CUID)

## 1.5 Conclusion analyse (état avant livraison)

Le besoin **projet parent / sous-projets** n’était couvert par **aucun mécanisme** au moment de la rédaction initiale. Le MVP (§16) apporte :

1. une colonne relationnelle self sur `Project`
2. des règles métier anti-cycle et anti-fuite inter-client
3. une exposition API et une UI de rattachement / navigation

Les agrégations (budget, avancement, santé consolidée du parent) sont **hors scope MVP** de cette RFC (suite RFC-PROJ-020 prévue).

---

# 2. Hypothèses

| # | Hypothèse | Impact si fausse |
|---|-----------|------------------|
| H1 | Un projet a **au plus un parent** direct (arbre, pas graphe) | Modèle relation N-N à prévoir |
| H2 | La profondeur utile en production reste **≤ 5 niveaux** (programme → lot → sous-lot → …) | Ajuster `MAX_PROJECT_HIERARCHY_DEPTH` |
| H3 | Le parent n’**hérite pas automatiquement** des tâches / risques des enfants en MVP | Roll-up reporté à RFC-PROJ-020 |
| H4 | Un `ACTIVITY` peut être parent d’un `PROJECT` et inversement | Règles `kind` à resserrer si le métier l’interdit |
| H5 | Le code projet (`code`) reste **unique par client** quel que soit le parent | Pas de préfixe hiérarchique de code en MVP |
| H6 | La suppression d’un parent **avec enfants** est **refusée** tant que les enfants ne sont pas détachés ou réaffectés | Comportement `onDelete: Restrict` |

---

# 3. Décision produit

## 3.1 Modèle cible

Ajouter sur `Project` :

* `parentProjectId String?` — référence optionnelle vers un autre `Project` du **même `clientId`**
* relation Prisma self : `parent` / `children`

Un projet **sans parent** est un nœud **racine** du portefeuille (au sens hiérarchique projet, indépendamment de la catégorie portefeuille).

## 3.2 Finalité métier

* regrouper des initiatives sous un **programme** ou un **lot**
* naviguer parent → enfants depuis la fiche et le portefeuille
* filtrer le portefeuille par parent ou n’afficher que les racines
* préparer des vues consolidées CODIR (agrégation = RFC-PROJ-020)

## 3.3 Périmètre MVP

## Inclus

* champ Prisma + migration
* validation create / update (même client, anti-cycle, profondeur max)
* enrichissement des réponses API (`parentProject`, `childrenCount`)
* filtres liste (`parentProjectId`, `rootOnly`)
* endpoint enfants directs paginé
* endpoint options pour sélecteur parent (exclut soi-même et descendants)
* UI : sélecteur parent (création / édition), fil d’Ariane, section sous-projets sur fiche parent, filtre portefeuille
* audit log sur changement de parent
* tests unitaires service + util (convention module : **pas** de `projects.controller.spec.ts` dédié)

## Exclu (MVP)

* agrégation budget / avancement / santé / risques au niveau parent (→ **RFC-PROJ-020**)
* vue arbre complète du portefeuille (→ V2 UI, ou avec RFC-PROJ-020)
* duplication en cascade d’un sous-arbre projet
* propagation automatique statut / arbitrage parent → enfants
* contrainte forte `kind` (ex. seul `PROJECT` peut être parent) — **non imposée en MVP** ; documentée comme évolutive
* modification du modèle `ProjectRequest` (demande projet) — le parent peut être renseigné **à la conversion** ou après création du `Project`

---

# 4. Règles métier

## 4.1 Rattachement

* `parentProjectId = null` : projet racine (pas de parent)
* `parentProjectId` renseigné : le parent doit exister, appartenir au **même `clientId`**, et être accessible avec `projects.read`
* un projet **ne peut pas être son propre parent**
* **aucun cycle** : un projet ne peut pas avoir parmi ses ancêtres un de ses descendants
* **profondeur maximale** : `MAX_PROJECT_HIERARCHY_DEPTH = 5` (racine = niveau 1)
  * **création** : `profondeur(parent) + 1 ≤ MAX`
  * **mise à jour** (déplacement d’un sous-arbre) : `profondeur(nouveau parent) + hauteur sous-arbre(projet) ≤ MAX` — ne pas se limiter à « parent + 1 » si le projet déplacé a des enfants
  * dépassement → **refus** `400 Bad Request`

## 4.2 Kind (`PROJECT` / `ACTIVITY`)

En MVP : **aucune contrainte** entre `kind` du parent et `kind` de l’enfant.

Recommandation UX (non bloquante) : privilégier un `PROJECT` comme parent d’initiatives structurées ; les `ACTIVITY` restent souvent des feuilles.

Évolution possible (hors MVP) : enum ou flag `isProgramContainer` si le métier l’exige.

## 4.3 Cohérence avec les autres rattachements

* `portfolioCategoryId`, `ownerOrgUnitId`, tags : **indépendants** du parent en MVP (pas d’héritage)
* cycles de pilotage : un enfant peut être candidat indépendamment du parent
* liens budget : chaque projet conserve ses propres `ProjectBudgetLink`

## 4.4 Suppression

* suppression d’un projet **ayant des enfants** : **refusée** (`409 Conflict`, message stable `Cannot delete a project that has child projects`) + garde-fou FK `onDelete: Restrict`
* pour supprimer un parent : d’abord **détacher** les enfants (`parentProjectId = null`) ou les **réaffecter** à un autre parent
* suppression d’une feuille (sans enfant) : comportement actuel inchangé

## 4.5 Archivage / statut

* archiver un parent **n’archive pas** automatiquement les enfants en MVP
* un enfant peut rester `IN_PROGRESS` alors que le parent est `ON_HOLD` — signal possible en UI (warning non bloquant)

## 4.6 Isolation client

* `parentProjectId` d’un autre client → **refus** (comme toute relation cross-client)
* les requêtes liste / arbre filtrent toujours par `clientId` actif

---

# 5. Modèle de données (Prisma)

## 5.1 Extension `Project`

```prisma
model Project {
  // ... champs existants ...

  /// RFC-PROJ-019 — projet parent optionnel (même client).
  parentProjectId String?

  parent   Project?  @relation("ProjectHierarchy", fields: [parentProjectId], references: [id], onDelete: Restrict)
  children Project[] @relation("ProjectHierarchy")

  @@index([clientId, parentProjectId])
}
```

## 5.2 Migration SQL (indicative)

```sql
ALTER TABLE "Project" ADD COLUMN "parentProjectId" TEXT;

ALTER TABLE "Project"
  ADD CONSTRAINT "Project_parentProjectId_fkey"
  FOREIGN KEY ("parentProjectId") REFERENCES "Project"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "Project_clientId_parentProjectId_idx"
  ON "Project"("clientId", "parentProjectId");
```

## 5.3 Données existantes

* tous les projets en base ont `parentProjectId = NULL` après migration (racines implicites)
* pas de backfill automatique

---

# 6. API backend

## 6.1 Module

Étendre le module existant `apps/api/src/modules/projects/` :

| Fichier | Action |
|---------|--------|
| `dto/create-project.dto.ts` | Ajouter `parentProjectId?: string \| null` |
| `dto/update-project.dto.ts` | Idem (nullable explicite pour détacher) |
| `dto/list-projects.query.dto.ts` | Ajouter `parentProjectId?`, `rootOnly?` |
| `dto/list-assignable-parents.query.dto.ts` | **Nouveau** — `excludeProjectId?`, `search?`, `limit?` |
| `projects.service.ts` | Validation parent, enrichissement réponses, liste enfants |
| `projects.controller.ts` | Route enfants + assignable-parents si dédiée |
| `project-hierarchy.util.ts` | **Nouveau** — anti-cycle, profondeur, exclusion descendants |
| `project-hierarchy.util.spec.ts` | Tests utilitaires |

Guards inchangés : `JwtAuthGuard` → `ActiveClientGuard` → `ModuleAccessGuard` → `PermissionsGuard`.

## 6.2 Utilitaire hiérarchie (nouveau pattern)

Fichier dédié `project-hierarchy.util.ts` (ne pas mélanger avec org-unit ni portfolio-categories) :

```ts
export const MAX_PROJECT_HIERARCHY_DEPTH = 5;

export function wouldSetParentCreateCycle(params: {
  projectId: string;
  newParentId: string | null;
  parentById: Map<string, string | null>;
}): boolean;

export function computeDepthFromRoot(
  projectId: string,
  parentById: Map<string, string | null>,
): number;

export function collectDescendantIds(
  rootId: string,
  childrenByParentId: Map<string, string[]>,
): Set<string>;

export function computeSubtreeHeight(
  rootId: string,
  childrenByParentId: Map<string, string[]>,
): number;

export function buildAncestorChain(
  projectId: string,
  parentById: Map<string, string | null>,
  projectSummaryById: Map<string, ProjectParentSummary>,
): ProjectParentSummary[];
```

En cas d’incohérence en base (cycle, profondeur anormale) : `buildAncestorChain` **tronque** la chaîne, log `warn` structuré, **pas d’exception HTTP** (fiche projet reste utilisable).

## 6.3 Routes

### Routes existantes (extensions)

| Méthode | Route | Changement |
|---------|-------|------------|
| `POST` | `/api/projects` | Body accepte `parentProjectId` |
| `PATCH` | `/api/projects/:id` | Body accepte `parentProjectId` (null = détacher) |
| `GET` | `/api/projects` | Query `parentProjectId`, `rootOnly=true` |
| `GET` | `/api/projects/:id` | Réponse inclut `parentProject`, `childrenCount` ; **détail** inclut aussi `ancestorChain` (racine → parent direct) |

### Nouvelles routes

```http
GET /api/projects/:id/children
```

* permission : `projects.read`
* query : `page`, `limit`, mêmes filtres optionnels que la liste (status, kind, …) **restreints aux enfants directs**
* réponse : `{ items, total, limit, page }` — items au format liste enrichie existante

```http
GET /api/projects/assignable-parents
```

* permission : `projects.read`
* query :
  * `excludeProjectId?` — exclut le projet édité, ses descendants, et évite les cycles
  * `search?` — recherche sur nom / code
  * `limit?` (défaut 20, max 50)
* réponse : `{ items: { id, name, code, status, kind }[] }` — **libellés métier**, jamais UUID seul en UI

## 6.4 Formes de réponse

### Objet `parentProject` (lecture)

```json
{
  "id": "clx…",
  "name": "Transformation SI 2026",
  "code": "TRF-SI-26",
  "status": "IN_PROGRESS",
  "kind": "PROJECT"
}
```

`null` si racine.

### Liste enrichie

Ajouter :

* `parentProject: { id, name, code, status, kind } | null`
* `childrenCount: number` — nombre d’**enfants directs** (pas tout le sous-arbre)

### Détail projet (`GET /api/projects/:id`)

En plus des champs liste :

* `ancestorChain: { id, name, code, status, kind }[]` — ordre **racine → parent direct** (le projet courant n’est pas dans la chaîne) ; calcul serveur via `buildAncestorChain`

## 6.5 DTO

### `CreateProjectDto` / `UpdateProjectDto`

```ts
@IsOptional()
@IsString()
@MinLength(1)
parentProjectId?: string | null;
```

### `ListProjectsQueryDto`

```ts
@IsOptional()
@IsString()
@MinLength(1)
parentProjectId?: string;

@IsOptional()
@Transform(({ value }) => parseBooleanQuery(value))
@IsBoolean()
rootOnly?: boolean;
```

Règle : si `parentProjectId` et `rootOnly` sont tous deux fournis → `400` (filtres contradictoires).

## 6.6 Erreurs métier

| Code | Cas |
|------|-----|
| `400` | parent inexistant ou hors client, cycle, profondeur max dépassée, self-parent, filtres contradictoires (`rootOnly and parentProjectId are mutually exclusive`) |
| `409` | suppression projet avec enfants (`Cannot delete a project that has child projects`) |

## 6.7 Audit

Événements :

* `project.parent.assigned` — création ou PATCH avec nouveau parent non null
* `project.parent.detached` — PATCH avec `parentProjectId: null`
* `project.parent.changed` — changement d’un parent à un autre

Payload audit (résumé, pas de DCP) : `projectId`, `previousParentProjectId`, `nextParentProjectId`, `clientId`.

---

# 7. Frontend

## 7.1 Fichiers à créer / modifier

| Fichier | Action |
|---------|--------|
| `apps/web/src/features/projects/types/project.types.ts` | Types `ProjectParentSummary`, `parentProject`, `childrenCount`, `ancestorChain` |
| `apps/web/src/features/projects/api/projects.api.ts` | `parentProjectId` / `rootOnly` sur liste ; `listAssignableParents`, `listProjectChildren` |
| `apps/web/src/features/projects/lib/project-query-keys.ts` | Clés `assignableParents`, `projectChildren` |
| `apps/web/src/features/projects/hooks/use-projects-list-filters.ts` | Filtres `parentProjectId`, `rootOnly` (exclusion mutuelle côté UI) |
| `apps/web/src/features/projects/components/project-parent-combobox.tsx` | **Nouveau** — sélecteur parent (recherche debounced, clavier) |
| `apps/web/src/features/projects/components/project-parent-edit-field.tsx` | **Nouveau** — édition parent sur fiche (`PATCH` + `projects.update`) |
| `apps/web/src/features/projects/components/project-hierarchy-breadcrumb.tsx` | **Nouveau** — fil d’Ariane (`ancestorChain` serveur) |
| `apps/web/src/features/projects/components/project-children-section.tsx` | **Nouveau** — liste enfants sur fiche |
| `apps/web/src/features/projects/components/project-workspace-shell.tsx` | Intégration breadcrumb + édition parent |
| `apps/web/src/features/projects/components/project-create-form.tsx` | Combobox parent à la création |
| `apps/web/src/features/projects/components/projects-portfolio-filters-bar.tsx` | Filtre parent + case « Racines uniquement » |
| `apps/web/src/features/projects/components/projects-toolbar.tsx` | Compteur filtres actifs |
| `apps/web/src/features/projects/components/projects-list-mobile-view.tsx` | Sous-ligne « Parent : code — name » |
| `apps/web/src/features/projects/components/projects-list-project-card.tsx` | Sous-ligne parent sur carte |

## 7.2 Comportements UI

### Sélecteur « Projet parent »

* combobox searchable sur `name` / `code`
* option explicite **« Aucun (projet racine) »**
* exclut le projet courant et ses descendants (via `assignable-parents`)
* **affiche le libellé métier** (`code — name`), jamais l’UUID

### Fiche projet

* fil d’Ariane cliquable : ancêtres **racine → parent direct** via `ancestorChain` (aucun fetch récursif client)
* champ **Projet parent** éditable dans le workspace shell (`ProjectParentEditField`) si `projects.update`
* section **« Sous-projets »** toujours visible (états loading / empty / error)
* lien vers chaque enfant (nom + code + badge statut)

### Portefeuille

* filtre « Projet parent » (select) + case « Racines uniquement » — **exclusion mutuelle** : cocher racines vide le parent ; sélectionner un parent décoche racines
* colonne ou sous-ligne optionnelle « Parent : … » en vue liste / cartes mobile

### États

* loading / empty / error sur chaque bloc
* message explicite si PATCH parent refusé (cycle, profondeur)

## 7.3 Hors scope UI MVP

* drag & drop pour réorganiser la hiérarchie
* vue arbre complète du portefeuille (type explorateur) — V2

---

# 8. Tests

## 8.1 Backend — `project-hierarchy.util.spec.ts`

* détection cycle direct et indirect
* calcul profondeur depuis racine
* collecte descendants

## 8.2 Backend — `projects.service.spec.ts` (ou fichier dédié)

* create avec parent valide même client
* create avec parent autre client → erreur
* create avec parent = self → erreur
* update créant un cycle → erreur
* update dépassant profondeur max → erreur
* delete parent avec enfants → erreur
* delete feuille → OK
* detach enfants puis delete parent → OK
* liste `rootOnly=true` ne retourne que `parentProjectId IS NULL`
* liste `parentProjectId=X` ne retourne que enfants directs de X

## 8.3 Backend — tests controller

* **Non livré** — convention module projets : couverture via `projects.service.spec.ts` + `project-hierarchy.util.spec.ts` + `list-projects.query.dto.spec.ts` (49+ cas dont hiérarchie, audit parent, filtres contradictoires).

## 8.4 Frontend (ciblé)

* rendu fil d’Ariane avec ancêtres
* combobox : libellé affiché, pas UUID
* filtre portefeuille `rootOnly`

---

# 9. Implémentation — ordre recommandé

1. Migration Prisma + `project-hierarchy.util.ts` + tests util
2. DTO + validation service create/update/delete
3. Enrichissement `GET` projet / liste + filtres query
4. Routes `children` + `assignable-parents` + tests controller
5. Audit
6. Types + API client web
7. Combobox + breadcrumb + section enfants + filtres portefeuille
8. Revue conformité (skill `starium-dev-compliance`)

---

# 10. Récapitulatif final

| Livrable | Description |
|----------|-------------|
| Schéma | `parentProjectId` self-relation sur `Project` |
| Pattern | **Nouveau** — util dédié `project-hierarchy.util.ts`, pas de réutilisation implicite d’un pattern projet existant |
| API | CRUD étendu + `children` + `assignable-parents` + filtres liste |
| UI | Parent sélectionnable, navigation hiérarchique, sous-projets visibles |
| Hors scope | Agrégations parent (RFC-PROJ-020), arbre portefeuille complet |

---

# 11. Points de vigilance

* **Ne pas confondre** catégorie portefeuille et parent projet — deux axes de structuration complémentaires
* **Performance** : `childrenCount` via `_count` Prisma sur enfants directs ; éviter de charger tout le sous-arbre dans la liste paginée
* **Cycles** : toujours valider côté **serveur** (l’UI seule est insuffisante)
* **Permissions** : création avec parent → `projects.create` ; rattachement / détachement → `projects.update` (+ `@AccessDecision` intent `write` sur le projet cible) ; lecture parent / enfants / assignable → `projects.read`
* **Microsoft / sync** : pas d’impact sur `ProjectMicrosoftLink` en MVP (chaque projet garde son lien)
* **Recherche globale** (RFC-CORE-SEARCH-001) : indexer le nom du parent en lecture seule optionnel en V2 pour faciliter la recherche « enfants de X »

---

# 12. Suites prévues

| RFC | Sujet |
|-----|-------|
| **RFC-PROJ-020** | Agrégation portefeuille par hiérarchie projet (budget, avancement, santé, risques roll-up) |
| **RFC-PROJ-016** | Agrégation par catégorie portefeuille (orthogonale) |

---

# 13. Conformité by design

## 13.1 RGPD / Privacy

| Élément | Décision |
|---------|----------|
| DCP concernées | Aucune nouvelle DCP ; les champs parent/enfant sont des relations métier entre projets |
| Finalité | Structuration du portefeuille et navigation gouvernance |
| Minimisation | Seuls `id`, `name`, `code`, `status`, `kind` du parent sont exposés en lecture — pas de sur-exposition de la fiche parent |
| Rétention / effacement | Suppression projet inchangée ; détacher les enfants avant suppression parent |
| Logs / audit | Pas de DCP en clair ; audit sur changement de parent (IDs projet uniquement) |
| Scope client | Isolation stricte — parent toujours même `clientId` |

## 13.2 RGAA / Accessibilité

| Élément | Décision |
|---------|----------|
| Sémantique | Fil d’Ariane en `<nav aria-label="Fil d'Ariane projet">` avec liste ordonnée |
| Clavier | Combobox parent navigable clavier (shadcn/Radix) ; liens enfants focusables |
| Labels | « Projet parent », « Sous-projets », « Racines uniquement » — labels explicites, pas placeholder seul |
| Dynamique | Annonce `aria-live="polite"` sur erreur de rattachement (cycle, profondeur) |
| Contraste | Badges statut enfants via design system existant |
| Mouvement | Pas d’animation d’arbre agressive ; respect `prefers-reduced-motion` |

## 13.3 Design System

| Élément | Décision |
|---------|----------|
| Composants | Réutiliser `Combobox`, `Badge`, `Card`, `EmptyState`, `DataTable` / cartes mobile existants |
| Tokens | Couleurs / espacements via thème — aucune valeur en dur |
| Libellés | **Valeur métier affichée** (`code — name`) — jamais UUID en UI |
| États | loading / empty / error sur breadcrumb, combobox, section enfants |

## 13.4 Sécurité

| Élément | Décision |
|---------|----------|
| Authz | Guards existants ; `projects.create` / `projects.update` pour rattachement |
| Isolation | `parentProjectId` validé contre scope client actif — jamais depuis payload non contrôlé cross-tenant |
| DTO | `class-validator` sur `parentProjectId` |
| Audit | `project.parent.*` sur mutations sensibles |
| API | Pas d’exposition de projets d’un autre client via jointure parent |

## 13.5 Interface mobile

| Élément | Décision |
|---------|----------|
| Breakpoints | Filtres portefeuille empilés `sm:` ; breadcrumb tronqué avec ellipsis sur 320px |
| Cibles tactiles | Liens fil d’Ariane et lignes enfants ≥ 44px hauteur cliquable |
| Tableaux | Parent affiché en sous-ligne sur carte mobile plutôt qu’colonne étroite |
| Modales | Combobox parent pleine largeur sur mobile |

---

# 14. Critères d’acceptation

## Backend

- [x] `parentProjectId` migré sur `Project` avec index `(clientId, parentProjectId)` — migration `20260706190000_project_parent_hierarchy`
- [x] Create / update avec validation anti-cycle, profondeur max (subtree height au update), même client
- [x] Delete refusé si enfants présents (`409 Conflict`)
- [x] `GET /projects` supporte `parentProjectId` et `rootOnly`
- [x] `GET /projects/:id` retourne `parentProject`, `childrenCount`, `ancestorChain`
- [x] `GET /projects/:id/children` paginé, scopé client
- [x] `GET /projects/assignable-parents` exclut self + descendants + profondeur
- [x] Audit sur assign / detach / change parent (`project-audit.constants.ts`)
- [x] Tests service + util + DTO (isolation client, cas limites)

## Frontend

- [x] Sélecteur parent avec libellé métier et option « racine »
- [x] Fil d’Ariane sur fiche projet (`ancestorChain`)
- [x] Section sous-projets sur fiche projet
- [x] Filtres portefeuille parent / racines (exclusion mutuelle)
- [x] États loading / empty / error
- [x] Accessible clavier + labels FR

---

# 15. Décision finale

Cette RFC introduit le **premier mécanisme de hiérarchie inter-projets** de Starium Orchestra. Elle complète la structuration portefeuille (catégories RFC-PROJ-014) par une **relation métier directe** entre initiatives, sans fusionner les concepts ni réutiliser un pattern inexistant côté `Project`.

Sans agrégation (RFC-PROJ-020), la valeur immédiate est **navigation, regroupement et lisibilité CODIR** ; avec la suite, le parent devient un **nœud de consolidation** pilotable.

---

# 16. Implémentation livrée (2026-07-07)

## 16.1 Backend

| Élément | Chemin / détail |
|---------|-----------------|
| Migration | `apps/api/prisma/migrations/20260706190000_project_parent_hierarchy/migration.sql` |
| Schéma | `parentProjectId`, relation `ProjectHierarchy`, `onDelete: Restrict`, `@@index([clientId, parentProjectId])` |
| Util | `apps/api/src/modules/projects/project-hierarchy.util.ts` + `project-hierarchy.util.spec.ts` |
| Service | `projects.service.ts` — `assertParentProjectForWrite`, `listChildren`, `listAssignableParents`, `ancestorChain` |
| Controller | `GET assignable-parents` (avant `:id`), `GET :id/children` |
| Audit | `PROJECT_PARENT_ASSIGNED` / `DETACHED` / `CHANGED` dans `project-audit.constants.ts` |
| DTO query assignable | `dto/list-assignable-parents.query.dto.ts` |

## 16.2 Frontend

| Composant | Rôle |
|-----------|------|
| `project-parent-combobox.tsx` | Sélection parent (API assignable-parents, debounce, clavier) |
| `project-parent-edit-field.tsx` | Édition sur fiche workspace |
| `project-hierarchy-breadcrumb.tsx` | Navigation ancêtres |
| `project-children-section.tsx` | Liste enfants directs |
| `project-create-form.tsx` | Parent à la création |
| `projects-portfolio-filters-bar.tsx` | Filtres portefeuille |

## 16.3 Écarts documentés (acceptés)

* Édition parent sur **workspace shell**, pas dans `project-sheet-view.tsx` (même API `PATCH /projects/:id`).
* Filtre portefeuille « Projet parent » : **select** (liste `assignable-parents`) plutôt que combobox searchable — suffisant MVP.
* Pas de données seed hiérarchiques démo : tous les projets seed restent racines (`parentProjectId = null`).
* Référence API détaillée : [API.md](../API.md) §21 (routes `assignable-parents`, `children`, query `parentProjectId` / `rootOnly`).
* **Topbar workspace** : `ProjectWorkspaceShell` alimente `useWorkspaceBreadcrumbOverride` avec le **nom** du projet ; `build-workspace-breadcrumb.ts` masque les CUID (placeholder `…` puis libellé) — voir [FRONTEND_UI-UX.md](../FRONTEND_UI-UX.md) §3.2.
