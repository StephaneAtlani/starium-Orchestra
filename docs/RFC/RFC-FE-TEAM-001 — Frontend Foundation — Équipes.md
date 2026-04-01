# RFC-FE-TEAM-001 — Frontend Foundation — Équipes

## Statut

✅ Implémentée

## Priorité

Haute

## Dépendances

- RFC-TEAM-001 — Synchronisation des collaborateurs depuis annuaire
- RFC-TEAM-002 — Référentiel Collaborateurs métier
- `docs/ARCHITECTURE.md` — conventions frontend, multi-client, API-first
- `.cursorrules` — règle UI: afficher la valeur métier, jamais l'ID brut

---

# 1. Analyse de l'existant

Le module Équipes a démarré avec `RFC-FE-TEAM-002` (UI Collaborateurs) mais la couche fondation n'était pas formalisée dans une RFC dédiée.

Constat actuel:

- structure `apps/web/src/features/teams/collaborators/*` déjà présente;
- routes `/teams/collaborators` et `/teams/collaborators/[collaboratorId]` en place;
- API client teams dédiée et hooks React Query existants;
- conventions d'état (`loading`, `error`, `empty`) appliquées sur la liste et le détail;
- navigation module Équipes branchée avec contrôle permission `collaborators.read`.

Objectif de cette RFC: figer la fondation frontend du module Équipes pour sécuriser les lots FE-TEAM-003 à FE-TEAM-009.

---

# 2. Hypothèses éventuelles

- Le backend `collaborators` reste la source de vérité et continue d'exposer `status`/`source` et les champs d'affichage métier.
- Tous les appels frontend passent par `authenticated-fetch` avec `X-Client-Id` dérivé du client actif.
- Le namespace frontend peut rester `teams/*` sans dévier des permissions backend `collaborators.*`.
- Les futures UI Teams (compétences, staffing, vue manager) réutiliseront les patterns posés ici (API client, query keys, états, garde permissions).

---

# 3. Liste des fichiers à créer / modifier

## Frontend Foundation (référence implémentée)

- `apps/web/src/features/teams/collaborators/api/collaborators.api.ts`
- `apps/web/src/features/teams/collaborators/types/collaborator.types.ts`
- `apps/web/src/features/teams/collaborators/lib/collaborator-query-keys.ts`
- `apps/web/src/features/teams/collaborators/hooks/use-collaborators-list.ts`
- `apps/web/src/features/teams/collaborators/hooks/use-collaborator-detail.ts`
- `apps/web/src/features/teams/collaborators/hooks/use-update-collaborator.ts`
- `apps/web/src/features/teams/collaborators/hooks/use-collaborator-manager-options.ts`
- `apps/web/src/app/(protected)/teams/collaborators/page.tsx`
- `apps/web/src/app/(protected)/teams/collaborators/[collaboratorId]/page.tsx`
- `apps/web/src/config/navigation.ts` (entrée module Équipes)

## Documentation

- `docs/RFC/RFC-FE-TEAM-001 — Frontend Foundation — Équipes.md` (ce document)
- `docs/RFC/_Plan de déploiement - Equipe.md`

---

# 4. Implémentation complète

## 4.1 Structure feature-first

Le module Équipes suit la structure:

- `features/teams/<sous-module>/api`
- `features/teams/<sous-module>/hooks`
- `features/teams/<sous-module>/components`
- `features/teams/<sous-module>/types`
- `features/teams/<sous-module>/lib`

Ce pattern est la base obligatoire pour FE-TEAM-003+.

## 4.2 Routes frontend

- `/teams/collaborators` (liste)
- `/teams/collaborators/[collaboratorId]` (détail + édition)

Ces routes posent le pattern de routing module Équipes.

## 4.3 API client Teams

Le client API Teams expose:

- `listCollaborators`
- `getCollaboratorById`
- `updateCollaborator`
- `listCollaboratorManagerOptions`

Le format listé reste homogène: `{ items, total, offset, limit }`.

## 4.4 Query keys et cache

Convention adoptée:

- namespace FE: `['teams', 'collaborators', ...]`
- isolation cache par client actif (`clientId` obligatoire dans chaque clé)

Important: namespace FE `teams` ne change pas les permissions backend, qui restent `collaborators.*`.

## 4.5 Permissions frontend

- visibilité module/sidebar Équipes sous permission `collaborators.read`
- accès page liste conditionné à `collaborators.read`
- actions d'édition conditionnées à `collaborators.update`
- gestion explicite des cas API `403` / `404`

## 4.6 Conventions d'état UI

Tous les écrans Teams doivent gérer explicitement:

- `loading`
- `error`
- `empty`
- `success`

et conserver des messages métier lisibles (pas d'IDs techniques visibles).

---

# 5. Modifications Prisma si nécessaire

Aucune modification Prisma dans cette RFC frontend.

Le périmètre fondation FE consomme l'API existante et n'étend pas le modèle de données.

---

# 6. Tests

## 6.1 Tests frontend fondation

- hooks query/mutation avec `clientId` dans query keys;
- fallback UX propre en `403`/`404`;
- vérification navigation Équipes masquée si absence `collaborators.read`.

## 6.2 Tests d'intégration UI

- accès liste + détail collaborateurs;
- contrôle édition selon `collaborators.update`;
- cohérence état loading/error/empty.

---

# 7. Récapitulatif final

`RFC-FE-TEAM-001` formalise la fondation frontend du module Équipes déjà amorcée avec la livraison Collaborateurs.

Elle fixe les conventions structurelles (`features/teams`), de data access (API client + query keys tenant-aware), de routing (`/teams/*`) et de permissions (`collaborators.read`/`collaborators.update`) pour les prochains lots.

---

# 8. Points de vigilance

- ne pas casser l'isolation cache par client actif;
- conserver l'alignement FE `teams/*` vs permissions backend `collaborators.*`;
- ne jamais afficher d'ID brut dans les options/listes Teams;
- garder une gestion uniforme des états UI entre tous les écrans du module.
