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
- **Bordures / cadres** : ne jamais se contenter de la classe **`border`** seule — sans couleur explicite, Tailwind applique souvent une couleur de bordure **trop contrastée** (effet « noir » sur fond clair). Toujours combiner avec un token : **`border-border`**, **`border-border/60`**, **`border-border/70`**, **`border-input`** (champs), ou **`border-dashed border-border/80`** (zones vides). Les **`Card`** utilisent déjà `.starium-card` (`var(--starium-border)`). Pour un **sous-bloc** dans une carte (formulaire, encart), préférer par ex. `rounded-lg border border-border/70 bg-muted/30 p-4` — filet **gris** cohérent avec le reste de l’UI, pas un trait noir.
- **Cartes « synthèse »** (KPI, indicateurs, arbitrage) : pattern récurrent **`rounded-xl border bg-card p-4 shadow-sm`** avec **accent latéral** `border-l-[3px] border-l-…/70` (emerald, sky, violet, amber, etc.) + icône Lucide dans un carré **`rounded-lg bg-…/10`** — voir fiche projet **§11.2**.
- Structure : **pas de HTML “layout” bricolé** ; utiliser `components/ui/*`, `components/layout/*`, `components/feedback/*`, `components/shell/*`.
- Chaque écran de données : états **loading**, **error**, **empty**, **success** explicites.
- **Query keys** métier : toujours inclure `clientId` (voir architecture).
- **Texte de vigilance (ambre / jaune)** : pour signaler une donnée manquante ou une alerte non bloquante dans un bloc carte, privilégier un **contraste lisible** — par ex. **`font-semibold text-yellow-950 dark:text-amber-400`** (jaune très foncé en clair, ambre plus saturé en dark) ; variante **`font-medium text-amber-950 dark:text-amber-100`**. Éviter les combinaisons trop pâles seules (`text-amber-300`, `text-amber-800` isolés) sur fond `bg-muted/30` ou `bg-card`.

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

### 3.1 Sidebar — menus à panneau (Budgets, Projets)

- Implémentation : `apps/web/src/components/shell/sidebar.tsx` + `sidebar-dropdown.tsx` (`SidebarDropdown`, `SidebarDropdownLayer` — panneau fixe au survol du libellé parent).
- **Budgets** et **Projets** : pas de `href` sur l’entrée parente dans `config/navigation.ts` ; les cibles sont des sous-liens. Le parent reste filtré par `moduleCode` + `requiredPermissions` comme les autres entrées module.
- **Projets** : sous-entrées **Portefeuille projet** → `/projects`, **Option** → `/projects/options` (placeholder). Logique d’état actif par route (`pathname`) dans `sidebar.tsx` (même idée que pour Budgets : enfant actif si la route courante correspond au sous-lien ou à un préfixe métier).
- **Éviter** de dupliquer un panneau scroll : le contenu principal reste dans `<main>` ; le panneau latéral du dropdown est uniquement pour la navigation.

### 3.2 WorkspaceHeader — barre supérieure

- Fichier : `apps/web/src/components/shell/workspace-header.tsx`.
- **Contenu** : fil d’Ariane (Home → client actif avec indication e-mail identité par défaut si chargé → libellé de zone, ex. Dashboard), badge plateforme admin si applicable, **ClientSwitcher** (jeton d’accès), icônes d’action (recherche, document, calendrier, notifications — placeholders), menu utilisateur.
- **Menu compte** (`<details>` sur le résumé avatar) : liens **Compte** (`/account`) et **Déconnexion**. Fermeture au **clic extérieur** (`pointerdown` sur le document), à la touche **Escape**, et après navigation / déconnexion.
- **Avatar** : si le profil expose `hasAvatar` (voir `GET /me`), chargement de l’image via **`GET /api/me/avatar`** avec `Authorization: Bearer …`, affichage en blob URL (`object-cover` dans le cercle) ; sinon initiales (dont `PA` pour un admin plateforme). Après changement de photo sur la page Compte, `refreshProfile()` recharge le profil et l’avatar dans le header.

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

**Référence cockpit** : le portefeuille projets (`features/projects/components/projects-portfolio-kpi.tsx`) n’utilise **pas** `KpiCard` : c’est une **grille compacte** de trois bandeaux (Volume / Risques & échéances / Complétude) avec cellules `Stat` — voir **§6.1**. `KpiCard` `dense` reste le pattern pour d’autres écrans qui affichent des cartes KPI empilées.

### 6.1 Bloc KPI portefeuille (compact)

Implémentation actuelle : **pas de fond teinté** sur les trois bandeaux — **`border-border`**, **`bg-transparent`**, titres **`text-muted-foreground`**. Les **chiffres** sont sémantiques (tokens **§2**) : `text-primary` (volume / en cours), `text-emerald-600` (terminés), `text-yellow-800` / `dark:text-yellow-400` (retard, complétude), `text-destructive` (critiques, bloqués).

Variante optionnelle : bandeau avec fond **§9** (ambre) si besoin de signal sur toute la zone.

```tsx
// Bandeau neutre (défaut dans projects-portfolio-kpi)
<section
  className="min-w-0 rounded-lg border border-border bg-transparent px-3 py-2.5"
  aria-labelledby="projects-kpi-risks"
>
  <h2
    id="projects-kpi-risks"
    className="mb-1.5 border-b border-border/70 pb-1 text-[0.6rem] font-semibold uppercase tracking-wider text-muted-foreground"
  >
    Risques & échéances
  </h2>
  {/* grille de stats */}
</section>
```

---

## 7. Filtres — panneau (cockpit Projets)

Pattern **liste / cockpit** : une **`Card size="sm"`** avec en-tête (titre + description + **Réinitialiser**), puis sections séparées par un filet `h-px bg-border/70` :

1. **Recherche** — champ avec icône `Search` en préfixe, `max-w-lg`.
2. **Filtrer par** — grille responsive `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` : **Nature** (Tous / Projet / Activité, paramètre URL `kind`), **statut**, **priorité**, **criticité** ; labels `Label` + `Select` pleine largeur dans la colonne.
3. **Tri** — critère + ordre + case à cocher option (ex. « À risque ») dans un `label` bordé pour l’action booléenne.

Titres de section : petite ligne avec icône Lucide (`Search`, `Filter`, `ArrowDownWideNarrow`) + libellé en `text-xs font-semibold`, pas d’uppercase global sur tout le bloc.

Voir : `features/projects/components/projects-toolbar.tsx`.

---

## 8. Liste dans une `Card` + table

- En-tête : `CardHeader` + `CardTitle` / `CardDescription`.
- **Ne pas doubler** le conteneur scroll : le composant **`Table`** (`@/components/ui/table`) enveloppe déjà la balise `<table>` dans un `div` avec `overflow-x-auto` et `data-slot="table-container"`. Le **`CardContent`** peut donc être en **`p-0`** avec le composant liste **directement** en enfant (ex. `ProjectsListTable`).
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
    <CardDescription className="text-xs">Cliquez sur un nom pour ouvrir la fiche détail.</CardDescription>
  </CardHeader>
  <CardContent className="p-0">
    <ProjectsListTable items={items} />
  </CardContent>
  <CardFooter>{/* pagination */}</CardFooter>
</Card>
```

Tables : composants `Table`, `TableHeader`, `TableBody`, etc. depuis `@/components/ui/table`.

### 8.1 Liste projets — `ProjectsListTable`

Implémentation : `features/projects/components/projects-list-table.tsx`.

- **Colonnes** : Projet (nom, code mono, criticité, responsable), **Nature** (badge), **Santé** (`HealthBadge` avec prop **`compact`** : libellés courts Bon / Attention / Critique), **Statut**, **Avancement** (une colonne : manuel au-dessus, dérivé en dessous), **Échéance**, **T · R · J** (tâches ouvertes / risques ouverts / jalons en retard), **Signaux** (`ProjectPortfolioBadges` uniquement — pas de répétition textuelle des `warnings` sous les pastilles).
- **Largeur** : `min-w-[56rem]` sur la table pour scroll horizontal sur petits écrans.
- **Tooltips** : `TooltipProvider` (délai ~250 ms) ; en-têtes via **`HeaderTip`** (libellés avec soulignement pointillé + `cursor-help`) ; cellules **Nature**, **Avancement** et **T · R · J** via **`CellTip`** (Base UI : `TooltipTrigger` avec `render={<span … />}` comme ailleurs dans l’app).
- **Couleurs des chiffres** (KPI au-dessus de la liste, §6.1) : voir tonalités `text-primary`, `emerald`, `yellow`, `destructive` — documentées dans §6.1.

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
2. **`Card`** + bloc KPI portefeuille (**§6.1** — grille compacte `projects-portfolio-kpi`, pas `KpiCard`)
3. Toolbar filtres (panneau §7 — inclut filtre **Nature**)
4. `LoadingState` / **`Alert` erreur API** (§9) / **`Card` + `EmptyState`**
5. `Card` + tableau (**§8** / **§8.1**) + pagination

Route : `app/(protected)/projects/page.tsx`.  
Feature : `features/projects/` (hooks, `project-query-keys`, API).

### 11.1 Création projet (`/projects/new`)

- Grille **lg** : en-tête de page (retour + titre) en deux colonnes ; formulaire en **deux colonnes** (`lg:grid-cols-2`) — Identité à gauche, Classification + Planning à droite (bordure verticale légère entre colonnes).
- Lien **Retour au portefeuille** en `buttonVariants({ variant: 'ghost', size: 'sm' })` au-dessus du `PageHeader`.
- **`ProjectCreateForm`** : une **`Card`** avec en-tête descriptif, **`CardContent`** en sections (titres + icônes Lucide : identité, classification, planning), **Nature** (projet / activité), **code** optionnel (génération auto si vide), **responsable** (`GET /api/projects/assignable-users`, pas `GET /api/users` client-admin), **`textarea`** pour la description, **`CardFooter`** avec fond `bg-muted/20` : rappel (nom obligatoire ; code auto) + **Annuler** + **Créer le projet** (`Button` désactivé si nom vide).
- Absence de permission `projects.create` : **`Alert`** (pas seulement un paragraphe).

### 11.2 Détail projet — fiche décisionnelle (`ProjectSheetView`)

Route typique : `app/(protected)/projects/[projectId]/page.tsx` — composant **`ProjectSheetView`** (`features/projects/components/project-sheet-view.tsx`). Données via **`GET/PATCH /api/projects/:id/project-sheet`** (TanStack Query, autosave debounced) — pas de calcul ROI / priorité côté client (affichage des valeurs API).

**Structure UX (blocs successifs dans des `Card size="sm"`)** : sections étiquetées **A–H** (équipes, résumé & indicateurs, valeur métier, financier, risques, SWOT, TOWS, rétroplanning) ; titres **`CardTitle`** + séparateurs **`border-t border-border`** entre zones denses dans une même carte.

**Indicateurs de lecture** (sous-bloc dans la carte « Résumé ») :

- En-tête de zone : **`h4`** + **`Badge variant="secondary"`** (ex. libellé « Décision ») + paragraphe **`text-xs text-muted-foreground`** (max ~2 lignes).
- Grille **`grid gap-3 sm:grid-cols-2 xl:grid-cols-4`** : quatre cartes avec **bandeau gauche** coloré par axe (ROI, priorité portefeuille, ROE / scores, COPIL), icônes Lucide, **séparateur** `border-t border-border/60` avant le pied d’encart si besoin.
- Barres mini optionnelles pour les scores (ROE) : même fichier, composant local **`ScoreMiniBar`**.

**Arbitrage** (trois niveaux métier / comité / CODIR) :

- Même langage visuel : **`pt-8`**, titre **`h4`** + badge **« 3 niveaux »**, grille **`sm:grid-cols-3`**.
- Carte par niveau : **`rounded-xl p-4 shadow-sm`**, accent **`border-l-[3px]`** + fond léger selon **statut** (validé / refus / soumis à validation / en cours / brouillon) ; **badge « Verrouillé »** si le niveau précédent n’est pas validé ; **icônes** distinctes par niveau ; **séparateurs** `border-t border-border/50` avant statut, motif de refus ou message de lecture seule.

**Référence** : RFC-PROJ-012, [docs/modules/projects-mvp.md](./modules/projects-mvp.md).

---

## 12. Typographie (rappel)

- Body global ~`0.875rem` (cockpit dense) — voir `globals.css`.
- Texte courant : `text-sm` / `text-xs` ; titres de page : `text-2xl` sur le `h1` du `PageHeader`.

---

## 12.1 Compte — activation 2FA (dialog multi-étapes)

Implémentation : **`EnrollTwoFactorFlow`** dans `features/account/components/account-security-section.tsx` ; déclenché depuis la carte **Sécurité** de la page Compte (`/account`).

| Élément | Pattern |
|--------|---------|
| Conteneur | `Dialog` (Base UI) + **`DialogContent`** avec `max-h-[90vh] overflow-y-auto sm:max-w-lg` — évite le débordement sur petits écrans (QR + formulaire). |
| Fermeture | Bouton **X** en haut à droite (`showCloseButton` par défaut dans `components/ui/dialog.tsx`) ; libellé **assistif** `sr-only` : **« Fermer »** (pas « Close »). Focus trap / `FloatingFocusManager` : comportement natif du popup Base UI. |
| Étape 1 — QR | Titre `DialogTitle` explicite (ex. scanner Authenticator). QR centré dans un bloc **`rounded-lg border border-border bg-white p-2`** + `<img width={200} height={200} alt="QR code 2FA" />` (data URL API — `no-img-element` ESLint désactivé localement si besoin). |
| Secret TOTP | Ligne **`text-center text-xs text-muted-foreground`** : texte du type *Secret masqué : ••••••••XXXX* — **l’API ne renvoie pas le secret complet** (suffixe de vérification seulement) ; le secret intégral reste dans le QR. |
| Saisie | `Label` + `Input` `inputMode="numeric"`, `maxLength={6}`, placeholder type `123456`. |
| Actions | **`flex justify-end gap-2`** : **Annuler** (`variant="ghost"`, ferme le dialog) + **Activer** (submit, état *Vérification…* si pending). |
| Étape 2 — secours | Liste **`font-mono`** dans un encart `rounded-md border bg-muted/40 p-3` ; CTA **J’ai noté les codes** pleine largeur. |

**À ne pas faire** : dupliquer un second titre « Close » visible — le seul libellé anglais acceptable était l’ancien `sr-only` sur l’icône ; il doit être en **français** pour cohérence produit.

### 12.2 Modale — responsable projet (création `/projects/new`)

Implémentation : **`ProjectCreateForm`** — ouverture depuis le résumé + bouton **Définir / Modifier** (`features/projects/components/project-create-form.tsx`).

| Élément | Pattern |
|--------|---------|
| Largeur | **`max-w-lg`** (≈ 32 rem) + `w-full` — **pas** de modale 90 % de l’écran pour un formulaire court (lisibilité, focus). |
| En-tête | `DialogTitle` **lisible** (`text-lg font-semibold`) + `DialogDescription` **une phrase** (pas de jargon produit inutile). |
| Onglets | `TabsList` **`variant="line"`** + soulignement actif (Base UI) ; libellés métier : **Compte client** / **Nom libre**. |
| Panneau « compte » | Bloc **`rounded-xl border border-border/70 bg-card p-4 shadow-sm`** (§2) ; **`Label`** explicite au-dessus du `Select` ; aide **`text-xs text-muted-foreground`** avec `aria-describedby`. |
| Erreur chargement | **`Alert` `variant="destructive"`** + `AlertCircle` (§9) — jamais seulement un paragraphe rouge nu. |
| Panneau « nom libre » | Encart **`border-l-[3px] border-l-sky-500/55`** + icône **`Users`** dans un carré `rounded-lg bg-sky-500/10` (aligné §11.2 / accent latéral) ; texte court, pas de **50 %** de largeur qui casse la lecture. |
| Pied | `DialogFooter` + **Terminé** (`type="button"`) — ne pas soumettre le formulaire parent. |

### 12.3 Modale — catalogue Personne (équipe projet & création projet)

Composant partagé : **`PersonCatalogPickerDialog`** (`features/projects/components/person-catalog-picker-dialog.tsx`) — tableau filtrable, création **Nouvelle personne**, `Alert` catalogue, `LoadingState` / `EmptyState`. Filtre recherche : `personResourceMatchesSearch` dans `features/projects/lib/person-resource-search.ts`.

**Usages** :

- **Équipe projet** : **`ProjectTeamMatrix`** — `footerVariant="confirm-and-close"` (Fermer + **Ajouter**), `filterFetchedResources` pour exclure les emails déjà sur le rôle, `queryKey` inclut `clientId`.
- **Création projet** : **`ProjectCreateForm`** — `footerVariant="done-only"` (**Terminé**), `allowEmpty` + libellé « Aucun responsable », `dialogContentClassName` en `sm:max-w-lg` (formulaire court, §12.2).

| Élément | Pattern |
|--------|---------|
| Largeur | **`sm:max-w-5xl`** + `max-h-[min(90vh,800px)] overflow-y-auto` — tableau multi-colonnes (liste cockpit, pas formulaire court seul). |
| En-tête | Comme §12.2 : `DialogTitle` `text-lg font-semibold tracking-tight` + `DialogDescription` courte ; **`showCloseButton`**. |
| Erreur catalogue | **`Alert`** avec icône : `Info` + ambre pour **403** (§9), `AlertCircle` + `destructive` pour **5xx/404** ; message secondaire permission `resources.read` si 403. |
| Bloc liste | Encart **`rounded-xl border border-border/70 bg-card p-4 shadow-sm`** (§2) ; aide **`text-xs`** + `aria-describedby` sur le champ filtre. |
| Tableau | **`Table`** avec **`min-w-[56rem]`** (§8.1 — scroll horizontal) ; zone **`max-h` + `overflow-auto`** + bordure **`border-border/60`** sur le conteneur scroll (évite double scroll inutile avec le shell `Table`). |
| États | **`LoadingState`** (§10) ; vide : **`EmptyState`** dans l’encart. |
| Pied | **`DialogFooter`** — **Fermer** + **Ajouter** (pas de submit parent). |

---

## 12.4 Page Ressources (`/resources`)

Implémentation : `app/(protected)/resources/page.tsx`.

- **Structure** : `PageHeader` + panneau filtres (recherche / type / pagination) + états `LoadingState` / `Alert` / `EmptyState`.
- **Liste** : pattern **`Card size="sm"`** + `CardHeader` (titre + description), `CardContent className="p-0"` et composant **`Table`** (`@/components/ui/table`) ; éviter une table HTML brute.
- **Largeur table** : `min-w-[56rem]` pour préserver la lisibilité des colonnes (`Nom`, `Type`, `Portée`, `Société`, `Rôle métier`) avec scroll horizontal géré par `Table`.
- **Pagination** : dans `CardFooter`, avec résumé `x–y sur total` et actions précédente/suivante.
- **Édition** : le nom de ressource est un bouton textuel (`text-primary hover:underline`) uniquement si `resources.update`.
- **Tokens** : pas de `border-white/*` sur cette liste ; utiliser les tokens de surface/bordure (`border-border/60`, `bg-card`, `text-muted-foreground`).

---

## 13. Liens utiles

| Sujet | Document |
|--------|-----------|
| Architecture complète | [FRONTEND_ARCHITECTURE.md](./FRONTEND_ARCHITECTURE.md) |
| Module Projets (structure, query keys) | §30.6 dans FRONTEND_ARCHITECTURE.md |
| Budget frontend | [docs/modules/budget-frontend.md](./modules/budget-frontend.md) |
| Fiche projet décisionnelle (RFC-PROJ-012) | [docs/modules/projects-mvp.md](./modules/projects-mvp.md), [RFC-PROJ-012 — Project Sheet.md](./RFC/RFC-PROJ-012%20%E2%80%94%20Project%20Sheet.md) |

---

*Dernière mise à jour : §12.4 page `Ressources` (liste en `Card` + `Table`) ; §12.3 `PersonCatalogPickerDialog` (équipe + création projet) ; §12.2 modale responsable projet (historique onglets — remplacé par tableau partagé) ; §12.1 2FA ; `dialog.tsx` (Fermer) ; sidebar §3.1 ; fiche projet §11.2 ; cockpit Projets §6.1 / §7 / §8.1 / §11.1.*
