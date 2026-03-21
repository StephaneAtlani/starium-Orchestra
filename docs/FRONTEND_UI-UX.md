# FRONTEND_UI-UX — Guide UI/UX & extraits de code

Ce document **complète** [FRONTEND_ARCHITECTURE.md](./FRONTEND_ARCHITECTURE.md) (routing, multi-client, données). Ici : **patterns visuels**, **composants obligatoires** et **extraits de code** alignés sur l’implémentation actuelle dans `apps/web`.

---

## 1. Stack UI

| Couche | Choix |
|--------|--------|
| Framework | Next.js App Router |
| Styles | Tailwind CSS v4 (`globals.css`, `@theme inline`) |
| Composants | shadcn / base-nova (`@base-ui/react`) |
| Icônes | `lucide-react` |
| État serveur | TanStack Query |

Fichiers clés : `apps/web/src/app/globals.css`, `apps/web/src/styles/tokens.css`.

---

## 2. Règles express

- Couleurs : **tokens** (`bg-background`, `text-muted-foreground`, `border-border`, `bg-card`, etc.) — pas d’hex arbitraires dans les pages.
- Structure : **pas de HTML “layout” bricolé** ; utiliser `components/ui/*`, `components/layout/*`, `components/feedback/*`, `components/shell/*`.
- Chaque écran de données : états **loading**, **error**, **empty**, **success** explicites.
- **Query keys** métier : toujours inclure `clientId` (voir architecture).

---

## 3. App Shell — largeur de contenu

Le shell aligne le header et le contenu sur la même grille.

```tsx
// apps/web/src/components/shell/app-shell.tsx (extrait)
const CONTENT_WRAPPER = 'mx-auto w-full max-w-7xl px-6 sm:px-8';

// …
<WorkspaceHeader contentClassName={CONTENT_WRAPPER} />
<main className="starium-main min-h-0 flex-1 overflow-auto">
  <div className={`${CONTENT_WRAPPER} py-6 sm:py-8`}>{children}</div>
</main>
```

**PageContainer** n’ajoute que l’espacement vertical entre blocs ; le padding horizontal vient du shell.

```tsx
// apps/web/src/components/layout/page-container.tsx
export function PageContainer({ children, className }: PageContainerProps) {
  return <div className={className ?? 'space-y-6'}>{children}</div>;
}
```

---

## 4. En-tête de page

Titres en **tokens** sémantiques (pas de `#1B1B1B`).

```tsx
// apps/web/src/components/layout/page-header.tsx
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
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

`Button` repose sur **Base UI** : la prop **`asChild` (habitude Radix/shadcn) ne doit pas être passée au DOM**. Elle est **consommée** dans le wrapper et ignorée pour le rendu.

Pour un **lien** avec l’apparence d’un bouton, utiliser **`Link` + `buttonVariants`** :

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

---

## 6. KPI — `KpiCard`

- **`variant="default"`** : carte “hero” (dashboard, gros chiffre).
- **`variant="dense"`** : grilles cockpit (plusieurs KPI, portefeuille projets).

```tsx
// apps/web/src/components/ui/kpi-card.tsx (structure)
export function KpiCard({
  title,
  value,
  subtitle,
  trend,
  icon,
  variant = 'default',
}: KpiCardProps) {
  const dense = variant === 'dense';
  return (
    <Card
      className={cn(
        'flex flex-col transition-shadow hover:shadow-md',
        dense ? 'gap-1.5 p-3 shadow-sm' : 'gap-2 p-5',
      )}
    >
      {/* titre + icône, valeur tabular-nums, subtitle, trend */}
    </Card>
  );
}
```

Exemple d’usage dense avec icône :

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

**Référence cockpit** : `features/projects/components/projects-portfolio-kpi.tsx` — les trois sections sont enveloppées dans une **`Card size="sm"`** avec en-tête « Indicateurs portefeuille » (FRONTEND_UI-UX : hiérarchie cockpit).

---

## 7. Filtres — panneau (cockpit Projets)

Pattern **liste / cockpit** : une **`Card size="sm"`** avec en-tête (titre + description + **Réinitialiser**), puis sections séparées par un filet `h-px bg-border/70` :

1. **Recherche** — champ avec icône `Search` en préfixe, `max-w-lg`.
2. **Filtrer par** — grille responsive `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` (statut, priorité, criticité), labels `Label` + `Select` pleine largeur dans la colonne.
3. **Tri** — critère + ordre + case à cocher option (ex. « À risque ») dans un `label` bordé pour l’action booléenne.

Titres de section : petite ligne avec icône Lucide (`Search`, `Filter`, `ArrowDownWideNarrow`) + libellé en `text-xs font-semibold`, pas d’uppercase global sur tout le bloc.

Voir : `features/projects/components/projects-toolbar.tsx`.

---

## 8. Liste dans une `Card` + table

- En-tête : `CardHeader` + `CardTitle` / `CardDescription`.
- Table scrollable : `CardContent` + conteneur `data-slot="table-container"` + `overflow-x-auto`.
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

<Card size="sm" className="overflow-hidden shadow-sm">
  <CardHeader className="border-b border-border/60 pb-3">
    <CardTitle className="text-sm font-medium">Liste des projets</CardTitle>
    <CardDescription>Description courte pour l’utilisateur.</CardDescription>
  </CardHeader>
  <CardContent className="px-0 pb-0 pt-0">
    <div data-slot="table-container" className="overflow-x-auto">
      <Table>{/* … */}</Table>
    </div>
  </CardContent>
  <CardFooter>{/* pagination */}</CardFooter>
</Card>
```

Tables : composants `Table`, `TableHeader`, `TableBody`, etc. depuis `@/components/ui/table`.

---

## 9. Alertes erreur / avertissement

Utiliser **`Alert`**, **`AlertTitle`**, **`AlertDescription`** (`components/ui/alert.tsx`) plutôt qu’un `div` + bordures ad hoc.

* **Erreur bloquante** (API, permissions) : `variant="destructive"` + icône `AlertCircle` (Lucide) en premier enfant.
* **Avertissement** (ex. permission métier manquante) : `Alert` en `default` avec `className` type `border-amber-500/35 bg-amber-500/5` + `AlertTriangle`, titres en `text-amber-950` / mode sombre explicite.

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

Liste vide : préférer une **`Card size="sm"`** autour de `EmptyState` (`CardContent` avec `py-10`) pour aligner la zone vide sur les autres surfaces (cockpit Projets).

---

## 11. Composition type — page cockpit Projets

Ordre recommandé dans `PageContainer` :

1. `PageHeader` (titre, description, actions)
2. **`Card`** + bloc KPI (`KpiCard` dense + sections §6)
3. Toolbar filtres (panneau §7)
4. `LoadingState` / **`Alert` erreur API** (§9) / **`Card` + `EmptyState`**
5. `Card` + tableau + pagination

Route : `app/(protected)/projects/page.tsx`.  
Feature : `features/projects/` (hooks, `project-query-keys`, API).

### 11.1 Création projet (`/projects/new`)

- Lien **Retour au portefeuille** en `buttonVariants({ variant: 'ghost', size: 'sm' })` au-dessus du `PageHeader`.
- **`ProjectCreateForm`** : une **`Card`** avec en-tête descriptif, **`CardContent`** découpé en sections (titres + icônes Lucide : identité, classification, planning), **`textarea`** pour la description (styles alignés sur `Input`), **`CardFooter`** avec fond `bg-muted/20` : rappel champs obligatoires + **Annuler** (`Link` + `buttonVariants` outline) et **Créer le projet** (`Button` désactivé si nom/code vides).
- Absence de permission `projects.create` : **`Alert`** (pas seulement un paragraphe).

---

## 12. Typographie (rappel)

- Body global ~`0.875rem` (cockpit dense) — voir `globals.css`.
- Texte courant : `text-sm` / `text-xs` ; titres de page : `text-2xl` sur le `h1` du `PageHeader`.

---

## 13. Liens utiles

| Sujet | Document |
|--------|-----------|
| Architecture complète | [FRONTEND_ARCHITECTURE.md](./FRONTEND_ARCHITECTURE.md) |
| Module Projets (structure, query keys) | §30.6 dans FRONTEND_ARCHITECTURE.md |
| Budget frontend | [docs/modules/budget-frontend.md](./modules/budget-frontend.md) |

---

*Dernière mise à jour : alignée sur `apps/web` (App Shell, PageHeader, Button, KpiCard, cockpit Projets).*
