# RFC-FE-TEAM-003 — UI Compétences

## Statut

| Volet | État |
| --- | --- |
| **MVP catalogue** — page `/teams/skills`, navigation **Équipes** (dropdown Collaborateurs / Catalogue compétences, `requiredPermissionsMatch: 'any'` sur le parent), onglets Compétences / Catégories, filtres, CRUD catégories, skills create / update / archive / restore, dialog porteurs (`GET /api/skills/:skillId/collaborators`) | **Implémentée** (FE) — code sous `apps/web/src/features/teams/skills/` et `navigation-visibility.ts` |
| **UI associations** collaborateur ↔ compétence (fiche `/teams/collaborators/[collaboratorId]`, API nestées `/api/collaborators/.../skills`) | **Hors périmètre** de cette RFC ; **lot FE suivant** (à documenter séparément) |

## Priorité

Haute (Phase 2 — socle compétences côté UI)

## Dépendances

- RFC-TEAM-003 — Référentiel Compétences (backend catalogue)
- RFC-TEAM-004 — Compétences des collaborateurs (backend `CollaboratorSkill`)
- RFC-FE-TEAM-001 — Frontend Foundation — Équipes
- RFC-FE-TEAM-002 — UI Collaborateurs
- `docs/ARCHITECTURE.md` — API-first, isolation multi-client
- `docs/FRONTEND_UI-UX.md` — états loading / error / empty, tokens, patterns cartes
- `.cursorrules` — **inputs / référentiels** : libellé métier visible, jamais ID brut (UUID) comme texte principal

---

# 1. Analyse de l'existant

**Backend** (inchangé par cette RFC) : catalogue RFC-TEAM-003 ; associations `CollaboratorSkill` RFC-TEAM-004 ; vue inverse `GET /api/skills/:skillId/collaborators`.

**Frontend au moment de la mise à jour doc** :

- **Livré (MVP catalogue)** : `apps/web/src/features/teams/skills/` (API client, query keys tenant-aware, composants catalogue, tests `skill-label-mappers`, `skill-query-keys`, `navigation-visibility`) ; page `apps/web/src/app/(protected)/teams/skills/page.tsx` ; sidebar **Équipes** en menu déroulant avec visibilité parent si `collaborators.read` **ou** `skills.read` (`navigationItemVisible` + `requiredPermissionsMatch: 'any'` uniquement sur cet item).
- **Non livré dans cette RFC** : onglet ou panneau compétences sur la fiche collaborateur ; client API `collaborator-skills` ; tout flux sur `/api/collaborators/:id/skills`.

Objectif historique de la RFC : couvrir **catalogue + gestion par collaborateur** ; le périmètre **effectivement implémenté** dans le code est le **catalogue** ; le volet **fiche collaborateur** est reporté à une RFC FE dédiée.

---

# 2. Hypothèses éventuelles

- Les contrats API et codes HTTP documentés en RFC-TEAM-003 / 004 restent stables ; en cas d’écart, ajuster le backend (DTO) plutôt que des contournements d’affichage basés sur l’ID.
- Le client actif (`X-Client-Id`) et `authenticated-fetch` restent la seule voie d’accès aux données ; changement de client → invalidation complète des query keys `teams` + `skills`.
- Les libellés français des enums (`SkillStatus`, `SkillReferenceLevel`, `CollaboratorSkillSource`) sont **mappés côté frontend** (fichiers `*-label-mappers.ts`) — l’API ne fournit pas de libellés i18n.
- Le MVP UI n’implémente pas la **matrice** complète (RFC-TEAM-015) ni les **alertes gap** (RFC-TEAM-016) ; en revanche, la fiche collaborateur peut afficher **côte à côte** le niveau réel (`level`) et le niveau de référence attendu (`skillReferenceLevel`) pour préparer ces évolutions.
- L’ajout de compétences à un collaborateur filtre les options `GET /api/skills/options` en **excluant les compétences déjà associées** (côté client après chargement des deux listes, ou appel dédié — pas de nouvel endpoint backend au MVP).

---

# 3. Fichiers livrés (MVP catalogue) vs prévus (lot suivant)

## Implémenté — catalogue + navigation

- **Page** : `apps/web/src/app/(protected)/teams/skills/page.tsx`
- **Feature** : `apps/web/src/features/teams/skills/` — `api/skills.api.ts`, `api/skill-categories.api.ts`, `types/skill.types.ts`, `lib/skill-query-keys.ts`, `lib/skill-label-mappers.ts` (incl. libellés source pour le dialog porteurs), `schemas/skill-form.schema.ts`, hooks (`use-skills-list`, `use-skill-categories-list`, `use-skill-category-options`, `use-skill-mutations`, `use-skill-collaborators-for-skill`), composants (`skills-catalog.tsx`, `skills-list-table`, `skill-filters-bar`, `skill-status-badge`, `skill-reference-level-badge`, `skill-form-dialog`, `skill-categories-table`, `skill-category-form-dialog`, `skill-collaborators-dialog`)
- **Navigation** : `apps/web/src/config/navigation.ts` (item Équipes sans `href`, `requiredPermissionsMatch: 'any'`), `apps/web/src/components/shell/sidebar.tsx` (branche `isEquipes`), `apps/web/src/components/shell/navigation-visibility.ts` (logique testable)
- **Tests** : `skill-label-mappers.spec.ts`, `skill-query-keys.spec.ts`, `navigation-visibility.spec.ts`, `navigation.spec.ts` (Equipes + non-régression)

## Prévu — lot FE suivant (non implémenté ici)

- `collaborator-skills.api.ts`, hooks / composants fiche collaborateur, onglet sur `apps/web/src/app/(protected)/teams/collaborators/[collaboratorId]/page.tsx` — voir future RFC dédiée.

## Documentation

- Ce document, `docs/RFC/_RFC Liste.md`, `docs/RFC/_Plan de déploiement - Equipe.md`

---

# 4. Implémentation complète

## 4.1 Périmètre fonctionnel UI

### A. Catalogue (client) — **implémenté**

- Liste paginée des **compétences** avec colonnes lisibles : nom, catégorie (`categoryName`), niveau de référence, statut, dates ; pas d’UUID en colonne principale.
- Filtres : recherche, catégorie, statut(s), niveau(x) de référence, option « inclure archivées » (`includeArchived`).
- Actions selon RBAC : création / édition / archivage / restauration ; pas de suppression physique de compétence côté UI (aligné backend MVP).
- Gestion des **catégories** : liste + création / édition / suppression (si vide côté API — gérer erreur 409 par toast explicite).
- Formulaires : `categoryId` en **select/combobox** avec **nom de catégorie** visible ; jamais afficher seul un `categoryId`.

### B. Collaborateur — **hors périmètre RFC-FE-TEAM-003 (lot FE suivant)**

- Sur la fiche `/teams/collaborators/[collaboratorId]`, ajouter une zone **Compétences** (onglet dédié recommandé pour séparer chargement et permissions).
- Liste des associations : compétence (`skillName`), catégorie (`skillCategoryName`), niveau réel, source, validation manager (`validatedByName`, `validatedAt`), commentaire, date de revue.
- **Comparaison niveaux** : afficher `level` et `skillReferenceLevel` avec libellés (badges) — signal visuel d’écart optionnel (texte ambre discret si `level` < `skillReferenceLevel` selon ordre enum, hors scope calcul métier complexe au MVP).
- Compétence **archivée** encore associée : badge ou ligne en « avertissement » conforme `FRONTEND_UI-UX` (texte de vigilance ambre).
- Actions : ajouter une compétence (combobox alimentée par `GET /api/skills/options`, compétences déjà liées exclues), éditer niveau/source/commentaire/revue, valider / invalider (si `skills.update`), supprimer l’association.
- **Bulk** : action optionnelle « ajouter plusieurs compétences » (dialog checklist) appelant `POST .../bulk` — afficher le résumé `created` / `skipped` retourné par l’API.

### C. Vue inverse — **implémentée** (dialog)

- `GET /api/skills/:skillId/collaborators` : ouverture depuis chaque ligne du catalogue (icône collaborateurs) → **dialog** paginé (libellés métier). Route `/teams/skills/[skillId]` optionnelle en v2.

## 4.2 Routes frontend

| Route | Rôle |
| ----- | ---- |
| `/teams/skills` | Catalogue : onglets ou sections Catégories / Compétences |
| `/teams/collaborators` | Inchangé (liste) |
| `/teams/collaborators/[collaboratorId]` | Profil (RFC-FE-TEAM-002) ; onglet **Compétences** = lot FE suivant |

Option v2 : `/teams/skills/[skillId]` pour détail catalogue + panneau « collaborateurs porteurs ».

## 4.3 Contrats API consommés

**Catalogue**

- `GET /api/skill-categories`, `GET /api/skill-categories/options`, `POST/PATCH/DELETE /api/skill-categories/:id`
- `GET /api/skills`, `GET /api/skills/options`, `POST /api/skills`, `GET /api/skills/:id`, `PATCH /api/skills/:id`, `PATCH /api/skills/:id/archive`, `PATCH /api/skills/:id/restore`

**Collaborateur**

- `GET /api/collaborators/:collaboratorId/skills`
- `POST /api/collaborators/:collaboratorId/skills`, `POST .../bulk`
- `PATCH /api/collaborators/:collaboratorId/skills/:id`, `DELETE .../:id`
- `PATCH .../validate`, `PATCH .../invalidate`
- `GET /api/skills/:skillId/collaborators` (consommé par le MVP catalogue — dialog)

Format liste : `{ items, total, limit, offset }` partout.

## 4.4 Règle UX obligatoire : valeur métier, jamais ID

- Select compétence / catégorie : **nom** (+ catégorie pour les skills dans les options).
- Tableaux : pas de colonne « ID » ; si debug nécessaire, masqué derrière un outil dev uniquement (hors prod).
- Validation manager : afficher `validatedByName` ; si absent mais `validatedAt` présent, libellé de repli type « Validé » sans afficher `validatedByUserId` seul.
- Badges : `SkillStatus`, `SkillReferenceLevel`, `CollaboratorSkillSource` → **libellés FR** via mappers.

## 4.5 Permissions frontend

| Action | Permission |
| ------ | ---------- |
| Voir menu Catalogue compétences, listes catalogue | `skills.read` |
| Créer / éditer / archiver / restaurer compétences et catégories | `skills.create` / `skills.update` / `skills.delete` (catégories vides uniquement pour delete) |
| Voir compétences sur fiche collaborateur (lot suivant) | `skills.read` |
| Ajouter / modifier / supprimer associations, validate / invalidate (lot suivant) | `skills.update` |

La page collaborateurs existante reste sous `collaborators.read`. **Tant que l’onglet Compétences n’est pas livré**, aucune règle d’affichage 403 spécifique à cet onglet ne s’applique côté FE.

**Catalogue (code actuel)** : les boutons utilisent `skills.create` (création skill/catégorie), `skills.update` (édition / archive / restore catégorie et skill), `skills.delete` (suppression catégorie vide), cohérents avec les `@RequirePermissions` du backend.

## 4.6 Query keys / cache

Préfixe cohérent avec la fondation Équipes :

- `['teams', clientId, 'skills', 'list', paramsHash]`
- `['teams', clientId, 'skills', 'detail', skillId]`
- `['teams', clientId, 'skill-categories', 'list', paramsHash]`
- `['teams', clientId, 'collaborators', collaboratorId, 'skills', paramsHash]`
- `['teams', clientId, 'skills', skillId, 'collaborators', paramsHash]` (vue inverse)

Invalidation après mutations catalogue : listes skills / catégories / options et clés du dialog porteurs ; pas de détail collaborateur tant que le lot associations n’est pas livré.

## 4.7 Accessibilité

- Tables navigables clavier, actions avec `aria-label` explicites.
- Dialogs : focus trap, fermeture Escape.
- Badges de statut : texte, pas la couleur seule.

---

# 5. Modifications Prisma si nécessaire

**Aucune** pour cette RFC frontend.

Si un champ d’affichage manque dans une réponse API, l’extension se fait côté **DTO / sérialisation backend** (RFC-TEAM-003 / 004), pas via requêtes ad hoc depuis le navigateur.

---

# 6. Tests

## 6.1 Unitaires (livrés)

- `skill-label-mappers.spec.ts` — mappers statuts, niveaux, source collaborateur (dialog porteurs).
- `skill-query-keys.spec.ts` — inclusion `clientId`, stabilité des clés.
- `navigation-visibility.spec.ts` — `requiredPermissionsMatch: 'any'` (Équipes), non-régression `all` / `moduleCode` (Budgets, Projets).

## 6.2 Integration / composants

- Liste catalogue : états loading / empty / error (couvert par implémentation page + `SkillsCatalog`).
- **Fiche collaborateur** : tests d’intégration à prévoir dans **la RFC FE du lot associations**.
- Changement de client actif : clés `['teams', clientId, …]` — invalidation après mutations catalogue.

## 6.3 Cas critiques conformité Starium

- Aucun UUID affiché comme libellé principal dans les tableaux, filtres, badges ou placeholders.
- Pas de données d’un autre client après switch (cache invalidé).
- Gestion explicite 403 / 404 sur les routes API.

---

# 7. Récapitulatif final

**RFC-FE-TEAM-003** : le **MVP catalogue** (route `/teams/skills`, CRUD catégories + skills, dialog porteurs, navigation Équipes) est **implémenté** côté `apps/web` avec isolation client, RBAC aligné backend (`skills.*`), et règle **valeur métier / pas d’ID brut**.

La **gestion des compétences sur fiche collaborateur** est **hors livrable** de cette RFC ; elle s’appuiera sur les mêmes APIs RFC-TEAM-004 dans une **RFC FE dédiée**.

**Évolutions** possibles ensuite : **matrice** (RFC-TEAM-015), **alertes gap** (RFC-TEAM-016).

---

# 8. Points de vigilance

- **Ne pas confondre** `Skill.referenceLevel` (attendu catalogue) et `CollaboratorSkill.level` (niveau réel) — l’UI doit les distinguer visuellement.
- **Compétences archivées** : ne peuvent pas être nouvellement ajoutées ; les liaisons existantes restent visibles avec signal fort.
- **Sidebar** : la visibilité du groupe Equipes doit gérer le cas où l’utilisateur n’a qu’un des deux modules (`collaborators` ou `skills`) — éviter de masquer toute la section par erreur.
- **Permissions** : ne pas exiger `collaborators.update` pour éditer les compétences — c’est `skills.update` qui prime pour les associations.
- **Performance** : pagination serveur respectée ; éviter de charger toutes les options skills sans limite (utiliser `limit` / recherche côté API si disponible).
