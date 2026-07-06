# RFC-FE-MOB-003 — FilterBar, toolbars et plan de migration modules

## Statut

✅ Implémenté — juin 2026 (FilterBar, migration Lots 1–4, exceptions documentées : grilles denses Gantt/comité/feuilles de temps, matrices EBIOS, export print action-plans, palettes SVG charts et couleurs configurables tags/planner/branding).

## Priorité

Moyenne — Lots 1 à 4 (après RFC-FE-MOB-001 et RFC-FE-MOB-002)

## Dépendances

- [RFC-FE-MOB-001 — Fondations mobile-first transverses](./RFC-FE-MOB-001%20%E2%80%94%20Fondations%20mobile-first%20transverses.md)
- [RFC-FE-MOB-002 — DataTable responsive et listes denses](./RFC-FE-MOB-002%20%E2%80%94%20DataTable%20responsive%20et%20listes%20denses.md)
- [RFC-014-1 — UX/UI et Design System](./RFC-014-1%20%E2%80%94%20UX-UI%20et%20Design%20System%20de%20l%E2%80%99application.md)
- [docs/FRONTEND_UI-UX.md](../FRONTEND_UI-UX.md)

---

# 1. Analyse de l'existant

## 1.1 Pattern filtres actuel (non normalisé)

Chaque module implémente sa propre barre de filtres, en général :

```tsx
<div className="flex flex-wrap items-end gap-3 rounded-lg border ... p-4">
  <div className="min-w-0 flex-1">...</div>
  <SelectTrigger className="w-[min(100%,220px)] min-w-[200px]">...</SelectTrigger>
  <Input className="w-[160px]" type="date" />
</div>
```

**Problèmes mobile (audit juin 2026)** :

| Problème | Exemples | Impact 320–360px |
| -------- | -------- | ---------------- |
| `min-w-[200px]` sur Select | `contracts-list-page`, `budgets-toolbar` | Débordement horizontal |
| `w-[160px]` date fixe | Contrats, budgets | Colonne trop étroite ou wrap incohérent |
| `max-w-md` sur search seul | Contrats | Autres champs ne suivent pas |
| Toolbars denses multi-actions | `budget-explorer-toolbar`, `admin/users` | Boutons serrés < 44px |

~**40 fichiers** contiennent des largeurs `w-[NNNpx]` ou `min-w-[NNNpx]` dans `apps/web/src` (dont une partie légitime : colonnes table, Gantt).

## 1.2 Toolbars d'actions page

`PageHeader` (`layout/page-header.tsx`) gère déjà le responsive actions (`flex-col` → `sm:flex-row`). Les toolbars **sous** le header (filtres, bulk actions) ne suivent pas ce pattern.

## 1.3 Valeurs Design System en dur

~10 fichiers avec couleurs hex (`#…`) — principalement charts et badges projet (`projects/options/page.tsx`, `budget-comparison-kpi-charts`, `project-detail-view`). À traiter en **Lot 4** (nettoyage DS), indépendant des filtres.

---

# 2. Hypothèses éventuelles

- **H1** — Un composant `FilterBar` unique suffit pour 80 % des écrans liste ; les cas extrêmes (budget explorer) gardent une toolbar dédiée avec **sous-ensemble** des primitives `FilterBar`.
- **H2** — Sur mobile, les filtres secondaires peuvent être repliés derrière un bouton « Filtres » (`Collapsible` ou `Sheet`) si plus de 3 champs — **option Lot 2**, pas bloquant Lot 1.
- **H3** — Les libellés de filtres select/combobox restent des **valeurs métier** (règle inputs valeur / pas ID).
- **H4** — Aucune API ni Prisma.

---

# 3. Liste des fichiers à créer / modifier

## 3.1 Nouveaux composants layout

| Fichier | Rôle |
| ------- | ---- |
| `apps/web/src/components/layout/filter-bar.tsx` | Grille responsive filtres |
| `apps/web/src/components/layout/filter-bar-field.tsx` | Champ label + control (accessibilité) |
| `apps/web/src/components/layout/filter-bar.spec.tsx` | Tests layout mobile |

## 3.2 Migrations Lot 1 (exemples)

| Fichier |
| ------- |
| `apps/web/src/features/contracts/components/contracts-list-page.tsx` |
| `apps/web/src/features/projects/components/projects-list-table.tsx` (toolbar associée) |
| `apps/web/src/features/budgets/components/budgets-toolbar.tsx` |
| `apps/web/src/features/budgets/components/budget-exercises-toolbar.tsx` |
| `apps/web/src/app/(protected)/suppliers/page.tsx` |
| `apps/web/src/features/procurement/components/purchase-orders-list-page.tsx` |
| `apps/web/src/features/procurement/components/invoices-list-page.tsx` |

## 3.3 Documentation

| Fichier |
| ------- |
| `docs/RFC/RFC-FE-MOB-003 — FilterBar, toolbars et plan de migration modules.md` |
| `docs/INVENTAIRE-COMPOSANTS.md` — entrée FilterBar |
| `docs/FRONTEND_UI-UX.md` — § pattern filtres mobile (ajout court) |

---

# 4. Implémentation complète

## 4.1 Composant `FilterBar`

### API

```typescript
interface FilterBarProps {
  children: React.ReactNode;
  className?: string;
  desktopColumns?: 2 | 3 | 4 | 'auto'; // défaut : 3
  'aria-label'?: string; // défaut : « Filtres »
  asSearch?: boolean; // role="search" si recherche principale
}

interface FilterBarFieldProps {
  id: string;
  label: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
  children: React.ReactNode | ((props: {
    controlId: string;
    labelId: string;
    descriptionId?: string;
  }) => React.ReactNode);
}
```

### Layout CSS (mobile-first)

```text
container : rounded-lg border border-border/70 bg-muted/15 p-3 sm:p-4

grille :
  grid grid-cols-1 gap-3
  sm:grid-cols-2
  lg:grid-cols-3
  xl:grid-cols-[repeat(auto-fit,minmax(12rem,1fr))]

champs :
  w-full min-w-0   /* jamais min-w-[200px] sur le champ */
  SelectTrigger / Input : w-full
```

### Accessibilité

- Chaque `FilterBarField` : `<label htmlFor>` ou `<span id>` + `aria-labelledby` sur le control.
- Groupe sémantique : `<section aria-label="Filtres">` ou `role="search"` si recherche principale.

## 4.2 Pattern toolbar actions (complément PageHeader)

Pour les barres avec actions + filtres :

```text
<div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
  <FilterBar class="flex-1">...</FilterBar>
  <div class="flex flex-wrap gap-2 shrink-0">
    <!-- boutons : w-full sm:w-auto sur mobile pour cibles tactiles -->
  </div>
</div>
```

Boutons primaires en mobile : `className="w-full sm:w-auto min-h-11"` (aligné RFC-FE-MOB-001).

## 4.3 Filtres repliés mobile (option Lot 2)

Si `children` > 3 champs :

- Mobile : bouton « Filtres » (`aria-expanded`) ouvre `Sheet` side bottom plein écran.
- Desktop : grille inline inchangée.

Composant : `FilterBarCollapsible` — extension optionnelle, non requise pour Lot 1.

## 4.4 Plan de migration par lots

### Lot 0 — Fondations (RFC-FE-MOB-001)

| Livrable | Fichiers |
| -------- | -------- |
| Dialog bottom-sheet | `ui/dialog.tsx` |
| reduced-motion | `globals.css` |
| Touch icon buttons | `ui/button.tsx` |
| PageHeader titre | `layout/page-header.tsx` |

**Critère de sortie** : checklist §6 RFC-FE-MOB-001 validée.

---

### Lot 1 — Listes à fort trafic (RFC-FE-MOB-002 + FilterBar)

| Module | Routes / composants | DataTable cartes | FilterBar |
| ------ | ------------------- | ---------------- | --------- |
| **Contrats** | `/contracts` | ✅ | ✅ |
| **Projets** | `/projects`, `/projects/requests` | ✅ cartes custom (`ProjectsListMobileView` / `ProjectsListProjectCard` — **pas** `DataTable` générique) | ✅ toolbar desktop (`hidden md:block`) ; bottom sheet filtres mobile ; **liste dense desktop** `projects-list-table-desktop` = scroll horizontal + densité `basic`/`extended` (exception) |
| **Budgets** | `/budgets`, `/budgets/exercises` | ✅ | ✅ |
| **Fournisseurs** | `/suppliers`, `/suppliers/contacts` | ✅ | ✅ |
| **Procurement** | PO / factures listes | ✅ | ✅ |

**Critère de sortie** : QA 320px sur les 5 modules ; pas de scroll horizontal page ; libellés métier dans filtres.

---

### Lot 2 — Admin client & Équipes

| Module | Routes | FilterBar / DataTable | Note |
| ------ | ------ | --------------------- | ---- |
| RBAC client | `/client/members`, `/client/roles` | ✅ DataTable | — |
| Organisation | `/client/administration/organization` | — | Arbre unités : `Table` hiérarchique (exception) |
| Équipes | `/teams/collaborators`, `/teams/skills`, structure | ✅ | `skill-filters-bar`, `collaborator-filters-bar`, tables skills/categories/work-teams |
| Licences cockpit | `/client/administration/licenses-cockpit` | ✅ FilterBar | — |
| Access groups | `/client/access-groups` | ✅ DataTable | `access-model-issues-table` |

---

### Lot 3 — Admin plateforme & modules avancés

| Module | Routes | Note |
| ------ | ------ | ---- |
| Admin users/clients | `/admin/*` | ✅ FilterBar + DataTable (`mobilePriority`) |
| Strategic vision | `/strategic-vision` | ✅ filtre direction cockpit + `FilterBar` objectifs ; directions → DataTable |
| Governance cycles | `/cycles` | ✅ FilterBar + DataTable |
| Budget explorer / forecast | `/budgets/[id]`, reporting | Scroll horizontal **conservé** ; `budget-explorer-toolbar` → FilterBar partiel |
| Gantt / comité | `/projects/portfolio-gantt`, committee | Wide layout + scroll **conservé** (exception) |

---

### Lot 4 — Nettoyage Design System

| Action | Périmètre | État |
| ------ | --------- | ---- |
| Hex → tokens | badges projet, cockpit budget, login, review editor | ✅ UI principale |
| Palettes SVG / configurables | charts budget, `planner-task-label-colors`, tags, branding | Documenté (hors scope tokens) |
| Tables `<table>` brutes | 8 fichiers ciblés | ✅ migrés vers `Table`/`DataTable` sauf exceptions |
| Exceptions documentées | feuille de temps, matrice EBIOS, export print action-plans, org tree | Scroll / sémantique métier conservés |

**Critère de sortie** : grep `#([0-9a-f]{3,6})` dans `apps/web/src` → résidus limités aux palettes SVG inline documentées et couleurs utilisateur/config.

---

## 4.5 Matrice de conformité par lot

| Critère by-design | Lot 0 | Lot 1 | Lot 2–3 | Lot 4 |
| ----------------- | ----- | ----- | ------- | ----- |
| 320px sans scroll page | Partiel | ✅ modules P0 | ✅ | ✅ |
| Cibles ≥ 44px | ✅ | ✅ | ✅ | ✅ |
| Modales exploitables | ✅ | ✅ | ✅ | ✅ |
| Tables listes en cartes | — | ✅ | ✅ | ✅ |
| Tokens sans hex | — | — | — | ✅ |
| `prefers-reduced-motion` | ✅ | ✅ | ✅ | ✅ |

---

# 5. Modifications Prisma si nécessaire

Aucune.

---

# 6. Tests

## 6.1 Tests `FilterBar`

| Cas | Assertion |
| --- | --------- |
| Rendu 1 champ | `grid-cols-1`, input `w-full` |
| 4 champs desktop | `lg:grid-cols-3` ou auto-fit |
| Label associé | `label[for]` présent |

## 6.2 Tests d'intégration par module (Lot 1)

Pour chaque module P0 :

- [ ] Filtres empilés sur 320px, pleine largeur.
- [ ] Select fournisseur / statut : libellé métier visible, pas UUID.
- [ ] Application filtre + URL (si sync URL) inchangée fonctionnellement.
- [ ] Cartes liste + filtres : pas de régression pagination.

## 6.3 Régression visuelle

- Screenshot ou manuel : contrats / projets / budgets @ 320, 768, 1280.

---

# 7. Récapitulatif final

Chantier **mobile-first / by-design** livré en trois RFC :

1. **RFC-FE-MOB-001** — fondations transverses (modales, boutons, motion).
2. **RFC-FE-MOB-002** — `DataTable` responsive (cartes `< md`).
3. **RFC-FE-MOB-003** — `FilterBar` + migration lots 1–4.

**Tests automatisés** : `filter-bar.spec.tsx`, `data-table.spec.tsx` (17 tests). QA manuelle 320px recommandée §6.2 de chaque RFC avant release.

**Hors scope / exceptions** : grilles denses (Gantt, comité, budget explorer, feuille de temps), arbre organisation, matrice EBIOS, export HTML action-plans ; palettes couleur utilisateur (tags, planner, branding).

---

# 8. Points de vigilance

- Ne pas migrer budget explorer vers cartes sans validation produit CODIR.
- `FilterBar` ne doit pas casser la sync URL des filtres existants — migration mécanique (wrapper autour des mêmes controls).
- Éviter deux patterns de filtres en parallèle durablement : marquer les anciennes toolbars `@deprecated` en commentaire lors de la migration.
- Tests E2E existants (si Playwright) : ajouter viewport mobile sur au moins un parcours Lot 1.

---

# 9. Conformité by design

## RGPD

- Filtres sur données métier déjà autorisées par RBAC ; pas d'exposition inter-client.
- Champs recherche : pas de log de requête utilisateur en clair côté frontend.

## RGAA

- `FilterBarField` : label visible + association programmatique.
- Bouton « Filtres » replié (Lot 2) : `aria-expanded`, focus visible.
- Sheet filtres mobile : piège focus, `Escape` ferme.

## Design System

- `FilterBar` : tokens `border-border`, `bg-muted/15`, espacements échelle Tailwind — **aucun px arbitraire**.
- Réutiliser `Input`, `Select`, `Button` existants.

## Sécurité

- Aucun changement authz ; filtres restent des paramètres UI vers API déjà scopées client.

## Interface mobile

- Grille `grid-cols-1` par défaut — mobile-first explicite.
- Cibles tactiles sur boutons filtre/appliquer ≥ 44px.
- Filtres date/select pleine largeur — pas de `min-w` fixe sur mobile.

---

# Annexe A — Inventaire fichiers `min-w-[…px]` prioritaires (migration FilterBar)

| Fichier | Champs concernés | État |
| ------- | ---------------- | ---- |
| `contracts-list-page.tsx` | Select statut, fournisseur, date | ✅ |
| `budgets-toolbar.tsx` | Select exercice, statut | ✅ |
| `budget-exercises-toolbar.tsx` | Statut | ✅ |
| `budget-explorer-toolbar.tsx` | Multiples | ✅ partiel (table explorer inchangée) |
| `admin/users/page.tsx` | Filtres rôle/client | ✅ |
| `admin/clients/page.tsx` | Recherche | ✅ |
| `purchase-orders-list-page.tsx` | Statut, fournisseur | ✅ |
| `invoices-list-page.tsx` | Statut, dates | ✅ |
| `governance-cycles-page.tsx` | Cycle, statut, période | ✅ |

---

# Annexe B — Critères Definition of Done (rappel workspace)

Chaque PR de lot doit valider :

- [ ] RGPD : pas de DCP en clair dans logs frontend
- [ ] RGAA : clavier, labels, `aria-live` sur dynamique si applicable
- [ ] Design System : composants/tokens, états loading/empty/error
- [ ] Sécurité : pas de contournement permission côté UI
- [ ] Mobile : testé 320px, cibles ≥ 44px, listes exploitables
