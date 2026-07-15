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
| **Mobile** | Mobile-first (`sm` → `xl`) ; test ≥ 320px ; cibles tactiles ≥ 44×44 px ; tableaux avec stratégie mobile ; modales **centrées** layout Starium (voir [MODALES.md](./design-system/MODALES.md)) — pas bottom-sheet sauf `layout="legacy"`. |

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

- Couleurs : **tokens** (`bg-background`, `text-muted-foreground`, `border-border`, `bg-card`, etc.) — pas d’hex arbitraires dans les pages. **Texte secondaire** : `text-muted-foreground` ou `.starium-text-muted` → `--color-text-muted` / `--ds-text-muted-color` (**neutral-900** `#14130F`, quasi primaire — ne pas utiliser neutral-500/600/700/800 pour du corps de texte). **Champs de saisie** : valeur `--color-input-text` (`text-foreground` sur `Input` / `Textarea` / `SelectTrigger`) ; placeholder / select vide → `--color-input-placeholder` (= `--color-text-muted`) — **ne pas** laisser les inputs hériter `text-muted-foreground` d’un parent `Card`.
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
| `.starium-kpi-card` | **Une** score card KPI (icône or + libellé + valeur) — dashboard, budgets | **Oui** — `shadow-1`, `radius-lg` ; libellé `.starium-kpi-label` → `--ds-kpi-label-color` |
| `.starium-kpi-card--interactive` | Variante cliquable (lien) | idem + hover `shadow-2` |
| `.starium-kpi-strip` | **Bandeau KPI** historique : une carte, grille 3 colonnes (groupes Volume / Risques / Complétude) — **présentation CODIR** ou écrans legacy ; **pas** le bandeau `/projects` actuel | **Oui** — un seul cadre |
| `.starium-kpi-strip-*` | Sous-éléments du strip (`-grid`, `-group`, `-group-label`, `-items`, `-item-label`, `-item-value`, modificateurs `--ok` / `--warn` / `--danger` / `--muted`) | — |
| `.starium-section` | Bloc cartonné **unique** (vision, encart) | **Oui** |
| `.starium-panel` | Panneau données (liste + toolbar) — élévation `shadow-2` sur une `Card` | **Oui** (un niveau) |
| `.starium-section-title` | Titre de section / `CardTitle` — token `--ds-section-title-size` (1,3125rem ; 1,1875rem sur carte `size="sm"`) | — |
| `.starium-section-subtitle` | Sous-titre carte / `CardDescription` — token `--ds-section-subtitle-size` | — |
| `.starium-stack` | Empilement vertical de blocs page ou fiche — token `--ds-stack-gap` (2rem) ; utilisé par `PageContainer` et `ProjectSheetView` | — |
| `.starium-filter-bar` | Barre « Filtrer et trier » (titre + actions) dans un panneau liste | — |
| `.starium-filter-chip` | Bouton filtre outline ; `--active` = fond or ; `--muted` = Réinitialiser | — |
| `.starium-tab-group` / `.starium-tab-btn` | Segmented control Tableau / Kanban (actif = or) | — |
| `.starium-projects-table` | Densité et en-têtes overline du tableau portefeuille Projets ; sous-classes `starium-projects-table-label-row` (ligne libellés) et `starium-projects-table-filter-row` (filtres inline) — voir §7.2 | — |
| `.starium-table-footer` | Pied pagination panneau liste (mockup Projets) | — |
| `.starium-overline` | Libellé uppercase 11px (groupes compacts) | — |
| `.starium-text-muted` | Texte secondaire lisible (descriptions, métadonnées, sous-titres module) — `neutral-900` | — |

**Tokens typo secondaire** (`apps/web/src/styles/tokens.css`) : `--color-text-muted` → `var(--neutral-900)` ; `--ds-text-muted-color` ; `--ds-kpi-label-color` (libellés `.starium-kpi-label` et strip KPI) ; espacement blocs `--ds-stack-gap`, `--ds-form-grid-gap`, `--ds-form-field-gap` ; titres section `--ds-section-title-size`, `--ds-section-subtitle-size`. Préférer `text-muted-foreground` ou `.starium-text-muted` — **ne pas** utiliser `neutral-500`–`neutral-800` pour du texte de contenu.

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
  return <div className={className ?? 'starium-stack'}>{children}</div>;
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
| Fil d’Ariane | `WorkspaceBreadcrumb` : segments dérivés de `pathname` + `config/navigation.ts` (section → module → sous-route). Ex. `/projects` → `Exécution / Projets` ; `/projects/{id}` → `Exécution / Projets / {nom projet}`. Dernier segment sans lien (`aria-current="page"`). |
| Recherche | Bouton `.starium-topbar-search` (placeholder + raccourci `⌘K` / `Ctrl+K`) ; icône seule entre `md` et `lg`. Ouvre `GlobalSearchDialog`. |
| Notifications | `NotificationBell` (`.starium-topbar-icon`). |
| Menu compte | Avatar `.starium-topbar-avatar` (ink + bordure or) + chevron ; panneau Compte / Déconnexion. |

**Fil d’Ariane — libellés dynamiques (identifiants techniques)** : le builder (`build-workspace-breadcrumb.ts`) pose un placeholder `…` pour tout segment dynamique : **UUID**, **entier**, **CUID Prisma** (`/^[a-z0-9]{20,}$/i`, hors segments statiques connus). Les pages chargent le libellé métier via :

```tsx
useWorkspaceBreadcrumbOverride({
  entityLabel: project.name,
  entityHref: projectDetail(projectId),
});
```

Références : `ProjectWorkspaceShell` (topbar : nom projet via `useWorkspaceBreadcrumbOverride`), `budgets/[budgetId]/page.tsx`. Override complet possible avec `items: WorkspaceBreadcrumbItem[]`. **Jamais d’ID technique visible** dans le fil topbar une fois le libellé chargé.

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
- **Double ligne d’en-tête** (modes `basic` et `extended`) :
  - **Ligne 1** — classe `starium-projects-table-label-row` : libellés de colonnes (`HeaderTip`, `SortHeaderButton`) ; colonne **Projet** en `rowSpan={2}` avec slot filtre dédié (`starium-projects-table-project-head`).
  - **Ligne 2** — classe `starium-projects-table-filter-row` : `Select` / `Input` inline (`.starium-col-filter`, `h-6` en extended) alignés sous chaque colonne filtrable ; em dash `—` sur colonnes sans filtre.
  - **CSS** (`globals.css`) : la ligne libellés supprime le `padding-bottom` des `th` (sauf colonne Projet) et `vertical-align: bottom` pour que les libellés **collent** au trait de séparation puis aux filtres — pas d’espace vide entre « Santé » et le select « Toutes ».
- **Mode extended** — première ligne d’en-tête : colonnes Catégorie, Projet, Nature, Santé, Statut, Mon rôle, Avancement, Échéance, T · R · J, Signaux, Étiquettes.
- **Mode extended** — deuxième ligne : filtres `Select` / `Input` sur Nature, Santé, Statut, Mon rôle, Chef de projets, etc.
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
- **Tableaux `starium-dt`** (cartes `starium-tablecard`) : utiliser le composant **`StariumTableWrap`** (`apps/web/src/components/ui/starium-table-wrap.tsx`) — même hook **`useTablePan`**, contexte **`useStariumTablePan()`** pour les lignes cliquables. Classe CSS **`starium-dt--wide`** (`min-width` ~56rem) sur les grilles denses. **Écrans projet** : budget (`project-budget-synthesis.tsx`, `project-budget-section.tsx`), tâches (`project-tasks-list-tab.tsx`), jalons (`project-planning-milestones-tab.tsx`), risques (`project-risks-view.tsx`), **points projet** (`project-reviews-tab.tsx`), tâches récentes synthèse (`project-synthesis-recent-data.tsx`). **Kanban** : pan dédié (`project-planning-kanban-tab.tsx`).
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
- **Avertissement** (ex. permission métier manquante, fiche verrouillée) : `Alert` en `default` (`bg-card`, bordure `border-border/70`) + icône contextuelle (`Lock`, `AlertTriangle`, etc.) ; titres en `text-xs` / `font-semibold` si bandeau compact.

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

**Structure UX (blocs successifs dans des `Card size="sm"`)** : sections étiquetées **A–H** (équipes, résumé & indicateurs, valeur métier, financier, risques, SWOT, TOWS, rétroplanning) ; **matrice RASCI** en section dédiée en bas de fiche (distincte de la carte équipe) ; conteneur racine **`.starium-stack`** ; titres **`CardTitle`** / **`.starium-section-title`** ; sous-titres **`CardDescription`** / **`.starium-section-subtitle`** ; séparateurs `**border-t border-border**` entre zones denses dans une même carte.

**Verrouillage** (projet `COMPLETED` \| `CANCELLED` \| `ARCHIVED`) : bandeau `Alert` « Fiche verrouillée » en tête de fiche (`bg-card`) ; champs et matrices en lecture seule ; **seul le statut projet** reste modifiable pour réouverture (`PATCH` avec `status` non terminal). Voir RFC-PROJ-012 §6.5.

**Densité formulaire** : scope `projectSheetChromeClass` — inputs / selects / textareas / labels en **`text-xs`**, hauteur contrôle `h-8` ; grilles champs **`gap-5`** (`projectSheetFieldGridClass`, **`text-foreground`** sur la grille et les libellés inline) ; hints combobox parent en **`text-foreground`**.

**Équipe vs RASCI** :

**Équipes impliquées (section A)** :

- `**CardTitle**` + icône `**UsersRound**` ; encart indigo (`**projectSheetEncartClass**` + `**border-l-indigo-500/70**`) ; `**textarea**` multi-lignes (max 2000 car.) + compteur ; badge **« Organisation »**.

- **`ProjectTeamMatrix`** — tableau compact **Rôle · Ressource · Actions** (une ligne par rôle, membres inline, menu `⋯` par rôle) ; confirmation avant retrait membre ; `readOnly` si fiche verrouillée.
- **`ProjectRaciMatrix`** — grille **actions × acteurs (rôles)** ; cellule = une lettre `R` / `A` / `S` / `C` / `I` (`ProjectRaciKind`) ; règle métier **un seul A par action** (côté API) ; 8 actions BPM par défaut au premier accès ; cycle UI avec confirmation ~1,8 s avant de remplacer un A existant ; libellés métier uniquement (jamais d’UUID en colonnes) ; `readOnly` si fiche verrouillée. API : `GET|PATCH /api/projects/:projectId/team-raci`, `POST|DELETE …/raci-actions`. Permission édition : `projects.update`.

**Indicateurs de lecture** (sous-bloc dans la carte « Résumé ») :

**Identité & cadrage** (section B, bloc supérieur) :

- Zone `**h4**` + badge **« Fiche projet »** ; grille `**lg:grid-cols-2**` (nom + période) puis `**sm:grid-cols-2 lg:grid-cols-3**` (code, type, nature, statut, criticité) via tuiles `**ProjectSheetMetaTile**` (accent latéral, icône, hint).
- **Hiérarchie** : encart teal + `**ProjectParentField**`.

- En-tête de zone : `**h4`** + `**Badge variant="secondary"**` (ex. libellé « Décision ») + paragraphe `**text-xs text-muted-foreground**` (max ~2 lignes).
- Grille `**grid gap-3 sm:grid-cols-2 xl:grid-cols-4**` : quatre cartes avec **bandeau gauche** coloré par axe (ROI, priorité portefeuille, ROE / scores, COPIL), icônes Lucide, **séparateur** `border-t border-border/60` avant le pied d’encart si besoin.
- Barres mini optionnelles pour les scores (ROE) : même fichier, composant local `**ScoreMiniBar`**.

**Arbitrage** (trois niveaux métier / comité / CODIR) :

- Même langage visuel : `**pt-8`**, titre `**h4**` + badge **« 3 niveaux »**, grille `**sm:grid-cols-3`**.
- Carte par niveau : `**rounded-xl p-4 shadow-sm**`, accent `**border-l-[3px]**` + fond léger selon **statut** (validé / refus / soumis à validation / en cours / brouillon) ; **badge « Verrouillé »** si le niveau précédent n’est pas validé ; **icônes** distinctes par niveau ; **séparateurs** `border-t border-border/50` avant statut, motif de refus ou message de lecture seule.

**Valeur métier (section C)** :

- `**CardDescription**` sous-titre ; blocs séparés par `**border-t border-border/70 pt-8**`.
- **Description** : encart `**projectSheetEncartClass**` (`rounded-xl border border-border/70 bg-muted/20 p-4`).
- **Scores ROE** : grille `**sm:grid-cols-3**` de tuiles `**BusinessValueScoreTile**` (accent latéral emerald / sky / amber, icône, `Select` 1–5, barre de niveau) — même langage que la tuile ROE en synthèse (§11.2).
- **Objectifs & gains** : grille `**lg:grid-cols-2**`, encarts avec icônes `Target` / `TrendingUp`.
- **Indicateurs** : liste ordonnée numérotée (`**ol**` + pastille index) dans encart carte.

**Arbitrage financier (section D)** :

- `**CardDescription**` + zone **Enveloppe projet** (`**h4**` + badge) ; grille `**sm:grid-cols-2**` de tuiles `**FinancialAmountTile**` (coût rose / gain emerald, icône `Wallet` / `TrendingUp`, montant formaté EUR).
- Encart **ROI financier (lecture)** : accent emerald, `**Percent**`, valeur `fmtRoi` + hint contextuel (aligné tuile ROI section B).

**Risque & registre (section E)** :

- `**CardTitle**` + `**AlertTriangle**` ; **Synthèse de lecture** : grille 3 tuiles `**ProjectSheetMetaTile**` (niveau affiché, priorité portefeuille, risques critiques P×I).
- **Paramétrage fiche** : tuile select niveau + encart ambre **Réponse au risque** (`**textarea**`).
- Encart sky **Registre des risques** + CTA `**Ouvrir le registre**` (lien `projectRisks`).

**Référence** : RFC-PROJ-012, [docs/modules/projects-mvp.md](./modules/projects-mvp.md).

### 11.3 Détail projet — aperçu / synthèse (`ProjectSynthesisOverviewCards`)

Route : `/projects/[projectId]` (onglet **Synthèse** par défaut dans `ProjectWorkspaceTabs`). Composant racine : **`ProjectSynthesisOverviewCards`** (`features/projects/components/project-synthesis-overview-cards.tsx`).

**Ordre des blocs** (classe `.starium-proj-synthesis`) :

1. **`ProjectPostMortemOverviewBanner`** — uniquement si projet **`COMPLETED` \| `CANCELLED` \| `ARCHIVED`** ; bandeau accent ambre (`ProjectReviewsContextBanner`, variante `overview`) ; CTA prioritaire REX ; éditeur **`ProjectReviewEditorDialog`** ouvert depuis l’aperçu ; deep link `?openReview=<id>`.
2. Grille aperçu **2 lignes** (`.starium-proj-overview-grid`) :
   - **Ligne 1** — bandeau **`ProjectCommitteeMoodOverviewCard`** (météo du comité : dernière valeur connue, point source, lien points projet) ;
   - **Ligne 2** — **4 cartes** `.starium-ov-card` (jalon, équipe, indicateurs, dernière MAJ) dans `.starium-proj-overview-grid__core`.
3. **`ProjectPilotageAttentionPanel`** — si `project.warnings` non vide ; liste d’écarts avec libellés métier (`projectWarningLabel`), hints actionnables, lien fiche projet ; accent ambre ou rouge selon criticité.
4. **`ProjectSynthesisRecentData`**, **`ProjectBudgetSynthesis`** (`variant="overview"`).

**Points projet** (`?tab=points`) : **`ProjectReviewsTab`** — liste historique `starium-dt` ; bannière contextuelle pilotage (projet non clos) via `ProjectReviewsContextBanner` ; pas de bandeau REX (déplacé sur l’aperçu). Voir RFC-PROJ-013 §10.

**Référence** : RFC-PROJ-013, RFC-PROJ-010, [docs/modules/projects-mvp.md](./modules/projects-mvp.md).

### 11.4 Modales — norme Starium (`Dialog`)

**Norme détaillée (obligatoire)** : [docs/design-system/MODALES.md](./design-system/MODALES.md).

Implémentation : **`apps/web/src/components/ui/dialog.tsx`** (layout **`starium`** par défaut) et **`StariumModal`** (`apps/web/src/components/layout/form-dialog-shell.tsx`). Référence visuelle : maquette DS **Modal — Starium**.


| Élément | Pattern |
| ------- | ------- |
| **Layout** | **`layout="starium"`** (défaut). Exception : **`layout="legacy"`** (bottom-sheet) — interdit pour le neuf. **`sidePanel`** / **`chatWidget`** inchangés. |
| **Backdrop** | `bg-black/40`, léger flou ; `forceRender` pour dialogues imbriqués. |
| **Panneau** | Centré tous viewports, `bg-card`, `rounded-xl`, `max-h-[86vh]`, `p-0`, pas de blur vitré. Scroll dans **`DialogBody`** uniquement. |
| **Tailles** | **`size`** : `sm`, **`md`** (défaut, 520px), **`lg`** (560px), `xl`, `full`. |
| **Header** | `.starium-modal__header` : icône or (`DialogHeaderIcon`) + titres + croix **haut droite** (`.starium-modal__close`). |
| **Fermeture** | `showCloseButton` (défaut `true`) ; `aria-label="Fermer"`. |
| **Corps** | `.starium-modal__body` ; formulaires `.starium-form` + `.starium-form-*`. |
| **Statut** | `.starium-modal__status` — bandeau sous le header (icône + badge + hint ; variante riche dans l’éditeur point projet) |
| **Pied** | `.starium-modal__footer` : Annuler `outline` + primaire or, alignés à droite. |

#### 11.4.1 Modale Starium — gabarit obligatoire

| Zone | Pattern |
| ---- | ------- |
| **Composant rapide** | **`StariumModal`** si icône + titre + sous-titre + footer. |
| **Custom** | `Dialog` + `DialogContent` + `DialogHeader` / `DialogBody` / `DialogFooter`. |
| **Sections corps** | `.starium-modal-seg-title` entre blocs. |
| **États** | `LoadingState`, `EmptyState` (espacement via `cn()` — classes de base fusionnées avec `className`), `Alert` destructive. |

**Références** : `strategic-vision-edit-dialog.tsx`, `strategic-vision-workflow-dialog.tsx`, `dialog.spec.tsx`.

**Prompt nouvelle modale** : respecter `docs/design-system/MODALES.md` — `StariumModal` ou `Dialog*` starium, champs `starium-form-*`, pied Annuler + primaire.

**Prompt refactor** : migrer vers `MODALES.md` ; supprimer header legacy (`-mx-4 -mt-4`) ; ne pas changer l’API.

**Interdit** : `layout="legacy"` sur du neuf ; croix haut gauche ; inputs hors `.starium-form-*`.

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