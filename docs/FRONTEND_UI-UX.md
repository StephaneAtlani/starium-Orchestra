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
- **Cadres imbriqués** : **ne pas** envelopper une grille de KPI dans une `Card` / `.starium-section` — pattern DS dashboard : **`.starium-module`** (titre + actions, fond app visible) + **`.starium-kpi-card`** par indicateur ; **portefeuille `/projects`** : **`.starium-module`** + grille **4 × `KpiCard` `variant="dense"`** (pastilles icônes sémantiques — **§6.1**). La classe **`.starium-kpi-strip`** reste disponible en CSS pour d’autres écrans (ex. présentation CODIR) mais n’est plus le pattern du bandeau KPI liste projets. Réserver **`.starium-section`** / **`.starium-panel`** à un **seul** bloc (tableau, citation, formulaire). Détail : **§2.1**.
- **Cartes « synthèse »** (fiche projet, arbitrage) : sous-blocs avec accent latéral possible — voir fiche projet **§11.2**. Les **score cards KPI** (dashboard, budgets) utilisent **§2.1** / **§6** ; le **bandeau KPI portefeuille Projets** utilise **§6.1** (4 × `KpiCard` dense dans `.starium-module`), pas le bandeau coloré latéral fiche projet.
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
| `.starium-kpi-strip` | **Bandeau KPI** historique : une carte, grille 3 colonnes (groupes Volume / Risques / Complétude) — **présentation CODIR** ou écrans legacy ; **pas** le bandeau `/projects` actuel | **Oui** — un seul cadre |
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

**Règle anti « cadre dans cadre »** : grille de N KPI dashboard → `starium-module` + N × `starium-kpi-card`. **Interdit** : `starium-section` > grille de `starium-kpi-card`. Portefeuille Projets : **`starium-module`** + **4 × `KpiCard` dense** (`projects-portfolio-kpi.tsx`) — pas de `Card` parent autour des KPI.

**Composants** : `KpiCard` (`components/ui/kpi-card.tsx`, prop `iconWrapperClassName` pour pastilles colorées) et `BudgetKpiCard` consomment `.starium-kpi-card`. `ProjectsPortfolioKpi` consomme `.starium-module` + `KpiCard`. `Card` / `.starium-card` restent pour tableaux, modales, contenus non-KPI.

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

### 3.2 WorkspaceHeader — barre supérieure (topbar)

- Fichiers :
  - `apps/web/src/components/shell/workspace-header.tsx` — composition desktop + mobile ;
  - `apps/web/src/components/shell/workspace-breadcrumb.tsx` — fil d’Ariane ;
  - `apps/web/src/lib/navigation/build-workspace-breadcrumb.ts` — résolution route → segments ;
  - `apps/web/src/components/shell/workspace-breadcrumb-context.tsx` — override libellé entité (`useWorkspaceBreadcrumbOverride`) ;
  - `apps/web/src/components/shell/account-menu-dropdown.tsx` — menu compte + organisation ;
  - `apps/web/src/components/shell/mobile-workspace-header-bar.tsx` — barre mobile (ink).
- Provider : `WorkspaceBreadcrumbProvider` dans `app-shell.tsx` (obligatoire pour le fil d’Ariane et les overrides).

**Desktop (`md+`)** — hauteur `--topbar-height` (64px), classes `.starium-topbar-*` dans `globals.css` :

| Zone | Comportement |
|------|----------------|
| Fil d’Ariane | `WorkspaceBreadcrumb` : segments dérivés de `pathname` + `config/navigation.ts` (section → module → sous-route). Ex. `/projects` → `Pilotage / Projets` ; `/projects/{id}` → `Pilotage / Projets / {nom projet}`. Dernier segment sans lien (`aria-current="page"`). |
| Recherche | Bouton `.starium-topbar-search` (placeholder + raccourci `⌘K` / `Ctrl+K`) ; icône seule entre `md` et `lg`. Ouvre `GlobalSearchDialog`. |
| Notifications | `NotificationBell` (`.starium-topbar-icon`). |
| Menu compte | Avatar `.starium-topbar-avatar` (ink + bordure or) + chevron ; panneau Compte / Déconnexion. |

**Fil d’Ariane — libellés dynamiques (UUID)** : le builder pose un placeholder `…` pour les segments dynamiques. Les pages chargent le libellé métier via :

```tsx
useWorkspaceBreadcrumbOverride({
  entityLabel: project.name,
  entityHref: projectDetail(projectId),
});
```

Références : `ProjectWorkspaceShell`, `budgets/[budgetId]/page.tsx`. Override complet possible avec `items: WorkspaceBreadcrumbItem[]`.

**Sélection client** : plus dans la topbar. Section **Organisation** en tête du menu compte (`AccountMenuDropdown`) : `ClientSwitcher` si multi-client, sinon nom du client actif. Même logique sur mobile.

**Menu compte** (`<details>`) : fermeture au **clic extérieur**, **Escape**, après navigation / déconnexion.

**Avatar** : si `hasAvatar` (`GET /me`), image via `GET /api/me/avatar` (blob URL) ; sinon initiales (`PA` pour admin plateforme). Après changement sur `/account`, `refreshProfile()` recharge l’avatar.

**Règles** : le fil d’Ariane ne porte pas le nom du client actif (contexte organisation = menu compte). Pas de logique métier dans le header : calcul breadcrumb + affichage contexte uniquement.

---

## 4. En-tête de page

Titres en **tokens** sémantiques (pas de `#1B1B1B`). Composant : `components/layout/page-header.tsx` — **carte blanche** (`.starium-page-header` : fond `var(--card)`, bordure, ombre DS).

- **Titre** : `text-xl font-bold sm:text-2xl` (mobile-first).
- **Eyebrow** optionnel (ex. « Pilotage › Projets ») : `.starium-page-header__eyebrow`. Le fil d’Ariane principal vit dans la **topbar** (`WorkspaceBreadcrumb`) ; l’eyebrow reste un complément local à la page si besoin.
- **Actions** : zone `.starium-page-header__actions` — sur mobile, empilées sous le titre (pleine largeur) ; sur `sm+`, alignées à droite du titre.
- **Actions responsives** (référence `/projects`) : liens secondaires en **icônes seules** + `aria-label` sous `md` ; libellés complets sur `sm+` ; CTA primaire raccourci (« Nouveau ») sur très petit écran.

```tsx
// apps/web/src/components/layout/page-header.tsx (structure simplifiée)
<header className="starium-page-header">
  {eyebrow ? <div className="starium-page-header__eyebrow">{eyebrow}</div> : null}
  <div className="starium-page-header__main flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
    <div>
      <h1 className="text-xl font-bold sm:text-2xl">{title}</h1>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
    </div>
    {actions ? <div className="starium-page-header__actions">{actions}</div> : null}
  </div>
</header>
```

Fond de page app : `.starium-workspace-sheet` → `var(--starium-background)` (`#FAF9F7`) ; la liste projets mobile n’utilise pas de « feuille blanche » supplémentaire sur la `Card` liste (`max-md:border-0 max-md:bg-transparent`).

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

Fichier : `features/projects/components/projects-portfolio-kpi.tsx`.

- **Conteneur** : `.starium-module` (fond app visible, **pas** de `Card` parent).
- **Grille** : `grid-cols-2 sm:grid-cols-4` — **4 indicateurs** via **`KpiCard` `variant="dense"`** :
  - Projets actifs, En cours d'exécution, En retard, Terminés ce trimestre.
- **Icônes** : pastilles sémantiques (`iconWrapperClassName` sur `KpiCard`) — or Starium, warning, destructive, success.
- Données : `GET /api/projects/portfolio-summary` (`usePortfolioSummaryQuery`).
- **Note** : la classe **`.starium-kpi-strip`** (9 indicateurs / 3 groupes) reste en CSS pour d’autres écrans ; le cockpit liste `/projects` n’utilise plus ce markup.

---

## 7. Filtres — cockpit portefeuille Projets (référence)

L’écran **`/projects`** regroupe **filtres, liste et pagination** dans une **`Card size="sm"`** avec **`starium-panel`** (`overflow-hidden`) sur **desktop** ; sur **mobile** (`max-md`), la carte liste est **transparente** (pas de double cadre) — voir **§7.4**.

### 7.1 Barre « Filtrer et trier » (`ProjectsToolbar`) — desktop uniquement

- Fichier : `apps/web/src/features/projects/components/projects-toolbar.tsx`.
- Rendu **`embedded`** dans la `Card` liste ; **`hidden md:block`** sur la page (la barre desktop n’apparaît pas sur mobile).
- Conteneur : **`.starium-filter-bar`** — titre **« Filtrer et trier »**.
- **Actions** (`.starium-filter-bar-chips`) :
  - **Tableau / Kanban** — `.starium-tab-group` (Kanban **desktop seulement**).
  - **En retard**, **Mes projets** — `.starium-filter-chip` toggle.
  - **Plein écran** — `requestFullscreen` sur `#starium-app-workspace`.
  - **Toutes les colonnes** / **Colonnes de base** — bascule densité tableau (`columnDensity` : `basic` | `extended`, persistance `localStorage` clé `starium.projects.tableColumnDensity`) ; visible uniquement en mode **Tableau**.
  - **Réinitialiser** — `.starium-filter-chip--muted`.

### 7.1.1 Portals en plein écran (Select / Tooltip / Dialog)

Quand `/projects` est en plein écran, les popups Base UI (`Select`, `Tooltip`, `Dialog`) ne doivent pas être montés dans `document.body`, sinon ils sortent du sous-arbre plein écran et deviennent invisibles/non interactifs.

- Hook commun : `apps/web/src/hooks/use-fullscreen-portal-container.ts` → renvoie `document.fullscreenElement` (ou `undefined` hors plein écran).
- `Select` : `apps/web/src/components/ui/select.tsx` (`SelectPrimitive.Portal container={fullscreenContainer}`).
- `Tooltip` : `apps/web/src/components/ui/tooltip.tsx` (`TooltipPrimitive.Portal container={fullscreenContainer}`).
- `Dialog` : `apps/web/src/components/ui/dialog.tsx` (`DialogPortal` utilise `container ?? fullscreenContainer` pour garder un override explicite possible).

Effet attendu : les filtres inline du tableau Projets (ligne 2 des en-têtes) restent utilisables en mode plein écran.

### 7.2 Tableau desktop — double ligne d’en-tête + filtres inline (`ProjectsListTableDesktop`)

- Orchestrateur : `apps/web/src/features/projects/components/projects-list-table.tsx` — **`md:hidden`** → `ProjectsListMobileView` ; **`hidden md:block`** → `ProjectsListTableDesktop`.
- Fichier tableau dense : `apps/web/src/features/projects/components/projects-list-table-desktop.tsx`.
- **Densité colonnes** (`columnDensity`, défaut `basic`, persistance `localStorage`) :
  - **`basic`** (7 colonnes) : Projet (icône catégorie + nom), Statut, Avancement (1 barre), Échéance, Budget (`ProjectsListBudgetSummary` : cible + consommé), **Responsable projet**, Actions.
  - **`extended`** (12 colonnes) : tableau historique dense — Catégorie, Projet (code + criticité), Nature, Santé, Statut, Mon rôle, Chef de projets, Avancement manuel/dérivé, Échéance, T · R · J, Signaux, Étiquettes ; double ligne d’en-tête + filtres inline (détail ci-dessous).
- Bascule **Toutes les colonnes** / **Colonnes de base** dans `ProjectsToolbar` (mode Tableau uniquement).
- **`TooltipProvider delay={250}`** ; classe racine **`starium-projects-table`** (`Table noWrapper`, `min-w-[64rem]` en mode extended).
- **Mode extended** — première ligne d’en-tête : `HeaderTip`, `SortHeaderButton` ; colonnes Catégorie, Projet, Nature, Santé, Statut, Mon rôle, Avancement, Échéance, T · R · J, Signaux, Étiquettes.
- **Mode extended** — deuxième ligne : filtres `Select` / `Input` (`.starium-col-filter`, `h-7`) alignés sur les colonnes ; em dash `—` sur colonnes sans filtre.
- **Lignes** : catégorie deux lignes ; lien projet `.starium-proj-name` ; barres `.starium-progress-track` / `.starium-progress-fill` ; `ProjectPortfolioBadges` `stacked` ; colonnes sticky catégorie + projet (`starium-table-sticky-edge`).

### 7.4 Liste mobile — cartes (`ProjectsListMobileView`)

- Fichier : `apps/web/src/features/projects/components/projects-list-mobile-view.tsx`.
- **Barre locale** : champ recherche (`search`) + bouton **Filtrer** (ouvre bottom sheet `Dialog`).
- **Chips rapides** : Mes projets, En retard, À risque (`atRiskOnly`).
- **Bottom sheet** : `ProjectsPortfolioFiltersBar` avec prop `mobileSheet` ; footer **Réinitialiser** / **Appliquer** (pas de bascule Kanban sur mobile).
- **Cartes** : `ProjectsListProjectCard` — barre statut colorée, progression, pied Fin / Budget+Consommé / Responsable ; menu `⋯` via `ProjectsListRowActionsMenu`.
- **Toolbar desktop** (`ProjectsToolbar`) masquée sur mobile (`hidden md:block` sur la page).
- Helpers partagés : `features/projects/lib/projects-list-display.ts` ; budget : `projects-list-budget-summary.tsx`.

### 7.3 Page — assemblage

```text
PageContainer
  PageHeader  (carte blanche ; actions responsives — §4)
  ProjectsPortfolioKpi   (.starium-module + 4 × KpiCard dense)
  LoadingState / Alert erreur
  Card starium-panel (liste ; max-md: transparente)
    ProjectsToolbar embedded   (hidden md:block — .starium-filter-bar)
    CardContent (scroll + useTablePan) → ProjectsListTable
      md:hidden → ProjectsListMobileView (cartes + bottom sheet filtres)
      hidden md:block → ProjectsListTableDesktop (basic | extended)
    CardFooter starium-table-footer → PaginationSummary + chips Précédent / Suivant
    ou CardContent → EmptyState / LoadingState
```

Le **`CardContent`** qui porte la liste est le **conteneur de scroll** (`min-h-0 flex-1 overflow-auto`, `ref` + `useTablePan` pour le grab/pan — voir **§8**). Le tableau utilise **`Table noWrapper`** pour que l’en-tête sticky reste cohérent (pas de second `overflow-x-auto` uniquement horizontal entre le scroll et `<thead>`).

Autres écrans (ex. **plan d’action détail**, §11) peuvent utiliser une **variante** : `Card` filtres **séparée** avec sections Recherche / Filtrer par et filets `h-px bg-border/70` — même esprit de tokens (`border-border/60`, `Card size="sm"`), mais **sans** ligne de filtres dans le tableau lorsque la grille de colonnes est plus simple.

---

## 8. Liste dans une `Card` + table

- En-tête : `CardHeader` + `CardTitle` / `CardDescription`.
- **Composant `Table`** (`apps/web/src/components/ui/table.tsx`) : par défaut (sans `noWrapper`), la `<table>` est dans un `div` `data-slot="table-container"` avec `overflow-x-auto`, **`cursor-grab`** / **`cursor-grabbing`** pendant le déplacement, et le hook **`useTablePan`** (`apps/web/src/hooks/use-table-pan.ts`) — **clic maintenu + glisser** (souris **ou** doigt via **Pointer Events**) pour faire défiler (horizontal ; vertical aussi si le conteneur a les deux axes). Un **seuil de déplacement** (~6 px) évite de confondre pan et clic sur une ligne ; après un pan, appeler **`shouldSuppressClick()`** dans le `onClick` ligne pour ne pas ouvrir l’édition. Les **liens, boutons, champs, selects, labels** ne déclenchent pas le pan (même esprit que le Gantt portefeuille : `docs/modules/portfolio-gantt-ui.md` §5). Pendant le pan : `touch-none` + `select-none`. **`TableContainer`** est exporté si un écran doit réutiliser ce wrapper seul.
- **Écrans projet** utilisant `useTablePan` sur `starium-table-wrap` (hors wrapper `Table` par défaut) : **liste tâches** (`project-tasks-list-tab.tsx`, `/projects/:id/tasks`), **jalons planning** (`project-planning-milestones-tab.tsx`, `?sub=milestones`), **Kanban** (`project-planning-kanban-tab.tsx`).
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
    onPointerDown={tablePan.onPointerDown}
    className={cn(
      'min-h-0 flex-1 overflow-auto p-0 group-data-[size=sm]/card:px-0 group-data-[size=sm]/card:pt-0',
      tablePan.isPanning ? 'cursor-grabbing select-none touch-none' : 'cursor-grab',
    )}
  >
    <ProjectsListTable items={items} />
  </CardContent>
  <CardFooter>{/* pagination */}</CardFooter>
</Card>
```

Tables : composants `Table`, `TableHeader`, `TableBody`, etc. depuis `@/components/ui/table`.

### 8.1 Liste projets — `ProjectsListTable`

Orchestrateur : `features/projects/components/projects-list-table.tsx`.

**Mobile (`md:hidden`)** — `ProjectsListMobileView` + `ProjectsListProjectCard` : cartes empilées (RFC-FE-MOB-002), pas de `DataTable` générique ; recherche + bottom sheet filtres (§7.4).

**Desktop (`hidden md:block`)** — `ProjectsListTableDesktop` :

- **Densité `basic` (défaut)** : 7 colonnes — Projet, Statut, Avancement, Échéance, Budget (cible fiche + **consommé** agrégé liens FIXED via API `consumedBudgetAmount`), **Responsable projet** (libellé métier, avatar), Actions.
- **Densité `extended`** : 12 colonnes — tableau dense historique avec double en-tête, filtres inline, colonnes sticky, `min-w-[64rem]` (scroll horizontal contrôlé — exception documentée RFC-FE-MOB-003).
- **Budget / consommé** : composant partagé `ProjectsListBudgetSummary` ; consommé = somme des `budgetLine.consumedAmount` des liens projet ↔ ligne en mode **FIXED** (`projects.service.ts` → `consumedBudgetAmountsByProjectId`).
- **Tooltips** : `TooltipProvider` (~250 ms) ; `HeaderTip` / `CellTip` en mode extended.
- **Santé / signaux** : `HealthBadge` `compact` ; `ProjectPortfolioBadges` `stacked` (mode extended) ; pas de répétition textuelle des `warnings` sous les pastilles.
- **Persistance UI** : `starium.projects.tableColumnDensity` (`basic` | `extended`) — `features/projects/lib/projects-table-column-density.ts`.

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

1. `PageHeader` (carte blanche §4 ; actions CODIR/Gantt responsives, **Nouveau projet** primaire)
2. **`ProjectsPortfolioKpi`** — **`.starium-module`** + **4 × `KpiCard` dense** (**§6.1**)
3. **Une** `Card` liste (transparente sur mobile) : **`ProjectsToolbar`** desktop + **`ProjectsListTable`** (cartes mobile §7.4 / tableau desktop §7.2) + pagination **`.starium-table-footer`**
4. `LoadingState` / `**Alert` erreur API** (§9) / `**Card` + `EmptyState`**
5. Détail colonnes et budget : **§8** / **§8.1**

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

*Dernière mise à jour : juin 2026 — portefeuille `/projects` mobile-first (cartes + bottom sheet filtres, RFC-FE-MOB-002/003) ; KPI 4 × `KpiCard` dense ; tableau desktop densité `basic`/`extended` + budget/consommé ; `PageHeader` carte blanche responsive.*