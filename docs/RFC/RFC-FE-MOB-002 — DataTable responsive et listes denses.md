# RFC-FE-MOB-002 — DataTable responsive et listes denses

## Statut

📝 Draft

## Priorité

Haute — Lot 1 (après RFC-FE-MOB-001)

## Dépendances

- [RFC-FE-MOB-001 — Fondations mobile-first transverses](./RFC-FE-MOB-001%20%E2%80%94%20Fondations%20mobile-first%20transverses.md)
- [RFC-014-1 — UX/UI et Design System](./RFC-014-1%20%E2%80%94%20UX-UI%20et%20Design%20System%20de%20l%E2%80%99application.md)
- `apps/web/src/components/ui/table.tsx`
- `apps/web/src/components/data-table/data-table.tsx`

## Suite du programme

- [RFC-FE-MOB-003 — FilterBar, toolbars et plan de migration modules](./RFC-FE-MOB-003%20%E2%80%94%20FilterBar%2C%20toolbars%20et%20plan%20de%20migration%20modules.md) — migration écran par écran (lots 1 à 4)

---

# 1. Analyse de l'existant

## 1.1 Composant `Table` (shadcn maison)

Fichier : `apps/web/src/components/ui/table.tsx`

| Aspect | État |
| ------ | ---- |
| Wrapper | `TableContainer` + `overflow-x-auto` + hook `useTablePan` (drag scroll souris) |
| Cellules | `whitespace-nowrap` par défaut sur `TableHead` / `TableCell` |
| Tokens | `--ds-table-head-py`, `--ds-table-cell-py` — conforme Design System |
| Hover ligne | `hover:bg-neutral-50` — **info secondaire au survol** (acceptable desktop ; pas bloquant mobile) |

**~80 fichiers** importent `@/components/ui/table`. Stratégie scroll horizontal = conforme au minimum by-design (« scroll contrôlé ») mais **insuffisant** pour l'exploitabilité CODIR sur mobile (lecture colonne par colonne pénible).

## 1.2 Composant `DataTable` générique

Fichier : `apps/web/src/components/data-table/data-table.tsx`

- Colonnes déclaratives `DataTableColumn<T>`.
- États loading / error / empty déjà gérés.
- **Aucun rendu mobile alternatif** : toujours `<Table>` classique.

Usages typiques : listes RBAC, licences, gouvernance, ressources, etc.

## 1.3 Tables « métier denses » hors `DataTable`

Tables custom à largeur fixe / nombreuses colonnes — **hors scope migration cartes** (scroll horizontal documenté comme stratégie légitime) :

| Zone | Fichier(s) | Stratégie mobile retenue |
| ---- | ---------- | ------------------------ |
| Budget explorer | `budget-explorer-table.tsx`, `budget-explorer-row.tsx` | Scroll horizontal + pan ; colonnes figées option Lot 2 |
| Gantt portefeuille / projet | `project-gantt-panel.tsx` | Scroll horizontal contrôlé — voir [RFC-PROJ-GANTT-001](./RFC-PROJ-GANTT-001%20%E2%80%94%20Gantt%20projet%20frontend%20.md) |
| Grille temps réalisé | `teams/time-entries/page.tsx` | Scroll + filtres — spec dans [_RFC Liste](./_RFC%20Liste.md) (entrée **RFC-TEAM-009**, pas de fichier `.md` dédié) et [API.md](../API.md) |
| Matrices scénario / EBIOS | `project-risk-ebios-dialog.tsx`, `Scenario*Panel.tsx` | Scroll ; cartes hors scope V1 |
| Comité CODIR widgets | `committee-widget-registry.tsx` | Scroll ; présentation wide déjà prévue (`app-shell` wide main) |

## 1.4 Tables brutes `<table>` (hors composant UI)

8 fichiers avec `<table` HTML direct — à migrer vers `Table` ou `DataTable` lors des lots modules.

---

# 2. Hypothèses éventuelles

- **H1** — Le breakpoint de bascule table → cartes est **`md` (768px)** : cohérent avec la sidebar visible à partir de `md` dans `sidebar.tsx`.
- **H2** — Chaque colonne peut déclarer une **priorité** : `primary` (toujours visible en carte), `secondary` (visible en carte), `hidden-mobile` (masquée en carte, visible table desktop).
- **H3** — Les actions de ligne (boutons, menus) restent accessibles en bas de carte mobile.
- **H4** — Pas de changement API backend : les libellés métier sont déjà dans les DTOs ou mappés côté cell renderer.
- **H5** — `useTablePan` reste actif sur desktop ; sur touch, le scroll natif `overflow-x-auto` suffit (pas de conflit pan/sroll).

---

# 3. Liste des fichiers à créer / modifier

| Fichier | Action |
| ------- | ------ |
| `apps/web/src/components/data-table/data-table.tsx` | Modifier — rendu cartes mobile |
| `apps/web/src/components/data-table/data-table-card.tsx` | Créer — carte ligne responsive |
| `apps/web/src/components/data-table/data-table.types.ts` | Créer — extension `DataTableColumn` |
| `apps/web/src/components/data-table/data-table.spec.tsx` | Créer — rendu mobile vs desktop |
| `apps/web/src/components/ui/table.tsx` | Modifier (mineur) — hint scroll mobile optionnel |
| `apps/web/src/hooks/use-media-query.ts` | Créer si absent — `useIsMobile()` / `useMinMd()` |
| `docs/INVENTAIRE-COMPOSANTS.md` | Mettre à jour — `DataTable` mobile |
| `docs/RFC/RFC-FE-MOB-002 — DataTable responsive et listes denses.md` | Ce document |

---

# 4. Implémentation complète

## 4.1 Extension du type `DataTableColumn<T>`

```typescript
export type DataTableColumnPriority = 'primary' | 'secondary' | 'hidden-mobile';

export type DataTableColumn<T> = {
  key: string;
  header: string;
  cell?: (row: T) => React.ReactNode;
  className?: string;
  /** Libellé affiché devant la valeur en vue carte (défaut : header) */
  mobileLabel?: string;
  /** Priorité d'affichage mobile. Défaut : secondary sauf première colonne → primary */
  mobilePriority?: DataTableColumnPriority;
};
```

Règle par défaut si `mobilePriority` absent :

1. Première colonne → `primary` (titre de la carte).
2. Colonnes avec `cell` custom contenant un lien/badge → `secondary`.
3. Colonnes techniques (dates, montants) → `secondary`.
4. Colonnes d'actions (dernière colonne, boutons) → `primary` en zone actions carte.

## 4.2 Composant `DataTableCard`

Structure sémantique :

```html
<article class="rounded-lg border ... p-4 space-y-2 md:hidden">
  <header><!-- colonne primary principale --></header>
  <dl class="grid grid-cols-1 gap-1.5 text-sm">
    <!-- paires dt/dd pour colonnes secondary -->
  </dl>
  <footer><!-- actions ligne --></footer>
</article>
```

- `dt` = `mobileLabel ?? header` ; `dd` = contenu cell.
- Jamais d'UUID seul en texte visible (règle globale inputs valeur / pas ID).
- Cible tactile actions : boutons `size` default ou `icon` avec bump mobile (RFC-FE-MOB-001).

## 4.3 `DataTable` — double rendu

```text
viewport < md  → liste de DataTableCard (ul/li ou div role=list)
viewport ≥ md  → Table actuel (inchangé)
```

Implémentation recommandée : **CSS `md:hidden` / `hidden md:block`** sur les deux branches pour éviter hydration mismatch, plutôt que `useMediaQuery` côté client seul.

Props additionnelles :

```typescript
interface DataTableProps<T> {
  // ... existant
  /** Force le mode table même sur mobile (ex. tableaux très simples 2 colonnes) */
  forceTableOnMobile?: boolean;
  /** Annonce accessibilité du basculement de vue */
  mobileCardsAriaLabel?: string;
}
```

## 4.4 Amélioration optionnelle `TableContainer`

Ajouter un indicateur visuel discret de scroll horizontal sur mobile :

```text
after:pointer-events-none after:absolute after:right-0 ... (gradient fade)
```

Uniquement si `scrollWidth > clientWidth` (petit hook `useHasHorizontalOverflow`). **Option Lot 1.1** — non bloquant.

## 4.5 Tables métier denses — ligne directrice

Pour les tables **non** passées par `DataTable` :

| Niveau | Action |
| ------ | ------ |
| V1 | Conserver scroll horizontal ; documenter dans la RFC module |
| V2 | Extraire colonnes « prioritaires » en en-tête de ligne repliable (accordion) — hors ce lot |
| V3 | Vue carte dédiée (ex. liste projets kanban déjà partiellement couverte) |

## 4.6 Inventaire prioritaire migration `DataTable` cartes

| Priorité | Écran / composant | Module |
| -------- | ----------------- | ------ |
| P0 | `contracts-list-page.tsx` | Contrats |
| P0 | `projects-list-table.tsx` | Projets |
| P0 | `budget-list-table.tsx` | Budgets |
| P0 | `suppliers/page.tsx` | Fournisseurs |
| P1 | `members-list.tsx`, `roles-list.tsx` | RBAC client |
| P1 | `collaborators-list-table.tsx` | Équipes |
| P1 | `purchase-orders-list-page.tsx`, `invoices-list-page.tsx` | Procurement |
| P2 | Admin plateforme, licences, gouvernance, strategic vision | Lots 2–3 |

Détail planning : **RFC-FE-MOB-003**.

---

# 5. Modifications Prisma si nécessaire

Aucune.

---

# 6. Tests

## 6.1 Tests unitaires

| Fichier | Cas |
| ------- | --- |
| `data-table.spec.tsx` | 3 colonnes → carte affiche primary + secondary, masque `hidden-mobile` |
| `data-table.spec.tsx` | `forceTableOnMobile` → pas de branche cartes |
| `data-table.spec.tsx` | État empty : même message mobile et desktop |
| `data-table.spec.tsx` | Cellule avec lien : libellé métier rendu, pas d'UUID brut |

## 6.2 Tests visuels / manuels

- [ ] 320px : liste contrats — cartes empilées, pas de scroll horizontal page entière.
- [ ] 768px : bascule table.
- [ ] Lecteur d'écran : liste cartes annoncée (`aria-label` sur conteneur).
- [ ] Actions ligne (ouvrir, modifier) atteignables au pouce.

## 6.3 Non-régression desktop

- [ ] Tables larges inchangées ≥ `md`.
- [ ] Tri / pagination existants (si ajoutés plus tard) compatibles les deux vues.

---

# 7. Récapitulatif final

`RFC-FE-MOB-002` introduit un **pattern transverse** pour rendre les listes tabulaires exploitables sur mobile via des **cartes empilées** sous `md`, sans casser le rendu table desktop. La migration est **incrémentale** : chaque écran `DataTable` active le comportement par défaut dès merge du composant ; les tables métier denses gardent le scroll horizontal en V1.

Effort estimé : **1–2 jours** composant + tests ; **3–5 jours** migration P0 (4 modules).

---

# 8. Points de vigilance

- **Hydration** : préférer CSS breakpoints aux hooks `window.innerWidth` pour le double rendu.
- **Colonnes très larges** (badges multiples) : tester le wrap en carte (`whitespace-normal` sur `dd`).
- **Ne pas dupliquer** la logique cell : une seule fonction `cell(row)` pour table et carte.
- Budget explorer / Gantt : ne pas forcer le pattern carte en V1 (risque produit + perf).
- Vérifier que les `Link` dans les cellules ont une zone cliquable suffisante en mobile.

---

# 9. Conformité by design

## RGPD

- Affichage inchangé au niveau données ; pas de DCP supplémentaire en vue carte.
- Pas de log de contenu de ligne en clair.

## RGAA

- Vue carte : sémantique `article` + `dl`/`dt`/`dd` ou `table` avec `display` — préférer `dl` pour paires label/valeur.
- Labels explicites (`mobileLabel`) — pas placeholder seul.
- Liste dynamique : conteneur avec `aria-busy` pendant loading (via `LoadingState` existant).
- Contraste badges inchangé (tokens).

## Design System

- Cartes : `rounded-lg border border-border bg-card` (tokens thème).
- Pas de couleur hex en dur dans les nouveaux composants.
- Réutiliser `EmptyState`, `ErrorState`, `LoadingState`.

## Sécurité

- Aucun impact backend ; les actions ligne restent soumises aux mêmes `PermissionGate` / conditions React existantes.

## Interface mobile

- Mobile-first : cartes par défaut `< md`.
- Colonnes prioritaires configurables — objectif lecture CODIR sur téléphone.
- Scroll horizontal réservé aux grilles métier denses documentées §4.5.
