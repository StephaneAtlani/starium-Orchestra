# RFC-STRAT-009 — Vision stratégique V1 — Frontend cockpit et UX

## Statut

✅ Implémentée (Frontend V1)

## 1. Analyse de l’existant

Le cockpit `/strategic-vision` existe avec une base de navigation, mais le plan V1 impose un découpage UI clair (onglets, KPI, cartes, formulaires) et des règles UX strictes.

## 2. Hypothèses éventuelles

- Next.js + TypeScript + Tailwind + shadcn/ui restent la base UI.
- Le frontend consomme uniquement les API backend ; aucune logique métier critique n’est répliquée.
- Les permissions API sont réutilisées pour le gating UI.

## 3. Fichiers à créer / modifier

- `apps/web/src/app/(protected)/strategic-vision/page.tsx`
- `apps/web/src/features/strategic-vision/api/strategic-vision.api.ts`
- `apps/web/src/features/strategic-vision/api/strategic-vision.queries.ts`
- `apps/web/src/features/strategic-vision/api/strategic-vision.mutations.ts`
- `apps/web/src/features/strategic-vision/types/strategic-vision.types.ts`
- `apps/web/src/features/strategic-vision/schemas/strategic-vision.schemas.ts`
- composants `apps/web/src/features/strategic-vision/components/*`
- navigation : `apps/web/src/config/navigation.ts` (si entrée manquante)

## 4. Implémentation complète

Implémentation réalisée côté `apps/web/src/features/strategic-vision` avec migration progressive (non destructive) de la data-layer, sans modification backend/Prisma.

### 4.1 Route et structure page

- Route : `/strategic-vision`
- Structure :
  - breadcrumb ;
  - header ;
  - KPI cards ;
  - tabs ;
  - contenu principal.

### 4.2 Onglets V1

- Vue d’ensemble
- Vision entreprise
- Axes stratégiques
- Objectifs
- Alignement
- Alertes
- Historique (placeholder acceptable en V1)

### 4.3 Query keys tenant-aware

```ts
strategicVisionKeys = {
  all: (clientId: string) => ["strategic-vision", clientId],
  list: (clientId: string) => ["strategic-vision", clientId, "list"],
  detail: (clientId: string, visionId: string) => ["strategic-vision", clientId, "detail", visionId],
  axes: (clientId: string, visionId: string) => ["strategic-vision", clientId, visionId, "axes"],
  objectives: (clientId: string, axisId: string) => ["strategic-vision", clientId, "axis", axisId, "objectives"],
  links: (clientId: string, objectiveId: string) => ["strategic-vision", clientId, "objective", objectiveId, "links"],
  kpis: (clientId: string) => ["strategic-vision", clientId, "kpis"],
  alerts: (clientId: string) => ["strategic-vision", clientId, "alerts"],
};
```

Notes d’implémentation:
- alias legacy conservé temporairement (`root -> all`) pour compatibilité pendant la transition;
- invalidations alignées sur les mutations axes/objectifs/liens/directions.

### 4.4 Règles UX obligatoires

- Afficher des libellés métier (`name`, `title`, `code`, etc.), jamais des IDs bruts.
- Mapper statuts/enums en labels FR lisibles.
- États `loading`, `error`, `empty`, `success` sur chaque vue principale.
- Masquer/désactiver les actions sans permissions requises.

### 4.5 Composants cibles V1

- `strategic-kpi-cards.tsx`
- `strategic-axis-card.tsx`
- `strategic-vision-tabs.tsx` (inclut Alertes + Historique placeholder)
- `strategic-alerts-panel.tsx`
- `objective-status-badge.tsx`
- `strategic-vision-create-dialog.tsx` / `strategic-vision-edit-dialog.tsx`
- `strategic-axis-create-dialog.tsx` / `strategic-axis-edit-dialog.tsx`
- `strategic-objective-create-dialog.tsx` / `strategic-objective-edit-dialog.tsx`
- `strategic-objectives-tab.tsx`

Ajouts structure frontend réalisés:
- `api/strategic-vision.queries.ts`
- `api/strategic-vision.mutations.ts`
- `schemas/strategic-vision.schemas.ts`
- `lib/strategic-vision-labels.ts`

## 5. Modifications Prisma si nécessaire

Aucune modification Prisma attendue pour cette RFC frontend.

## 6. Tests

Frontend :

- rendering des KPI, vision, axes, objectifs ;
- états `loading/error/empty/success` ;
- gating UI par permissions ;
- invalidation query après mutation ;
- vérification qu’aucun ID brut n’est affiché dans les inputs/listes/badges/tables.

Tests ajoutés/mis à jour:
- `strategic-vision-query-keys.spec.ts`
- `strategic-vision-tabs.spec.ts`
- `strategic-alerts-panel.spec.ts`
- `strategic-kpi-cards.spec.ts`

## 7. Récapitulatif final

Cette RFC cadre l’expérience cockpit stratégique V1 avec une UI robuste, tenant-aware, orientée pilotage, et alignée avec la règle Starium “valeur affichée, pas ID”.

## 8. Points de vigilance

- Ne pas coder des calculs KPI dans React.
- Garder les query keys strictement client-scopées.
- Vérifier l’uniformité des mappings d’enums sur tous les onglets.
