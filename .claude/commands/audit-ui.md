---
description: Audit Design System + RGAA + mobile d'un écran, composant ou du diff frontend
argument-hint: [fichier, dossier ou écran — vide = diff frontend courant]
allowed-tools: Bash(git diff:*), Bash(git status:*), Bash(pnpm audit:modals:*), Bash(pnpm --filter*), Read, Grep, Glob
---

Cible : **$ARGUMENTS** (si vide, auditer les fichiers frontend modifiés).

Fichiers frontend modifiés : !`git diff --stat HEAD -- apps/web`

Applique la skill `starium-design-system` (et `starium-modales` si une modale est concernée) puis
rends un rapport structuré :

### 1. Tokens et valeurs en dur
Hex, `px` arbitraires, `text-gray-*` / `bg-white` / `border-slate-*`, classe `border` seule,
`neutral-500`→`800` utilisés pour du corps de texte.

### 2. Composants
Réinvention d'un composant existant (vérifier `docs/INVENTAIRE-COMPOSANTS.md`), markup ad hoc au lieu
de `LoadingState` / `EmptyState` / `ErrorState` / `PageHeader` / `KpiCard` / `Table`, `asChild` sur
`Button`, `SelectValue` sans libellé enfant.

### 3. Structure
Cadre dans cadre (KPI dans une `Card`), mauvais usage de `.starium-module` / `.starium-section` /
`.starium-panel`, sticky header cassé par un wrapper intermédiaire, > 8 colonnes de tableau.

### 4. États
Loading / empty / error présents et annoncés.

### 5. RGAA
Sémantique, clavier, `focus-visible`, `<label>`, `aria-invalid` + `aria-describedby`, contrastes,
info portée par la couleur seule, `aria-live`, `aria-hidden` sur icônes décoratives.

### 6. Mobile
Rendu à 320px, largeurs fixes, `min-w-[…]` sur des contrôles de filtre, cibles < 44px, dépendance au
hover, stratégie tableau.

### 7. Libellés
ID technique visible, anglais, Title Case, emoji.

Pour chaque écart : `fichier:ligne`, ce qui ne va pas, la correction exacte. Termine par les
corrections prioritaires. Si des modales sont touchées, lance `pnpm audit:modals`.
