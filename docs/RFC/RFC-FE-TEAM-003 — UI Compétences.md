# RFC-FE-TEAM-003 — UI Compétences

## Statut

Spécifiée (implémentation FE à venir)

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

Les API backend sont en place (MVP) :

- **Catalogue** : `GET/POST/PATCH/DELETE /api/skill-categories`, `GET /api/skill-categories/options`, `GET/POST/PATCH /api/skills`, `PATCH /api/skills/:id/archive|restore`, `GET /api/skills/options` (voir RFC-TEAM-003).
- **Collaborateur ↔ compétence** : routes nestées `GET/POST/PATCH/DELETE /api/collaborators/:collaboratorId/skills`, `POST .../bulk`, `PATCH .../validate|invalidate`, et vue inverse `GET /api/skills/:skillId/collaborators` (voir RFC-TEAM-004).

Côté frontend (`apps/web`), le module Équipes couvre aujourd’hui surtout les **collaborateurs** (liste, détail, édition). **Aucune UI dédiée** au catalogue de compétences ni au portefeuille de compétences d’un collaborateur n’est livrée.

Constats :

- la navigation **Equipes** pointe uniquement vers `/teams/collaborators` avec gating `collaborators.read` — le module **`skills`** (permissions `skills.*`) n’est pas encore reflété dans la sidebar ;
- pas de feature `features/teams/skills` ni d’onglet « Compétences » sur la fiche collaborateur ;
- les réponses API exposent déjà des champs lisibles (`categoryName`, `skillName`, `validatedByName`, etc.) — l’UI doit les consommer sans reconstituer des libellés à partir d’IDs.

Objectif de cette RFC : livrer une **UI Compétences** en deux volets — **catalogue client** (catégories + compétences) et **gestion des compétences par collaborateur** — alignée multi-client, RBAC, et règle Starium « valeur affichée, pas ID ».

---

# 2. Hypothèses éventuelles

- Les contrats API et codes HTTP documentés en RFC-TEAM-003 / 004 restent stables ; en cas d’écart, ajuster le backend (DTO) plutôt que des contournements d’affichage basés sur l’ID.
- Le client actif (`X-Client-Id`) et `authenticated-fetch` restent la seule voie d’accès aux données ; changement de client → invalidation complète des query keys `teams` + `skills`.
- Les libellés français des enums (`SkillStatus`, `SkillReferenceLevel`, `CollaboratorSkillSource`) sont **mappés côté frontend** (fichiers `*-label-mappers.ts`) — l’API ne fournit pas de libellés i18n.
- Le MVP UI n’implémente pas la **matrice** complète (RFC-TEAM-015) ni les **alertes gap** (RFC-TEAM-016) ; en revanche, la fiche collaborateur peut afficher **côte à côte** le niveau réel (`level`) et le niveau de référence attendu (`skillReferenceLevel`) pour préparer ces évolutions.
- L’ajout de compétences à un collaborateur filtre les options `GET /api/skills/options` en **excluant les compétences déjà associées** (côté client après chargement des deux listes, ou appel dédié — pas de nouvel endpoint backend au MVP).

---

# 3. Liste des fichiers à créer / modifier

## Frontend (Next.js)

### Catalogue compétences (`features/teams/skills`)

- `apps/web/src/app/(protected)/teams/skills/page.tsx` — page catalogue (layout onglets ou sections)
- `apps/web/src/features/teams/skills/api/skills.api.ts`
- `apps/web/src/features/teams/skills/api/skill-categories.api.ts`
- `apps/web/src/features/teams/skills/types/skill.types.ts`
- `apps/web/src/features/teams/skills/lib/skill-query-keys.ts` — **toujours** inclure `clientId`
- `apps/web/src/features/teams/skills/lib/skill-label-mappers.ts` — statuts, niveaux, sources → libellés FR
- `apps/web/src/features/teams/skills/hooks/use-skills-list.ts`
- `apps/web/src/features/teams/skills/hooks/use-skill-detail.ts` (si page détail dédiée ou drawer)
- `apps/web/src/features/teams/skills/hooks/use-skill-mutations.ts` (create / update / archive / restore)
- `apps/web/src/features/teams/skills/hooks/use-skill-categories-list.ts`
- `apps/web/src/features/teams/skills/hooks/use-skill-category-mutations.ts`
- `apps/web/src/features/teams/skills/components/skills-catalog-layout.tsx` — onglets Catégories / Compétences
- `apps/web/src/features/teams/skills/components/skills-list-table.tsx`
- `apps/web/src/features/teams/skills/components/skill-filters-bar.tsx`
- `apps/web/src/features/teams/skills/components/skill-status-badge.tsx`
- `apps/web/src/features/teams/skills/components/skill-reference-level-badge.tsx`
- `apps/web/src/features/teams/skills/components/skill-form-dialog.tsx` (création / édition)
- `apps/web/src/features/teams/skills/components/skill-archive-actions.tsx`
- `apps/web/src/features/teams/skills/components/skill-categories-table.tsx`
- `apps/web/src/features/teams/skills/components/skill-category-form-dialog.tsx`
- `apps/web/src/features/teams/skills/schemas/skill-form.schema.ts` (Zod, aligné DTO backend)

### Collaborateur — compétences (`features/teams/collaborators`)

- `apps/web/src/features/teams/collaborators/api/collaborator-skills.api.ts`
- `apps/web/src/features/teams/collaborators/hooks/use-collaborator-skills.ts`
- `apps/web/src/features/teams/collaborators/hooks/use-collaborator-skill-mutations.ts` (CRUD + validate / invalidate + bulk optionnel)
- `apps/web/src/features/teams/collaborators/components/collaborator-skills-panel.tsx` — tableau + actions
- `apps/web/src/features/teams/collaborators/components/collaborator-skill-form-dialog.tsx` — ajout / édition association
- `apps/web/src/features/teams/collaborators/components/collaborator-skill-level-comparison.tsx` — réel vs attendu (badges)
- `apps/web/src/features/teams/collaborators/components/collaborator-skill-source-badge.tsx`
- `apps/web/src/features/teams/collaborators/lib/collaborator-skill-query-keys.ts`
- Modifier `apps/web/src/app/(protected)/teams/collaborators/[collaboratorId]/page.tsx` — **onglets** ou layout à sections : profil existant + **Compétences**

### Navigation & shell

- `apps/web/src/config/navigation.ts` — transformer **Equipes** en entrée à **sous-liens** (pattern `SidebarDropdown` comme Budgets / Projets) : **Collaborateurs** (`/teams/collaborators`), **Catalogue compétences** (`/teams/skills`), avec permissions respectives `collaborators.read` et `skills.read`
- `apps/web/src/components/shell/sidebar.tsx` — branche dédiée **Equipes** : visibilité du menu parent si `collaborators.read || skills.read` ; chaque enfant filtré par sa permission ; état actif sur préfixe de route `/teams/...`

### Tests

- `apps/web/src/features/teams/skills/lib/skill-label-mappers.spec.ts`
- `apps/web/src/config/navigation.spec.ts` — ajuster si les assertions sur Equipes changent

## Documentation

- `docs/RFC/RFC-FE-TEAM-003 — UI Compétences.md` (ce document)
- `docs/RFC/_RFC Liste.md` — entrée RFC-FE-TEAM-003
- `docs/RFC/_Plan de déploiement - Equipe.md` — étape déploiement / lien (si suivi produit)

---

# 4. Implémentation complète

## 4.1 Périmètre fonctionnel UI

### A. Catalogue (client)

- Liste paginée des **compétences** avec colonnes lisibles : nom, catégorie (`categoryName`), niveau de référence, statut, dates ; pas d’UUID en colonne principale.
- Filtres : recherche, catégorie, statut(s), niveau(x) de référence, option « inclure archivées » (`includeArchived`).
- Actions selon RBAC : création / édition / archivage / restauration ; pas de suppression physique de compétence côté UI (aligné backend MVP).
- Gestion des **catégories** : liste + création / édition / suppression (si vide côté API — gérer erreur 409 par toast explicite).
- Formulaires : `categoryId` en **select/combobox** avec **nom de catégorie** visible ; jamais afficher seul un `categoryId`.

### B. Collaborateur

- Sur la fiche `/teams/collaborators/[collaboratorId]`, ajouter une zone **Compétences** (onglet dédié recommandé pour séparer chargement et permissions).
- Liste des associations : compétence (`skillName`), catégorie (`skillCategoryName`), niveau réel, source, validation manager (`validatedByName`, `validatedAt`), commentaire, date de revue.
- **Comparaison niveaux** : afficher `level` et `skillReferenceLevel` avec libellés (badges) — signal visuel d’écart optionnel (texte ambre discret si `level` < `skillReferenceLevel` selon ordre enum, hors scope calcul métier complexe au MVP).
- Compétence **archivée** encore associée : badge ou ligne en « avertissement » conforme `FRONTEND_UI-UX` (texte de vigilance ambre).
- Actions : ajouter une compétence (combobox alimentée par `GET /api/skills/options`, compétences déjà liées exclues), éditer niveau/source/commentaire/revue, valider / invalider (si `skills.update`), supprimer l’association.
- **Bulk** : action optionnelle « ajouter plusieurs compétences » (dialog checklist) appelant `POST .../bulk` — afficher le résumé `created` / `skipped` retourné par l’API.

### C. Vue inverse (hors page dédiée obligatoire au MVP)

- `GET /api/skills/:skillId/collaborators` peut être consommée depuis le **détail d’une compétence** (drawer ou route future `/teams/skills/[skillId]`) — **v2 courte** : lien « Voir les collaborateurs » sur une ligne du catalogue ouvrant un panneau liste paginée. Peut être reporté si délai serré ; la RFC recommande au moins un **drawer** depuis la ligne du tableau catalogue.

## 4.2 Routes frontend

| Route | Rôle |
| ----- | ---- |
| `/teams/skills` | Catalogue : onglets ou sections Catégories / Compétences |
| `/teams/collaborators` | Inchangé (liste) |
| `/teams/collaborators/[collaboratorId]` | Profil + onglet **Compétences** |

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
- `GET /api/skills/:skillId/collaborators` (drawer / v2)

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
| Voir compétences sur fiche collaborateur | `skills.read` |
| Ajouter / modifier / supprimer associations, validate / invalidate | `skills.update` |

La page collaborateurs existante reste sous `collaborators.read` ; l’onglet Compétences affiche un état **403** clair si `skills.read` manque, et masque les actions d’écriture sans `skills.update`.

## 4.6 Query keys / cache

Préfixe cohérent avec la fondation Équipes :

- `['teams', clientId, 'skills', 'list', paramsHash]`
- `['teams', clientId, 'skills', 'detail', skillId]`
- `['teams', clientId, 'skill-categories', 'list', paramsHash]`
- `['teams', clientId, 'collaborators', collaboratorId, 'skills', paramsHash]`
- `['teams', clientId, 'skills', skillId, 'collaborators', paramsHash]` (vue inverse)

Invalidation après mutations : listes concernées + détail collaborateur + options `skills/options`.

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

## 6.1 Unitaires

- Mappers enums → libellés FR (toutes valeurs connues).
- Construction des options de combobox (id interne vs label affiché).
- Filtrage des compétences déjà associées pour le dialog d’ajout.

## 6.2 Integration / composants

- Liste catalogue : états loading / empty / error.
- Fiche collaborateur : onglet Compétences avec mock API — affichage `skillName` / `validatedByName`.
- Changement de client actif : ne doit pas laisser d’anciennes données visibles (clés de requête).

## 6.3 Cas critiques conformité Starium

- Aucun UUID affiché comme libellé principal dans les tableaux, filtres, badges ou placeholders.
- Pas de données d’un autre client après switch (cache invalidé).
- Gestion explicite 403 / 404 sur les routes API.

---

# 7. Récapitulatif final

**RFC-FE-TEAM-003** spécifie l’UI **Catalogue de compétences** et la **gestion des compétences collaborateur** sur la base des API RFC-TEAM-003 et RFC-TEAM-004, avec navigation Équipes enrichie (Collaborateurs + Catalogue), RBAC `skills.*` + `collaborators.read`, query keys tenant-aware, et respect strict de la règle **valeur métier / pas d’ID brut**.

Livrable attendu : expérience admin RH / manager cohérente avec le reste du module Équipes, prête pour les évolutions **matrice** (RFC-TEAM-015) et **alertes** (RFC-TEAM-016).

---

# 8. Points de vigilance

- **Ne pas confondre** `Skill.referenceLevel` (attendu catalogue) et `CollaboratorSkill.level` (niveau réel) — l’UI doit les distinguer visuellement.
- **Compétences archivées** : ne peuvent pas être nouvellement ajoutées ; les liaisons existantes restent visibles avec signal fort.
- **Sidebar** : la visibilité du groupe Equipes doit gérer le cas où l’utilisateur n’a qu’un des deux modules (`collaborators` ou `skills`) — éviter de masquer toute la section par erreur.
- **Permissions** : ne pas exiger `collaborators.update` pour éditer les compétences — c’est `skills.update` qui prime pour les associations.
- **Performance** : pagination serveur respectée ; éviter de charger toutes les options skills sans limite (utiliser `limit` / recherche côté API si disponible).
