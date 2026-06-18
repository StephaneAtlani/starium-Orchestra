# FRONTEND_UI-UX — Guide UI/UX & extraits de code

Ce document **complète** [FRONTEND_ARCHITECTURE.md](./FRONTEND_ARCHITECTURE.md) (routing, multi-client, données). Ici : **patterns visuels**, **composants obligatoires** et **extraits de code** alignés sur l’implémentation actuelle dans `apps/web`.

**Standards by design** : toute UI doit respecter dès la conception les 5 axes **RGPD**, **RGAA**, **Design System**, **Sécurité** et **interface mobile** (détail : `.cursor/rules/by-design-standards.mdc`, synthèse **§1.1** ci-dessous).

---

## 1. Stack UI


| Couche       | Choix                                            |
| ------------ | ------------------------------------------------ |
| Framework    | Next.js App Router                               |
| Styles       | Tailwind CSS v4 (`globals.css`, `@theme inline`) |
| Composants   | shadcn / base-nova (`@base-ui/react`)            |
| Icônes       | `lucide-react`                                   |
| État serveur | TanStack Query                                   |


Fichiers clés : `apps/web/src/app/globals.css`, `apps/web/src/styles/tokens.css`.

---

## 1.1 Standards by design (obligatoires)

Ces exigences s’appliquent à **chaque écran, composant et RFC frontend**. Référence complète : `.cursor/rules/by-design-standards.mdc` et [RFC-014-1](./RFC/RFC-014-1%20%E2%80%94%20UX-UI%20et%20Design%20System%20de%20l%E2%80%99application.md).

| Axe | Exigences UI concrètes |
| --- | --- |
| **RGPD** | Ne pas afficher de DCP superflues ; masquer/pseudonymiser dans les logs client ; exports et effacements prévus côté API ; pas de tracking sans consentement. |
| **RGAA** | HTML sémantique ; navigation clavier complète ; `<label>` sur chaque champ ; erreurs via `aria-invalid` + `aria-describedby` ; contrastes AA ; `aria-live` sur toasts/chargements ; `prefers-reduced-motion`. |
| **Design System** | Tokens + classes `.starium-*` (§2.1) ; composants `components/ui/*` et inventaire [INVENTAIRE-COMPOSANTS.md](./INVENTAIRE-COMPOSANTS.md) ; états loading/empty/error systématiques ; **valeur métier affichée, jamais l’ID** (select, table, badge). |
| **Sécurité** | L’UI ne remplace jamais l’authz backend (masquer/désactiver seulement) ; pas de secrets en dur ; `clientId` dans les query keys ; pas de données d’un autre client. |
| **Mobile** | Mobile-first (`sm` → `xl`) ; test ≥ 320px ; cibles tactiles ≥ 44×44 px ; tableaux avec stratégie mobile (cartes, colonnes prioritaires, scroll contrôlé) ; modales/drawers plein écran ou bottom sheet. |

**Checklist DoD UI** (en plus des règles §2) :

- [ ] Responsive validé 320px / mobile / desktop
- [ ] Clavier + focus visible sur actions et formulaires
- [ ] Libellés métier partout (pas d’UUID visible)
- [ ] Tokens DS uniquement (pas de couleur/espacement en dur)
- [ ] États loading / empty / error explicites et annoncés si dynamiques

### États UI — composants obligatoires (`components/feedback/`)

| État | Composant | Fichier |
| ---- | --------- | ------- |
| Chargement | `LoadingState` ou `Skeleton` | `feedback/loading-state.tsx`, `ui/skeleton.tsx` |
| Vide | `EmptyState` | `feedback/empty-state.tsx` |
| Erreur | `ErrorState` ou `Alert` | `feedback/error-state.tsx`, `ui/alert.tsx` |

Pas de markup ad hoc (`<p>Chargement…</p>`, divs vides custom) dans les features quand un composant feedback existe. Boutons icônes : `Button` (`size="icon*"`) ou `IconButton` (`components/ui/icon-button.tsx`). Titres de page : `PageHeader` uniquement (`text-2xl`, §12).

---

## 2. Règles express

- Couleurs : **tokens** (`bg-background`, `text-muted-foreground`, `border-border`, `bg-card`, etc.) — pas d’hex arbitraires dans les pages.
- **Bordures / cadres** : ne jamais se contenter de la classe `**border`** seule — sans couleur explicite, Tailwind applique souvent une couleur de bordure **trop contrastée** (effet « noir » sur fond clair). Toujours combiner avec un token : `**border-border`**, `**border-border/60**`, `**border-border/70**`, `**border-input**` (champs), ou `**border-dashed border-border/80**` (zones vides). Les `**Card**` utilisent déjà `.starium-card` (`var(--starium-border)`). Pour un **sous-bloc** dans une carte (formulaire, encart), préférer par ex. `rounded-lg border border-border/70 bg-muted/30 p-4` — filet **gris** cohérent avec le reste de l’UI, pas un trait noir.
- **Cadres imbriqués** : **ne pas** envelopper une grille de KPI dans une `Card` / `.starium-section` — pattern DS dashboard : **`.starium-module`** (titre + actions, fond app visible) + **`.starium-kpi-card`** par indicateur ; pattern DS **portefeuille Projets** : **`.starium-kpi-strip`** (une carte, groupes en colonnes — **§6.1**). Réserver **`.starium-section`** / **`.starium-panel`** à un **seul** bloc (tableau, citation, formulaire). Détail : **§2.1**.
- **Cartes « synthèse »** (fiche projet, arbitrage) : sous-blocs avec accent latéral possible — voir fiche projet **§11.2**. Les **score cards KPI** (dashboard, budgets) utilisent **§2.1** / **§6** ; le **bandeau KPI portefeuille Projets** utilise **§6.1** (strip), pas le bandeau coloré latéral fiche projet.
- Structure : **pas de HTML “layout” bricolé** ; utiliser `components/ui/*`, `components/layout/*`, `components/feedback/*`, `components/shell/*`.
- Chaque écran de données : états **loading**, **error**, **empty**, **success** explicites.
- **Query keys** métier : toujours inclure `clientId` (voir architecture).
- **Texte de vigilance (ambre / jaune)** : pour signaler une donnée manquante ou une alerte non bloquante dans un bloc carte, privilégier un **contraste lisible** — par ex. `**font-semibold text-yellow-950 dark:text-amber-400`** (jaune très foncé en clair, ambre plus saturé en dark) ; variante `**font-medium text-amber-950 dark:text-amber-100**`. Éviter les combinaisons trop pâles seules (`text-amber-300`, `text-amber-800` isolés) sur fond `bg-muted/30` ou `bg-card`.

---

## 2.1 Primitives structurelles CSS (Design System v1)

**Sources** : `apps/web/src/styles/tokens.css` (échelle `--ds-*`, couleurs marque) ; `apps/web/src/app/globals.css` (`@layer components` — classes `.starium-*`). Référence produit : [docs/design-system/README.md](./design-system/README.md).

| Classe | Usage | Cadre ? |
|--------|--------|---------|
| `.starium-module` | Groupe de page : titre + description + contenu (ex. bloc KPI dashboard, widgets Budget/Projets) | **Non** — fond app `#FAF9F7` |
| `.starium-kpi-card` | **Une** score card KPI (icône or + libellé + valeur) — dashboard, budgets | **Oui** — `shadow-1`, `radius-lg` |
| `.starium-kpi-card--interactive` | Variante cliquable (lien) | idem + hover `shadow-2` |
| `.starium-kpi-strip` | **Bandeau KPI** : une carte, grille 3 colonnes (groupes Volume / Risques / Complétude) — portefeuille `/projects` | **Oui** — un seul cadre |
| `.starium-kpi-strip-*` | Sous-éléments du strip (`-grid`, `-group`, `-group-label`, `-items`, `-item-label`, `-item-value`, modificateurs `--ok` / `--warn` / `--danger` / `--muted`) | — |
| `.starium-section` | Bloc cartonné **unique** (vision, encart) | **Oui** |
| `.starium-panel` | Panneau données (liste + toolbar) — élévation `shadow-2` sur une `Card` | **Oui** (un niveau) |
| `.starium-section-title` | Titre de section / `CardTitle` | — |
| `.starium-filter-bar` | Barre « Filtrer et trier » (titre + actions) dans un panneau liste | — |
| `.starium-filter-chip` | Bouton filtre outline ; `--active` = fond or ; `--muted` = Réinitialiser | — |
| `.starium-tab-group` / `.starium-tab-btn` | Segmented control Tableau / Kanban (actif = or) | — |
| `.starium-projects-table` | Densité et en-têtes overline du tableau portefeuille Projets | — |
| `.starium-table-footer` | Pied pagination panneau liste (mockup Projets) | — |
| `.starium-overline` | Libellé uppercase 11px (groupes compacts) | — |

**Règle anti « cadre dans cadre »** : grille de N KPI dashboard → `starium-module` + N × `starium-kpi-card`. **Interdit** : `starium-section` > grille de `starium-kpi-card`. Portefeuille Projets : **un** `.starium-kpi-strip` (pas de `starium-module` autour).

**Composants** : `KpiCard` (`components/ui/kpi-card.tsx`) et `BudgetKpiCard` consomment `.starium-kpi-card`. `ProjectsPortfolioKpi` consomme `.starium-kpi-strip` (feature, pas encore de composant UI générique). `Card` / `.starium-card` restent pour tableaux, modales, contenus non-KPI.

**Modifier la charte globalement** : ajuster les tokens `--ds-card-*`, `--ds-kpi-*` dans `tokens.css` ou les règles `.starium-*` dans `globals.css` — pas les chaînes Tailwind répétées dans chaque feature.

---

## 3. App Shell — largeur de contenu

Le shell aligne le header et le contenu sur la **même grille** (classe `starium-workspace-inner`).

```tsx
// apps/web/src/components/shell/app-shell.tsx (extrait)
const CONTENT_WRAPPER_GUTTER = `w-full min-w-0 px-4 sm:px-5 starium-workspace-inner`;

<WorkspaceHeader contentClassName={CONTENT_WRAPPER_GUTTER} />
<main className="starium-main min-h-0 flex-1 overflow-auto">
  <div className={`${CONTENT_WRAPPER_GUTTER} py-6 sm:py-8`}>{children}</div>
</main>
```

- Pleine largeur utile à droite de la sidebar (pas de `max-w-7xl` centré).
- Gutter horizontal léger (`px-4` / `sm:px-5`) pour ne pas coller aux bords.
- Plein écran : règles `#starium-app-workspace:fullscreen` dans `globals.css`.

**PageContainer** n’ajoute que l’espacement vertical entre blocs ; le padding horizontal vient du shell.

```tsx
// apps/web/src/components/layout/page-container.tsx
export function PageContainer({ children, className }: PageContainerProps) {
  return <div className={className ?? 'space-y-6'}>{children}</div>;
}
```

### 3.1 Sidebar — menus à panneau (Budgets, Projets)

- Implémentation : `apps/web/src/components/shell/sidebar.tsx` + `sidebar-dropdown.tsx` (`SidebarDropdown`, `SidebarDropdownLayer` — panneau fixe au survol du libellé parent).
- **Budgets** et **Projets** : pas de `href` sur l’entrée parente dans `config/navigation.ts` ; les cibles sont des sous-liens. Le parent reste filtré par `moduleCode` + `requiredPermissions` comme les autres entrées module.
- **Projets** : sous-entrées **Portefeuille projet** → `/projects`, **Option** → `/projects/options` (placeholder module). Les **options par projet** (RFC-PROJ-OPT-001) sont sur `**/projects/[projectId]/options`**, accessibles depuis l’onglet **Options** du bandeau de navigation projet (`ProjectWorkspaceTabs`). Logique d’état actif par route (`pathname`) dans `sidebar.tsx` (même idée que pour Budgets : enfant actif si la route courante correspond au sous-lien ou à un préfixe métier).
- **Éviter** de dupliquer un panneau scroll : le contenu principal reste dans `<main>` ; le panneau latéral du dropdown est uniquement pour la navigation.

### 3.2 WorkspaceHeader — barre supérieure

- Fichier : `apps/web/src/components/shell/workspace-header.tsx`.
- **Contenu** : fil d’Ariane (Home → client actif avec indication e-mail identité par défaut si chargé → libellé de zone, ex. Dashboard), badge plateforme admin si applicable, **ClientSwitcher** (jeton d’accès), icônes d’action (recherche, document, calendrier, notifications — placeholders), menu utilisateur.
- **Menu compte** (`<details>` sur le résumé avatar) : liens **Compte** (`/account`) et **Déconnexion**. Fermeture au **clic extérieur** (`pointerdown` sur le document), à la touche **Escape**, et après navigation / déconnexion.
- **Avatar** : si le profil expose `hasAvatar` (voir `GET /me`), chargement de l’image via `**GET /api/me/avatar`** avec `Authorization: Bearer …`, affichage en blob URL (`object-cover` dans le cercle) ; sinon initiales (dont `PA` pour un admin plateforme). Après changement de photo sur la page Compte, `refreshProfile()` recharge le profil et l’avatar dans le header.

---

## 4. En-tête de page

Titres en **tokens** sémantiques (pas de `#1B1B1B`).

```tsx
// apps/web/src/components/layout/page-header.tsx
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
        {description && (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 mt-2 sm:mt-0">{actions}</div>}
    </div>
  );
}
```

---

## 5. Bouton & navigation (Next.js)

`Button` repose sur **Base UI** : la prop `**asChild` (habitude Radix/shadcn) ne doit pas être passée au DOM**. Elle est **consommée** dans le wrapper et ignorée pour le rendu.

Pour un **lien** avec l’apparence d’un bouton, utiliser `**Link` + `buttonVariants`** :

```tsx
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

<Link
  href="/projects/new"
  className={cn(buttonVariants({ variant: 'default', size: 'sm' }))}
>
  Nouveau projet
</Link>
```

Implémentation `Button` (extrait) :

```tsx
// apps/web/src/components/ui/button.tsx
type ButtonProps = ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

function Button({
  className,
  variant = "default",
  size = "default",
  asChild: _asChild,
  ...props
}: ButtonProps) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
```

### 5.1 Select — `SelectValue` et libellés (Base UI)

Le `**Select**` repose sur **`@base-ui/react/select`**. Si la valeur sélectionnée est une **clé technique** (ex. option « tout » avec la valeur `__all` / `__all__`), un **`<SelectValue placeholder="…" />` sans enfants** peut afficher cette **valeur brute** dans le trigger au lieu du texte de l’item.

**Règle** : pour les filtres avec sentinelle « tout », passer le **libellé affiché** en **enfants** de `SelectValue` (comme sur la liste projets : `kindKey === '__all__' ? 'Toutes' : PROJECT_KIND_LABEL[kindKey]`, ou libellés dérivés du registry / des options).

```tsx
<SelectTrigger size="sm" className="h-7 w-full text-xs">
  <SelectValue placeholder="Tous">{statusFilterLabel}</SelectValue>
</SelectTrigger>
```

Référence code : `features/projects/components/projects-list-table.tsx`, `features/projects/components/action-plan-tasks-table.tsx`.

---

## 6. KPI — score cards (`KpiCard` / `.starium-kpi-card`)

- **`variant="default"`** : score card standard (icône or 38px, valeur display).
- **`variant="dense"`** : même shell, padding réduit (`!p-3`), valeur `--dense`.

Le composant `KpiCard` (`components/ui/kpi-card.tsx`) rend une **`.starium-kpi-card`** (pas de `Card` shadcn imbriquée). `BudgetKpiCard` utilise le même shell pour les montants budgétaires.

```tsx
// Structure type (classes DS)
<div className="starium-kpi-card">
  <div className="flex items-center gap-[18px]">
    <Icon className="starium-kpi-icon" strokeWidth={1.5} />
    <div>
      <span className="starium-kpi-label">{title}</span>
      <div className="starium-kpi-value">{value}</div>
    </div>
  </div>
</div>
```

Exemple :

```tsx
import { KpiCard } from '@/components/ui/kpi-card';
import { FolderKanban } from 'lucide-react';

<KpiCard
  variant="dense"
  title="Projets"
  value="12"
  icon={<FolderKanban aria-hidden />}
/>
```

**Grille cockpit** : envelopper dans **`.starium-module`** (titre + actions, **sans** cadre parent) — voir **§2.1**. Widgets dashboard (`dashboard-*-kpi-widget.tsx`) et vision stratégique (`strategic-kpi-cards.tsx`) suivent ce pattern.

### 6.1 KPI portefeuille Projets (`/projects`)

Fichier : `features/projects/components/projects-portfolio-kpi.tsx`. Référence visuelle : mockup **Projets-Starium** (bandeau KPI unique).

- **Une carte** (`.starium-kpi-strip`) — **pas** de grille de score cards ni d’icônes.
- **Trois groupes** en colonnes (`.starium-kpi-strip-grid` → `.starium-kpi-strip-group`) :
  - **Volume** — Total, En cours, Terminés ;
  - **Risques & Échéances** — En retard, Critiques, Bloqués ;
  - **Complétude** — Sans étude risque, Sans resp., Sans jalons.
- Chaque groupe : overline (`.starium-kpi-strip-group-label`), puis ligne d’indicateurs (`.starium-kpi-strip-items`) — libellé 11.5px + valeur **28px** bold (`.starium-kpi-strip-item-value`).
- Tons sémantiques sur les chiffres : modificateurs `--ok`, `--warn`, `--danger`, `--muted` (tokens `--state-success`, `--state-warning`, `destructive`, `muted-foreground`).
- Données : `GET /api/projects/portfolio-summary` (`usePortfolioSummaryQuery`). Même composant réutilisé sur la **présentation CODIR** (`codir-committee-presentation.tsx`).
- **Évolution prévue** : extraire un composant UI générique `StariumKpiStrip` si d’autres modules adoptent ce layout ; aujourd’hui le markup vit dans la feature + classes `globals.css`.

---

## 7. Filtres — cockpit portefeuille Projets (référence)

L’écran **`/projects`** regroupe **filtres, tableau et pagination dans une seule** `Card size="sm"` avec **`starium-panel`** (`overflow-hidden`, élévation DS `shadow-2`) : le bandeau d’actions ne répète pas une deuxième carte pour les critères — les **filtres par colonne** vivent **dans le tableau**, sous les libellés d’en-tête.

### 7.1 Barre « Filtrer et trier » (`ProjectsToolbar`)

- Fichier : `apps/web/src/features/projects/components/projects-toolbar.tsx`.
- Rendu avec **`embedded`** : barre seule (pas de `Card` racine) — le parent est la `Card` de la page.
- Conteneur : **`.starium-filter-bar`** — titre **« Filtrer et trier »** (`.starium-filter-bar-title`) à gauche ; actions à droite (`.starium-filter-bar-actions`).
- **Actions** :
  - **Tableau / Kanban** — `.starium-tab-group` + `.starium-tab-btn` (actif : fond or, `.starium-tab-btn--active`).
  - **En retard**, **Mes projets** — `.starium-filter-chip` toggle ; état actif : `.starium-filter-chip--active` (or).
  - **Plein écran** — bascule `requestFullscreen` sur `#starium-app-workspace` (`STARIUM_APP_WORKSPACE_DOM_ID`) puis `exitFullscreen` (icônes `Maximize2` / `Minimize`).
  - **Réinitialiser** — `.starium-filter-chip--muted`, `onReset` (`use-projects-list-filters`).
- **Pas** de `CardHeader` / `Button` shadcn sur cette barre — boutons natifs + classes DS (cohérent mockup Projets).
- Conteneur sémantique : `role="search"` + `aria-label="Filtrer et trier la liste des projets"`.

### 7.1.1 Portals en plein écran (Select / Tooltip / Dialog)

Quand `/projects` est en plein écran, les popups Base UI (`Select`, `Tooltip`, `Dialog`) ne doivent pas être montés dans `document.body`, sinon ils sortent du sous-arbre plein écran et deviennent invisibles/non interactifs.

- Hook commun : `apps/web/src/hooks/use-fullscreen-portal-container.ts` → renvoie `document.fullscreenElement` (ou `undefined` hors plein écran).
- `Select` : `apps/web/src/components/ui/select.tsx` (`SelectPrimitive.Portal container={fullscreenContainer}`).
- `Tooltip` : `apps/web/src/components/ui/tooltip.tsx` (`TooltipPrimitive.Portal container={fullscreenContainer}`).
- `Dialog` : `apps/web/src/components/ui/dialog.tsx` (`DialogPortal` utilise `container ?? fullscreenContainer` pour garder un override explicite possible).

Effet attendu : les filtres inline du tableau Projets (ligne 2 des en-têtes) restent utilisables en mode plein écran.

### 7.2 Tableau : double ligne d’en-tête + filtres inline (`ProjectsListTable`)

- Fichier : `apps/web/src/features/projects/components/projects-list-table.tsx`.
- **`TooltipProvider delay={250}`** autour du `Table` pour les infobulles d’en-tête et de cellules.
- Classe racine : **`starium-projects-table`** (`Table noWrapper`, `min-w-[64rem]`, typo ~12.5px).
- **Première ligne** (`TableHeader` → `TableRow`) : en-têtes via `TableHead` (overline DS 9.5px, fond `bg-muted` sticky).
  - **`HeaderTip`** : libellé souligné en pointillés + `cursor-help`, tooltip explicatif (pas de répétition du contenu en dessous).
  - **`SortHeaderButton`** : tri sur colonnes concernées (`sortBy` / `sortOrder` dans les filtres) ; icônes `ArrowUp` / `ArrowDown` / `ArrowUpDown`.
  - Colonnes typiques : **Catégorie**, **Projet** (tri nom), **Nature**, **Santé** (tri), **Statut** (tri), **Mon rôle**, **Avancement** (sous-titre « manuel / dérivé » + tri), **Échéance** (tri), **T · R · J**, **Signaux**, **Étiquettes**.
- **Deuxième ligne** (`TableRow` avec `border-t border-border bg-neutral-50`) : **contrôles de filtre** alignés sur les colonnes — `Select` / `Input` en `size="sm"`, classe **`.starium-col-filter`**, `h-7`.
  - **Catégorie** — `Select` groupé par racine (`SelectGroup` / `SelectLabel`), option « Toutes catégories » ; données `listProjectPortfolioCategories`.
  - **Projet** — `Input` recherche texte (`search`), placeholder « Rechercher… ».
  - **Nature** — `kind` : Projet / Activité (`PROJECT_KIND_LABEL`).
  - **Santé** — `computedHealth` : Bon / Attention / Critique.
  - **Statut** — `status` (`PROJECT_STATUS_LABEL`).
  - **Mon rôle** — options dérivées des rôles présents dans les lignes affichées.
  - Colonnes sans filtre sur cette ligne : **em dash** (`—`) centré en `text-muted-foreground` pour garder l’alignement visuel.
- **Lignes de données** :
  - **Catégorie** — deux lignes (groupe parent / sous-catégorie) : `.starium-cell-category-group` / `.starium-cell-category-sub`.
  - **Projet** — lien `.starium-proj-name` (or), code `.starium-proj-code`, priorité `.starium-proj-priority`.
  - **Avancement** — barres `.starium-progress-track` / `.starium-progress-fill` (manuel + dérivé) ; helper local `ProjectProgressRow`.
  - **Échéance** — date en rouge si `signals.isLate`.
  - **T · R · J** — séparateurs `·` ; risques en rouge si &gt; 0.
  - **Signaux** — `ProjectPortfolioBadges` avec prop **`stacked`** (colonne alignée à droite).
- **Colonnes sticky** (catégorie + projet) : `sticky left-0` / `left-[11rem]`, `z-20` / `z-52`, `starium-table-sticky-edge` pour le défilement horizontal.
- **Largeur minimale** : `min-w-[64rem]` sur le `Table`.

### 7.3 Page — assemblage

```text
PageContainer
  PageHeader  (description : « Portefeuille · pilotage et signaux client »)
  ProjectsPortfolioKpi   (.starium-kpi-strip)
  LoadingState / Alert erreur
  Card starium-panel (liste, max-h + overflow-hidden)
    ProjectsToolbar embedded   (.starium-filter-bar)
    CardContent (scroll + useTablePan) → ProjectsListTable   (si données)
    CardFooter starium-table-footer → PaginationSummary + chips Précédent / Suivant
    ou CardContent → EmptyState / LoadingState
```

Le **`CardContent`** qui porte la liste est le **conteneur de scroll** (`min-h-0 flex-1 overflow-auto`, `ref` + `useTablePan` pour le grab/pan — voir **§8**). Le tableau utilise **`Table noWrapper`** pour que l’en-tête sticky reste cohérent (pas de second `overflow-x-auto` uniquement horizontal entre le scroll et `<thead>`).

Autres écrans (ex. **plan d’action détail**, §11) peuvent utiliser une **variante** : `Card` filtres **séparée** avec sections Recherche / Filtrer par et filets `h-px bg-border/70` — même esprit de tokens (`border-border/60`, `Card size="sm"`), mais **sans** ligne de filtres dans le tableau lorsque la grille de colonnes est plus simple.

---

## 8. Liste dans une `Card` + table

- En-tête : `CardHeader` + `CardTitle` / `CardDescription`.
- **Composant `Table`** (`apps/web/src/components/ui/table.tsx`) : par défaut (sans `noWrapper`), la `<table>` est dans un `div` `data-slot="table-container"` avec `overflow-x-auto`, **`cursor-grab`** / **`cursor-grabbing`** pendant le déplacement, et le hook **`useTablePan`** (`apps/web/src/hooks/use-table-pan.ts`) — **clic gauche maintenu + glisser** pour faire défiler (horizontal ; vertical aussi si le conteneur a les deux axes). Les **liens, boutons, champs, selects, labels** ne déclenchent pas le pan (même esprit que le Gantt portefeuille : `docs/modules/portfolio-gantt-ui.md` §5). **`TableContainer`** est exporté si un écran doit réutiliser ce wrapper seul.
- **En-tête sticky** (`thead` avec `sticky top-0`, colonnes `sticky left-*`) : le **scroll** doit être sur le **parent direct** attendu par le navigateur pour `sticky`. Si la carte a une **hauteur max** et un scroll **vertical** sur `CardContent`, utiliser **`Table noWrapper`** pour éviter un wrapper `overflow-x-auto` **intermédiaire** qui casse le sticky sur `<thead>` — le scroll horizontal + vertical est alors sur le `CardContent` (souvent couplé à `useTablePan` sur ce même nœud). Exemple : page **`/projects`** (`app/(protected)/projects/page.tsx`) + `ProjectsListTable` (`Table noWrapper`).
- Si le tableau n’a **pas** besoin d’en-tête sticky dans un conteneur à hauteur bornée : pattern simple `CardContent` en `p-0` + composant qui utilise `Table` **sans** `noWrapper` — le grab/pan du wrapper `table-container` s’applique déjà.
- Pied : `CardFooter` (pagination, actions).

```tsx
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useTablePan } from '@/hooks/use-table-pan';
import { cn } from '@/lib/utils';

const tablePan = useTablePan();

<Card size="sm" className="starium-panel max-h-[min(75vh,800px)] overflow-hidden">
  <CardHeader className="starium-toolbar-header pb-3">
    <CardTitle>Liste des projets</CardTitle>
    <CardDescription className="text-xs">Cliquez sur un nom pour ouvrir la fiche détail.</CardDescription>
  </CardHeader>
  <CardContent
    ref={tablePan.scrollRef}
    onMouseDown={tablePan.onMouseDown}
    className={cn(
      'min-h-0 flex-1 overflow-auto p-0 group-data-[size=sm]/card:px-0 group-data-[size=sm]/card:pt-0',
      tablePan.isPanning ? 'cursor-grabbing select-none' : 'cursor-grab',
    )}
  >
    <ProjectsListTable items={items} />
  </CardContent>
  <CardFooter>{/* pagination */}</CardFooter>
</Card>
```

Tables : composants `Table`, `TableHeader`, `TableBody`, etc. depuis `@/components/ui/table`.

### 8.1 Liste projets — `ProjectsListTable`

Implémentation : `features/projects/components/projects-list-table.tsx`.

- **Colonnes** : Projet (nom, code mono, criticité, responsable), **Nature** (badge), **Santé** (`HealthBadge` avec prop `**compact`** : libellés courts Bon / Attention / Critique), **Statut**, **Avancement** (une colonne : manuel au-dessus, dérivé en dessous), **Échéance**, **T · R · J** (tâches ouvertes / risques ouverts / jalons en retard), **Signaux** (`ProjectPortfolioBadges` uniquement — pas de répétition textuelle des `warnings` sous les pastilles).
- **Largeur** : `min-w-[56rem]` sur la table pour scroll horizontal sur petits écrans.
- **Tooltips** : `TooltipProvider` (délai ~250 ms) ; en-têtes via `**HeaderTip`** (libellés avec soulignement pointillé + `cursor-help`) ; cellules **Nature**, **Avancement** et **T · R · J** via `**CellTip`** (Base UI : `TooltipTrigger` avec `render={<span … />}` comme ailleurs dans l’app).
- **Couleurs des chiffres** (KPI au-dessus de la liste, §6.1) : voir tonalités `text-primary`, `emerald`, `yellow`, `destructive` — documentées dans §6.1.

### 8.2 Fiche détail, fiche décisionnelle, éditeur de point — signaux et alertes

**Comportement actuel (code)** : sur le détail projet (`project-detail-view.tsx`), la fiche décisionnelle (`project-sheet-view.tsx`) et, pour partie, le dialogue d’édition de point (`project-review-editor-dialog.tsx`), le bandeau supérieur combine :

- `**HealthBadge`** sur `computedHealth` (synthèse globale) ;
- un bloc **« Signaux portefeuille »** via `**ProjectPortfolioBadges`** (`signals` uniquement) ;
- si `**warnings**` est non vide : un `**Alert**` « Alertes projet » avec les libellés métier (`WARNING_CODE_LABEL`).

Les données viennent toutes du **même** `GET /api/projects/:id` (ou équivalent liste) : `computedHealth`, `signals`, `warnings` — pas de second appel dédié.

**Règle produit (alignement avec §8.1)** : comme pour la liste, il faut **éviter la duplication** entre pastilles de signaux et bandeau d’alertes lorsque le même motif apparaît sous deux formes. `**HealthBadge`** reste la réponse courte à « quel est l’état global ? » ; les motifs détaillés doivent idéalement former **un seul bloc de lecture** (causes / vigilances), **sans** répéter inutilement le verdict déjà porté par la santé ni empiler `Alert` + chips pour les mêmes codes. Toute refonte d’affichage reste **côté front** sur les champs existants (pas de nouveau contrat API pour ce seul besoin).

### 8.3 Référence — règles de santé, signaux et alertes (backend)

**Source de vérité code** : `apps/api/src/modules/projects/projects-pilotage.service.ts` ; **pastilles** « Signaux portefeuille » : `apps/web/src/features/projects/components/project-badges.tsx` (`ProjectPortfolioBadges`, `HealthBadge`). Les **warnings** utilisent `apps/web/src/features/projects/constants/project-enum-labels.ts` (`WARNING_CODE_LABEL`).

**Statuts utiles**

- **Projet actif (pilotage)** : `PLANNED`, `IN_PROGRESS`, `ON_HOLD` (`ACTIVE_PROJECT_STATUSES`).
- **Non terminal** (retard / échéance encore pertinentes) : tout statut **sauf** `COMPLETED`, `CANCELLED`, `ARCHIVED` (`isNonTerminalForLate`).
- **Risque « criticité pilotage HIGH »** : niveau EBIOS `CRITICAL` ou `HIGH` agrégé en bucket HIGH (`riskCriticalityForRisk`).

---

#### `computedHealth` (santé — `HealthBadge`)

Ordre d’évaluation : **RED** dès qu’une condition RED est vraie ; sinon **ORANGE** si une condition ORANGE ; sinon **GREEN**.


| Niveau     | Condition (première qui s’applique dans le service)                                                                                                                |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **RED**    | Statut projet `ON_HOLD`                                                                                                                                            |
| **RED**    | `targetEndDate` strictement **avant** le jour courant (UTC) **et** statut non terminal                                                                             |
| **RED**    | Au moins un risque `OPEN` avec criticité pilotage HIGH                                                                                                             |
| **RED**    | Au moins un jalon `DELAYED`                                                                                                                                        |
| **ORANGE** | (aucun RED) Échéance `targetEndDate` dans les **14 prochains jours** (inclus) et statut non terminal                                                               |
| **ORANGE** | (aucun RED) Au moins un risque `OPEN` avec criticité pilotage MEDIUM                                                                                               |
| **ORANGE** | (aucun RED) Statut actif **et** aucun jalon enregistré                                                                                                             |
| **ORANGE** | (aucun RED) Écart **supérieur à 30** points entre `progressPercent` manuel et `derivedProgressPercent` (moyenne des tâches non annulées) lorsque les deux existent |
| **GREEN**  | Sinon                                                                                                                                                              |


---

#### `signals` (objet renvoyé par l’API — champs booléens)


| Champ              | Règle métier                                                                                                                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `isLate`           | `targetEndDate` dépassée (jour courant UTC) **et** statut non terminal.                                                                                                              |
| `isBlocked`        | `**ON_HOLD` uniquement**. Les risques `OPEN` à criticité HIGH/CRITICAL ne remontent plus ce signal (ils peuvent toutefois faire passer la **santé** en `RED` via `hasOpenHighRisk`). |
| `isCritical`       | `project.criticality === HIGH` **ou** `computedHealth === RED` (donc souvent redondant avec la pastille santé « critique » si la cause est déjà la santé).                           |
| `hasNoOwner`       | Pas de `ownerUserId` **et** pas de `ownerFreeLabel` renseigné (trim).                                                                                                                |
| `hasNoTasks`       | Statut **actif** **et** aucune tâche.                                                                                                                                                |
| `hasNoRisks`       | Statut **actif** **et** aucun risque.                                                                                                                                                |
| `hasNoMilestones`  | Statut **actif** **et** aucun jalon.                                                                                                                                                 |
| `hasPlanningDrift` | Au moins un jalon `DELAYED` **ou** `isLate` vrai.                                                                                                                                    |


---

#### `warnings` (codes — alerte ambre « Alertes projet »)

Construits à partir des signaux : ordre stable dans le service.


| Code             | Émis si            |
| ---------------- | ------------------ |
| `NO_OWNER`       | `hasNoOwner`       |
| `NO_TASKS`       | `hasNoTasks`       |
| `NO_RISKS`       | `hasNoRisks`       |
| `NO_MILESTONES`  | `hasNoMilestones`  |
| `PLANNING_DRIFT` | `hasPlanningDrift` |
| `BLOCKED`        | `isBlocked`        |


Libellés affichés : `WARNING_CODE_LABEL` (ex. `Dérive planning` pour `PLANNING_DRIFT`, `Bloqué` pour `BLOCKED`).

---

#### Affichage UI — pastilles « Signaux portefeuille » (`ProjectPortfolioBadges`)

Seuls **six** motifs sont exposés en chips ; le reste des signaux n’apparaît **que** via `**warnings`** / alerte (et la santé via `HealthBadge`).


| Pastille UI          | Champ `signals` | Style  |
| -------------------- | --------------- | ------ |
| En retard            | `isLate`        | danger |
| Bloqué               | `isBlocked`     | danger |
| Critique             | `isCritical`    | danger |
| Sans étude de risque | `hasNoRisks`    | warn   |
| Sans responsable     | `hasNoOwner`    | warn   |


**Non affichés en chip** (mais peuvent apparaître dans l’`Alert` warnings) : `hasNoTasks`, `hasNoMilestones`, `hasPlanningDrift` (codes `NO_TASKS`, `NO_MILESTONES`, `PLANNING_DRIFT`).

---

## 9. Alertes erreur / avertissement

Utiliser `**Alert`**, `**AlertTitle**`, `**AlertDescription**` (`components/ui/alert.tsx`) plutôt qu’un `div` + bordures ad hoc.

- **Erreur bloquante** (API, permissions) : `variant="destructive"` + icône `AlertCircle` (Lucide) en premier enfant.
- **Avertissement** (ex. permission métier manquante) : `Alert` en `default` avec `className` type `border-amber-500/35 bg-amber-500/5` + `AlertTriangle`, titres en `text-amber-950` / mode sombre explicite.

---

## 10. États vides & chargement

```tsx
import { EmptyState } from '@/components/feedback/empty-state';
import { LoadingState } from '@/components/feedback/loading-state';

<EmptyState
  title="Aucun projet"
  description="Aucun élément ne correspond à ce périmètre."
  action={<Link className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))} href="…">Action</Link>}
/>

<LoadingState rows={5} />
```

Liste vide : préférer une `**Card size="sm"**` autour de `EmptyState` (`CardContent` avec `py-10`) pour aligner la zone vide sur les autres surfaces (cockpit Projets).

---

## 11. Composition type — page cockpit Projets

Ordre recommandé dans `PageContainer` :

1. `PageHeader` (titre « Projets », description `Portefeuille · pilotage et signaux client`, actions : CODIR + Gantt en `outline`, **Nouveau projet** en primaire or)
2. **`ProjectsPortfolioKpi`** — bandeau **`.starium-kpi-strip`** (**§6.1**)
3. **Une** `Card` liste : **`ProjectsToolbar` embedded** + **`ProjectsListTable`** (filtres inline sous les en-têtes — **§7**) + pagination en `CardFooter` **`.starium-table-footer`** ; pas de seconde carte « filtres » au-dessus du tableau sur cet écran.
4. `LoadingState` / `**Alert` erreur API** (§9) / `**Card` + `EmptyState`**
5. Détail tableau et colonnes : **§8** / **§8.1**

Route : `app/(protected)/projects/page.tsx`.  
Feature : `features/projects/` (hooks, `project-query-keys`, API).

### 11.1 Création projet (`/projects/new`)

- Grille **lg** : en-tête de page (retour + titre) en deux colonnes ; formulaire en **deux colonnes** (`lg:grid-cols-2`) — Identité à gauche, Classification + Planning à droite (bordure verticale légère entre colonnes).
- Lien **Retour au portefeuille** en `buttonVariants({ variant: 'ghost', size: 'sm' })` au-dessus du `PageHeader`.
- `**ProjectCreateForm`** : une `**Card**` avec en-tête descriptif, `**CardContent**` en sections (titres + icônes Lucide : identité, classification, planning), **Nature** (projet / activité), **code** optionnel (génération auto si vide), **responsable** (`GET /api/projects/assignable-users`, pas `GET /api/users` client-admin), `**textarea`** pour la description, `**CardFooter**` avec fond `bg-muted/20` : rappel (nom obligatoire ; code auto) + **Annuler** + **Créer le projet** (`Button` désactivé si nom vide).
- Absence de permission `projects.create` : `**Alert`** (pas seulement un paragraphe).

### 11.2 Détail projet — fiche décisionnelle (`ProjectSheetView`)

Route typique : `app/(protected)/projects/[projectId]/page.tsx` — composant `**ProjectSheetView**` (`features/projects/components/project-sheet-view.tsx`). Données via `**GET/PATCH /api/projects/:id/project-sheet**` (TanStack Query, autosave debounced) — pas de calcul ROI / priorité côté client (affichage des valeurs API).

**Structure UX (blocs successifs dans des `Card size="sm"`)** : sections étiquetées **A–H** (équipes, résumé & indicateurs, valeur métier, financier, risques, SWOT, TOWS, rétroplanning) ; titres `**CardTitle`** + séparateurs `**border-t border-border**` entre zones denses dans une même carte.

**Indicateurs de lecture** (sous-bloc dans la carte « Résumé ») :

- En-tête de zone : `**h4`** + `**Badge variant="secondary"**` (ex. libellé « Décision ») + paragraphe `**text-xs text-muted-foreground**` (max ~2 lignes).
- Grille `**grid gap-3 sm:grid-cols-2 xl:grid-cols-4**` : quatre cartes avec **bandeau gauche** coloré par axe (ROI, priorité portefeuille, ROE / scores, COPIL), icônes Lucide, **séparateur** `border-t border-border/60` avant le pied d’encart si besoin.
- Barres mini optionnelles pour les scores (ROE) : même fichier, composant local `**ScoreMiniBar`**.

**Arbitrage** (trois niveaux métier / comité / CODIR) :

- Même langage visuel : `**pt-8`**, titre `**h4**` + badge **« 3 niveaux »**, grille `**sm:grid-cols-3`**.
- Carte par niveau : `**rounded-xl p-4 shadow-sm**`, accent `**border-l-[3px]**` + fond léger selon **statut** (validé / refus / soumis à validation / en cours / brouillon) ; **badge « Verrouillé »** si le niveau précédent n’est pas validé ; **icônes** distinctes par niveau ; **séparateurs** `border-t border-border/50` avant statut, motif de refus ou message de lecture seule.

**Référence** : RFC-PROJ-012, [docs/modules/projects-mvp.md](./modules/projects-mvp.md).

### 11.3 Modales — voile et panneau global (`Dialog`)

Implémentation : `**apps/web/src/components/ui/dialog.tsx`** (Base UI `Backdrop` + `Popup`). Ce socle s’applique à toutes les modales ; les écrans métier (**§12.1** et suivants) précisent largeurs et contenus.


| Élément      | Pattern                                                                                                                                                                                                |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Backdrop** | Voile : `fixed inset-0 z-[80]`, `bg-black/40`, `dark:bg-black/55`, léger flou `backdrop-blur-[2px]` ; `duration-200` ; animations fade `data-open` / `data-closed`. Attribut **`forceRender`** sur le `Backdrop` pour que le voile reste correctement empilé en **dialogues imbriqués** (Base UI). |
| **Panneau**  | `Popup` : `z-[81]`, `rounded-xl border border-border/60`, `bg-background/95`, `backdrop-blur-2xl`, `shadow-lg`, `ring-1 ring-black/[0.04]` (`dark:ring-white/[0.06]`) — panneau type « vitré » au-dessus du voile (§2). **Mobile (`< sm`)** : bottom-sheet pleine largeur (`inset-x-0 bottom-0`, `rounded-t-2xl`, `max-h-[min(92dvh,calc(100dvh_-_1rem))]`). **Desktop (`sm+`)** : centré (`sm:top-1/2`, `sm:w-[calc(100%_-_2rem)]`, `sm:max-h-[calc(100dvh_-_2rem)]`). Conteneur **`flex flex-col overflow-x-hidden overflow-y-hidden`** — le scroll est dans **`DialogBody`** uniquement. |
| **Tailles modal** | Prop **`size`** sur `DialogContent` (modal) : `sm` (défaut), `md`, `lg`, `xl`, `full` — mappe `sm:max-w-*` normalisé. Les **nouvelles** modales utilisent `size` ; `className` reste compatible (surcharge via `tailwind-merge`). |
| **Sous-composants** | `DialogHeader` (`shrink-0`), **`DialogBody`** (`flex-1 min-h-0 overflow-y-auto overscroll-contain` — zone scroll unique), `DialogFooter` (`shrink-0`). Modales legacy sans `DialogBody` : `className="overflow-y-auto"` sur `DialogContent` surcharge `overflow-y-hidden` du socle (`tailwind-merge`). |
| **Portal container** | En plein écran, le `Portal` cible `document.fullscreenElement` via `useFullscreenPortalContainer`; hors plein écran, comportement standard (`body`). `DialogPortal` conserve `container` prioritaire si fourni explicitement. |
| **Fermeture** | Clic sur le **voile** (bouton gauche, cible = le scrim) appelle `onOpenChange(false)` lorsque le `Dialog` racine reçoit **`onOpenChange`** ; un contexte interne relie le backdrop à cette fermeture. |
| **Titre**    | `DialogTitle` : `text-lg font-semibold tracking-tight text-foreground` (cohérent avec les modales métier §12.2).                                                                                       |
| **Pied**     | `DialogFooter` : `border-t border-border/60` sur le séparateur (§2).                                                                                                                                   |


#### 11.3.1 Modale formulaire dense — bandeau d’en-tête (norme)

À utiliser pour **les nouvelles modales** formulaire (longues ou sections multiples) et pour **rafraîchir graphiquement** les modales existantes lorsque c’est demandé. Référence d’implémentation : `**ProjectRiskEbiosDialog`** — `features/projects/components/project-risk-ebios-dialog.tsx`.


| Zone                         | Pattern                                                                                                                                                                                                          |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `**DialogContent**`          | Prop **`size`** (`sm` / `md` / `lg` / `xl` / `full`) + `p-4` (défaut). Conteneur **`flex flex-col overflow-x-hidden overflow-y-hidden`** + `max-h` socle. **Scroll dans `DialogBody`** — pas `overflow-y-auto` sur `DialogContent` pour les nouvelles modales. Legacy : `className="overflow-y-auto"` surcharge `overflow-y-hidden` du socle (`tailwind-merge`). |
| **Formulaire**               | `form` en `flex flex-col gap-4` entre l’en-tête et les blocs.                                                                                                                                                    |
| `**DialogHeader` (bandeau)** | Compensation du padding du panneau : `**-mx-4 -mt-4`**, `**rounded-t-xl**`, `**border-b border-border/60**`, `**bg-card**`, `**shadow-sm**`, `**pb-4 pt-4**`, `**text-left**`.                                   |
| **Alignement du texte**      | `**pl-7 sm:pl-8`** + `**pr-4**` sur le header : le texte aligne le **contenu** des encarts du corps (`p-3` / `CardContent` `px-3` / `sm:px-4`), pas seulement le bord intérieur du `DialogContent` (`p-4` seul). |
| **Titre + fermeture**        | Rangée titre / `Badge` optionnel dans un bloc avec `**pr-8`** pour laisser la place au bouton **fermer** (`showCloseButton`).                                                                                    |
| `**DialogTitle`**            | Styles par défaut du composant ; `**Badge**` `variant="secondary"` + `font-normal text-muted-foreground` si contexte (méthode, module).                                                                          |
| `**DialogDescription**`      | **Une phrase** ; pas d’information d’autosave dans la description (voir ligne d’état).                                                                                                                           |
| **Ligne d’état**             | Sous la description : `text-xs text-muted-foreground`, icône Lucide, `**role="status"`** + `**aria-live="polite"**` (sauvegarde auto, enregistrement en cours, etc.).                                            |
| **Corps**                    | Encarts `**rounded-lg` / `rounded-xl`**, `**border-border/70**`, `**bg-card**`, `**p-3**` ou `**shadow-sm**` — alignés §12.2 ; erreurs `**Alert**` §9.                                                           |
| **Pied**                     | `**DialogFooter`** si actions explicites (Annuler / Valider) ; sinon **pas de pied** si le flux est autosave uniquement.                                                                                         |


**Prompts à coller (Cursor / agent)** — compléter les `[…]` :

*Nouvelle modale (gabarit §11.3.1)*

```text
Crée une modale [nom / rôle métier] dans [chemin ou feature, ex. features/xxx/components/…].
Respecte docs/FRONTEND_UI-UX.md §11.3.1 (norme modale formulaire dense) et la référence
ProjectRiskEbiosDialog (project-risk-ebios-dialog.tsx) : DialogContent, bandeau DialogHeader
(-mx-4 -mt-4, bg-card, pl-7 sm:pl-8, ligne d’état si besoin), encarts corps type §12.2, Alert §9,
DialogFooter seulement si actions explicites. [Précise périmètre fonctionnel, champs, API, client scope.]
```

*Adapter une modale existante*

```text
Refactor l’UX/UI de la modale [fichier.tsx] pour appliquer le gabarit docs/FRONTEND_UI-UX.md §11.3.1
(même structure que ProjectRiskEbiosDialog : bandeau d’en-tête, alignement pl-7 sm:pl-8, description
courte, ligne d’état optionnelle, corps en encarts). Ne change pas la logique métier ni les appels API
hors ce qui est nécessaire au layout. [Contraintes : autosave oui/non, pied oui/non.]
```

---

## 12. Typographie (rappel)

- Body global ~`0.875rem`(cockpit dense) — voir`globals.css`.
- Texte courant : `text-sm` / `text-xs` ; titres de page : `text-2xl` sur le `h1` du `PageHeader`.

---

## 12.1 Compte — activation 2FA (dialog multi-étapes)

Implémentation : `**EnrollTwoFactorFlow**` dans `features/account/components/account-security-section.tsx` ; déclenché depuis la carte **Sécurité** de la page Compte (`/account`).


| Élément           | Pattern                                                                                                                                                                                                                                                              |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Conteneur         | `Dialog` (Base UI) + `**DialogContent`** avec `max-h-[90vh] overflow-y-auto sm:max-w-lg` — évite le débordement sur petits écrans (QR + formulaire).                                                                                                                 |
| Fermeture         | Bouton **X** en haut à droite (`showCloseButton` par défaut dans `components/ui/dialog.tsx`) ; libellé **assistif** `sr-only` : **« Fermer »** (pas « Close »). Focus trap / `FloatingFocusManager` : comportement natif du popup Base UI.                           |
| Étape 1 — QR      | Titre `DialogTitle` explicite (ex. scanner Authenticator). QR centré dans un bloc `**rounded-lg border border-border bg-white p-2`** + `<img width={200} height={200} alt="QR code 2FA" />` (data URL API — `no-img-element` ESLint désactivé localement si besoin). |
| Secret TOTP       | Ligne `**text-center text-xs text-muted-foreground**` : texte du type *Secret masqué : ••••••••XXXX* — **l’API ne renvoie pas le secret complet** (suffixe de vérification seulement) ; le secret intégral reste dans le QR.                                         |
| Saisie            | `Label` + `Input` `inputMode="numeric"`, `maxLength={6}`, placeholder type `123456`.                                                                                                                                                                                 |
| Actions           | `**flex justify-end gap-2*`* : **Annuler** (`variant="ghost"`, ferme le dialog) + **Activer** (submit, état *Vérification…* si pending).                                                                                                                             |
| Étape 2 — secours | Liste `**font-mono`** dans un encart `rounded-md border bg-muted/40 p-3` ; CTA **J’ai noté les codes** pleine largeur.                                                                                                                                               |


**À ne pas faire** : dupliquer un second titre « Close » visible — le seul libellé anglais acceptable était l’ancien `sr-only` sur l’icône ; il doit être en **français** pour cohérence produit.

### 12.2 Modale — responsable projet (création `/projects/new`)

Implémentation : `**ProjectCreateForm`** — ouverture depuis le résumé + bouton **Définir / Modifier** (`features/projects/components/project-create-form.tsx`).


| Élément               | Pattern                                                                                                                                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Largeur               | `**max-w-lg`** (≈ 32 rem) + `w-full` — **pas** de modale 90 % de l’écran pour un formulaire court (lisibilité, focus).                                                                                       |
| En-tête               | `DialogTitle` **lisible** (`text-lg font-semibold`) + `DialogDescription` **une phrase** (pas de jargon produit inutile).                                                                                    |
| Onglets               | `TabsList` `**variant="line"`** + soulignement actif (Base UI) ; libellés métier : **Compte client** / **Nom libre**.                                                                                        |
| Panneau « compte »    | Bloc `**rounded-xl border border-border/70 bg-card p-4 shadow-sm`** (§2) ; `**Label**` explicite au-dessus du `Select` ; aide `**text-xs text-muted-foreground**` avec `aria-describedby`.                   |
| Erreur chargement     | `**Alert` `variant="destructive"**` + `AlertCircle` (§9) — jamais seulement un paragraphe rouge nu.                                                                                                          |
| Panneau « nom libre » | Encart `**border-l-[3px] border-l-sky-500/55**` + icône `**Users**` dans un carré `rounded-lg bg-sky-500/10` (aligné §11.2 / accent latéral) ; texte court, pas de **50 %** de largeur qui casse la lecture. |
| Pied                  | `DialogFooter` + **Terminé** (`type="button"`) — ne pas soumettre le formulaire parent.                                                                                                                      |


### 12.3 Modale — catalogue Humaine (équipe projet & création projet)

Composant partagé : `**PersonCatalogPickerDialog`** (`features/projects/components/person-catalog-picker-dialog.tsx`) — tableau filtrable, création **Nouvelle humaine**, `Alert` catalogue, `LoadingState` / `EmptyState`. Filtre recherche : `personResourceMatchesSearch` dans `features/projects/lib/person-resource-search.ts`.

**Usages** :

- **Équipe projet** : `**ProjectTeamMatrix`** — `footerVariant="confirm-and-close"` (Fermer + **Ajouter**), `filterFetchedResources` pour exclure les emails déjà sur le rôle, `queryKey` inclut `clientId`.
- **Création projet** : `**ProjectCreateForm`** — `footerVariant="done-only"` (**Terminé**), `allowEmpty` + libellé « Aucun responsable », `dialogContentClassName` en `sm:max-w-lg` (formulaire court, §12.2).


| Élément          | Pattern                                                                                                                                                                                                            |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Largeur          | `**sm:max-w-5xl`** + `max-h-[min(90vh,800px)] overflow-y-auto` — tableau multi-colonnes (liste cockpit, pas formulaire court seul).                                                                                |
| En-tête          | Comme §12.2 : `DialogTitle` `text-lg font-semibold tracking-tight` + `DialogDescription` courte ; `**showCloseButton**`.                                                                                           |
| Erreur catalogue | `**Alert**` avec icône : `Info` + ambre pour **403** (§9), `AlertCircle` + `destructive` pour **5xx/404** ; message secondaire permission `resources.read` si 403.                                                 |
| Bloc liste       | Encart `**rounded-xl border border-border/70 bg-card p-4 shadow-sm`** (§2) ; aide `**text-xs**` + `aria-describedby` sur le champ filtre.                                                                          |
| Tableau          | `**Table**` avec `**min-w-[56rem]**` (§8.1 — scroll horizontal) ; zone `**max-h` + `overflow-auto**` + bordure `**border-border/60**` sur le conteneur scroll (évite double scroll inutile avec le shell `Table`). |
| États            | `**LoadingState**` (§10) ; vide : `**EmptyState**` dans l’encart.                                                                                                                                                  |
| Pied             | `**DialogFooter**` — **Fermer** + **Ajouter** (pas de submit parent).                                                                                                                                              |


---

## 12.4 Page Ressources (`/resources`)

Implémentation : `app/(protected)/resources/page.tsx`.

- **Structure** : `PageHeader` + panneau filtres (recherche / type / pagination) + états `LoadingState` / `Alert` / `EmptyState`.
- **Liste** : pattern `**Card size="sm"`** + `CardHeader` (titre + description), `CardContent className="p-0"` et composant `**Table**` (`@/components/ui/table`) ; éviter une table HTML brute.
- **Largeur table** : `min-w-[56rem]` pour préserver la lisibilité des colonnes (`Nom`, `Type`, `Portée`, `Société`, `Rôle métier`) avec scroll horizontal géré par `Table`.
- **Pagination** : dans `CardFooter`, avec résumé `x–y sur total` et actions précédente/suivante.
- **Édition** : le nom de ressource est un bouton textuel (`text-primary hover:underline`) uniquement si `resources.update`.
- **Tokens** : pas de `border-white/`* sur cette liste ; utiliser les tokens de surface/bordure (`border-border/60`, `bg-card`, `text-muted-foreground`).

### 12.4.1 Barre de filtres liste (`FilterBar` / `FilterBarField`)

Composants : `components/layout/filter-bar.tsx`, `filter-bar-field.tsx` (RFC-FE-MOB-003).

- **Grille mobile-first** : `grid-cols-1` par défaut, champs `w-full min-w-0` — **jamais** de `min-w-[200px]` sur les contrôles.
- **Landmark** : `<section aria-label="Filtres …">` ; `role="search"` uniquement si recherche/filtrage principal (`asSearch`).
- **Champ accessible** : `FilterBarField` avec render props `{ controlId, labelId, descriptionId }` — Input natif `id={controlId}` ; Select/Radix `aria-labelledby={labelId}` sur le trigger.
- **Toolbar actions** : pattern inline `flex-col gap-3 lg:flex-row` — boutons `w-full sm:w-auto` à côté du `FilterBar`.
- **Listes** : associer `DataTable` cartes mobile ; `mobilePriority` explicite (`actions`, `secondary` pour montants).

---

## 13. Liens utiles


| Sujet                                     | Document                                                                                                                                          |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mobile-first (série RFC)                  | [RFC-FE-MOB-001](./RFC/RFC-FE-MOB-001%20%E2%80%94%20Fondations%20mobile-first%20transverses.md), [RFC-FE-MOB-002](./RFC/RFC-FE-MOB-002%20%E2%80%94%20DataTable%20responsive%20et%20listes%20denses.md), [RFC-FE-MOB-003](./RFC/RFC-FE-MOB-003%20%E2%80%94%20FilterBar%2C%20toolbars%20et%20plan%20de%20migration%20modules.md) |
| Architecture complète                     | [FRONTEND_ARCHITECTURE.md](./FRONTEND_ARCHITECTURE.md)                                                                                            |
| Module Projets (structure, query keys)    | §30.6 dans FRONTEND_ARCHITECTURE.md                                                                                                               |
| Budget frontend                           | [docs/modules/budget-frontend.md](./modules/budget-frontend.md)                                                                                   |
| Fiche projet décisionnelle (RFC-PROJ-012) | [docs/modules/projects-mvp.md](./modules/projects-mvp.md), [RFC-PROJ-012 — Project Sheet.md](./RFC/RFC-PROJ-012%20%E2%80%94%20Project%20Sheet.md) |


---

*Dernière mise à jour : juin 2026 — chantier mobile-first (`RFC-FE-MOB-*`) : `FilterBar` §12.4.1, `DataTable` cartes ; refonte UI portefeuille Projets — `.starium-kpi-strip`, `.starium-filter-bar` / chips, tableau `.starium-projects-table` §6.1–§7.*