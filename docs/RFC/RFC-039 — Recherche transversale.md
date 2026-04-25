# RFC-039 — Recherche transversale (Global Search)

## 1. Analyse de l’existant

- Le produit expose déjà plusieurs modules métier (projects, budgets, contracts, teams, suppliers, strategic vision), chacun avec ses propres listes/filters.
- Il n’existe pas encore de point d’entrée unifié pour rechercher rapidement une entité métier depuis l’en-tête applicatif.
- L’architecture Starium impose: API-first, logique métier côté backend, isolation stricte par `clientId`, RBAC systématique, UI sans duplication des règles métier.
- Le besoin fonctionnel récurrent est une recherche "type Spotlight" orientée navigation rapide, avec résultats lisibles (valeur métier) et jamais des IDs bruts.

## 2. Hypothèses éventuelles

- Périmètre V1: recherche cross-modules dans le **client actif uniquement** (pas de recherche multi-client agrégée).
- Les droits de lecture existants (`*.read`) par module restent la source de vérité de visibilité.
- PostgreSQL reste le moteur principal; pas d’introduction d’Elasticsearch/Meilisearch en V1.
- V1 privilégie une stratégie SQL pragmatique (`ILIKE` + index ciblés + ranking simple), évolutive vers moteur dédié si volumétrie augmente.

## 3. Liste des fichiers à créer / modifier

### Backend API (`apps/api`)

- `src/modules/search/search.module.ts`
- `src/modules/search/search.controller.ts`
- `src/modules/search/search.service.ts`
- `src/modules/search/dto/search-query.dto.ts`
- `src/modules/search/dto/search-result.dto.ts` (ou type interne exposé)
- `src/app.module.ts` (enregistrement du module)
- `src/modules/audit/*` (événement de recherche si activé)
- `prisma/schema.prisma` (index additionnels si nécessaires)
- `prisma/migrations/<timestamp>_rfc_039_search_indexes/` (si ajout index SQL)

### Frontend (`apps/web`)

- `src/services/search.ts`
- `src/features/search/hooks/use-global-search.ts`
- `src/features/search/components/global-search-command.tsx`
- `src/components/shell/workspace-header.tsx` (brancher la loupe vers la commande)

### Documentation

- `docs/API.md` (contrat endpoint recherche)
- `docs/ARCHITECTURE.md` (ajout module Search dans la cartographie backend/frontend)
- `docs/RFC/_RFC Liste.md` (index RFC)

## 4. Implémentation complète

### 4.1 Objectif produit V1

Livrer une recherche transversale rapide qui permet:
- de trouver une entité métier par mot-clé (nom, code, titre, email, référence),
- de naviguer vers sa page détail/liste filtrée,
- tout en respectant strictement le scope `clientId` actif et les permissions RBAC existantes.

### 4.2 Contrat API

Endpoint V1:
- `GET /api/search`

Query params:
- `q` (string, requis, min 2 caractères, max 120)
- `limit` (optionnel, défaut 20, max 50)
- `types` (optionnel, liste: `project`, `budget`, `contract`, `supplier`, `collaborator`, `notification`, etc.)

Réponse:
- `items: SearchResult[]`
- `meta: { q, limit, tookMs }`

`SearchResult` (exemple de forme canonique):
- `type`: type métier
- `id`: identifiant technique (interne)
- `label`: **valeur métier affichable** (obligatoire)
- `subtitle`: contexte lisible (optionnel)
- `actionUrl`: URL de navigation frontend
- `highlights`: fragments textuels (optionnel)
- `updatedAt`: date de fraîcheur (optionnel)

Règle UX contractuelle:
- L’UI affiche `label`/`subtitle`; l’`id` reste technique, non affiché brut.

### 4.3 Sécurité et multi-client

- Guard auth standard obligatoire.
- `clientId` dérivé du contexte actif autorisé; jamais pris aveuglément depuis l’input utilisateur.
- Chaque source de résultat applique `where: { clientId: <activeClientId> }`.
- Les blocs de recherche par domaine sont conditionnés par les permissions `*.read` correspondantes.
- Aucune fuite inter-client: un item hors scope n’est ni retourné ni comptabilisé.

### 4.4 Moteur de recherche V1 (backend)

Approche V1:
- Orchestration dans `SearchService`.
- Exécution de sous-requêtes par domaine autorisé (projects, budgets, contracts, ...).
- Normalisation des résultats vers `SearchResult`.
- Tri final par score simple:
  1) exact match sur code/nom,
  2) préfixe,
  3) contains,
  4) fraîcheur (`updatedAt desc`) en tie-break.

Recommandations SQL:
- Préférer des colonnes métier déjà présentes (`name`, `code`, `title`, `email`, `reference`).
- Ajouter index BTREE/TRGM ciblés uniquement sur champs réellement interrogés.
- Éviter toute recherche sur payload JSON non indexé en V1.

### 4.5 UX frontend V1

- Ouvrir une commande globale via clic loupe + raccourci clavier (`Cmd/Ctrl + K`).
- Debounce 200-300ms côté client.
- États requis: idle (<2 chars), loading, empty, error, data.
- Affichage groupé par type (Projets, Budgets, Contrats...).
- Navigation clavier complète (haut/bas/entrée/esc).
- Sélection d’un résultat => `router.push(actionUrl)`.

Règle "valeur, pas ID":
- Libellés visibles issus de `label` et `subtitle`.
- Interdit d’afficher un UUID/ID brut dans la liste de résultats.

### 4.6 Observabilité / audit

- Mesurer `tookMs` côté service pour suivi performance.
- Log technique non sensible en debug.
- Audit fonctionnel optionnel V1:
  - `search.executed` avec `clientId`, `userId`, `queryLength`, `resultCount`.
- Ne pas stocker la requête brute si contrainte privacy renforcée; sinon tronquer/sanitiser.

## 5. Modifications Prisma si nécessaire

En V1, pas de nouveau modèle obligatoire.

Ajouts possibles (selon mesures réelles):
- index sur `Project.name`, `Project.code`
- index sur `Budget.name`
- index sur `Contract.name`, `Contract.vendorName`
- index trigram (`pg_trgm`) pour `ILIKE` performant sur champs textuels volumineux

Contraintes:
- Migrations strictement additives.
- Aucun impact sur l’isolation client.

## 6. Tests

### Backend

- Unit tests `SearchService`:
  - scoping `clientId`,
  - respect des permissions,
  - normalisation des `SearchResult`,
  - ranking basique.
- Tests e2e `GET /api/search`:
  - `q` invalide (<2 chars),
  - utilisateur sans permissions lecture sur un domaine,
  - isolation inter-client (non-régression critique),
  - limite max.

### Frontend

- Tests composant recherche:
  - debounce + appels API,
  - rendu loading/empty/error,
  - navigation clavier,
  - redirection sur sélection.
- Test de non-régression UX:
  - aucun ID brut affiché dans la liste.

## 7. Récapitulatif final

Cette RFC introduit une recherche transversale V1 centrée sur la navigation rapide:
- backend unique `GET /api/search`,
- sécurité/RBAC/multi-client stricts,
- UX commande globale dans le header,
- résultats métier lisibles (valeur affichée, pas ID),
- architecture évolutive vers moteur de recherche dédié si nécessaire.

## 8. Points de vigilance

- Ne pas contourner les permissions par module dans l’agrégation.
- Ne jamais mélanger des données de clients différents dans une même réponse.
- Ne pas afficher d’identifiants techniques bruts en UI.
- Surveiller la perf SQL avant d’élargir le nombre de domaines recherchés.
- Garder le scope V1 strict (navigation/search), sans dériver vers analytics sémantiques complexes.
