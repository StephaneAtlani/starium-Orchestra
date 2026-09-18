# Plan — US-PROC-04 Lister / filtrer / rechercher

**RFC** : RFC-PROC-002 · **Feature** : `proc-002-us04-list-filter`  
**Commit cible** : `feat(procedures): filter and search procedures catalog`

## Objectif

Compléter le catalogue `/procedures` : recherche texte, filtres statut/catégorie, pagination basique, états loading/empty/error déjà présents.

## Hypothèses figées

1. API `GET /api/procedures` déjà exposée (US-01) — **pas de changement schema**.
2. UI : `FilterBar` / `FilterBarField` + Input recherche.
3. Pagination simple précédent/suivant (limit 20).

## Fichiers

- `apps/web/src/features/procedures/components/procedures-catalog.tsx`
- éventuellement `procedure-labels.ts` (réutilise)
- tests FE optionnels légers si pattern existant — sinon skip si pas de test catalog skills

## Critères d’acceptation

1. Filtre statut (tous / DRAFT / PUBLISHED / ARCHIVED via includeArchived)
2. Filtre catégorie
3. Recherche `q` sur code/titre (debounce ou submit)
4. Colonnes : code, titre, statut, version publiée (n° + date), propriétaire, maj
5. Cartes mobile déjà présentes — conserver
6. `audit:ui-ids` vert

## Hors scope

- Archive actions (US-03), éditeur (US-02), API nouvelles

## By design

RGPD N/A nouveau · RGAA labels filtres · DS FilterBar · Sécurité lecture seule · Mobile FilterBar wrap
