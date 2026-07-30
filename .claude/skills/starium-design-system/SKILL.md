---
name: starium-design-system
description: Design System Starium — tokens, classes .starium-*, composants imposés, patterns cockpit, RGAA et mobile-first. À utiliser pour TOUT travail UI dans apps/web (nouvel écran, nouveau composant, refonte visuelle, correction de style, revue d'un diff frontend), ou quand l'utilisateur parle de charte, tokens, KPI, tableau, filtres, couleurs, espacements, responsive ou accessibilité.
---

# Design System Starium — règles d'implémentation

Esthétique **Apple-inspired** (sobre, premium) + **signature dorée**. Audience CODIR/COMEX.
Baseline : *Révélez vos talents.*

## Sources de vérité (lire avant de coder si doute)

1. `docs/design-system/README.md` — charte, tokens, spécifications composants
2. `docs/FRONTEND_UI-UX.md` — patterns réels + extraits de code (§2.1 primitives, §6 KPI, §7 filtres, §8 tables, §11 compositions)
3. `docs/design-system/MODALES.md` — modales (voir aussi skill `starium-modales`)
4. `docs/INVENTAIRE-COMPOSANTS.md` — **ce qui existe déjà : consulter avant de créer**
5. Implémentation : `apps/web/src/styles/tokens.css`, `apps/web/src/app/globals.css`

---

## 1. Tokens — aucune valeur en dur

**Interdit** : `#3b82f6`, `margin: 13px`, `text-gray-500`, `bg-white`, `border-slate-200`.
**Obligatoire** : classes Tailwind mappées sur le thème (`bg-background`, `bg-card`, `bg-muted/30`,
`text-foreground`, `text-muted-foreground`, `border-border`) ou variables CSS `--brand-*` / `--ds-*`.

### Couleurs

| Token | Valeur | Usage |
|---|---|---|
| `--brand-gold` | `#E8A317` | Accent principal : CTA, nav active, courbe principale, icônes KPI |
| `--brand-gold-600` | `#CC8E0E` | Hover doré |
| `--brand-gold-700` | `#5F3F00` | Press / texte sur tint doré · couleur des liens |
| `--brand-gold-100` / `-050` | `#F4D58A` / `#FBEAB5` | Fonds d'icônes, badges actifs, surfaces claires |
| `--brand-ink` | `#0E0E10` | Texte primaire, sidebar, logo |
| `--neutral-50` | `#FAF9F7` | **Fond d'app — jamais blanc pur** |
| `--neutral-100` | `#F4F2EE` | Surface hover, skeleton |
| `--neutral-200` | `#E9E6E0` | Bordures, séparateurs |
| `--neutral-900` | `#14130F` | **Texte secondaire / muted** (`--color-text-muted`) |
| `--state-success` / `-bg` | `#1F8A5B` / `#E6F4ED` | Succès, terminé |
| `--state-warning` / `-bg` | `#C77A00` / `#FFF1DC` | Attention, à risque |
| `--state-danger` / `-bg` | `#B42318` / `#FBE8E6` | Danger, en retard |
| `--state-info` / `-bg` | `#2A6FDB` / `#E3EEFB` | Info, nouveau |

**Pièges fréquents**

- Texte secondaire → `text-muted-foreground` / `.starium-text-muted` (= `neutral-900`).
  **Ne jamais** utiliser `neutral-500` → `neutral-800` pour du corps de texte.
- Champs de saisie : valeur = `--color-input-text` (`text-foreground` sur `Input` / `Textarea` /
  `SelectTrigger`) ; placeholder / select vide = `--color-input-placeholder`. **Ne pas** laisser un
  input hériter `text-muted-foreground` d'une `Card` parente.
- Bordures : **jamais `border` seul** (Tailwind rend un trait quasi noir). Toujours `border-border`,
  `border-border/60`, `border-border/70`, `border-input`, `border-dashed border-border/80`.
  Sous-bloc dans une carte : `rounded-lg border border-border/70 bg-muted/30 p-4`.
- Texte de vigilance ambre : `font-semibold text-yellow-950 dark:text-amber-400` (lisible).
  Éviter `text-amber-300` / `text-amber-800` isolés sur `bg-muted/30`.

### Typographie

Famille unique **Manrope** (`--font-sans`), mono `JetBrains Mono`.
Échelle : `--text-display-xl|l|m`, `--text-h1..h4`, `--text-body`, `--text-body-s`,
`--text-caption`, `--text-overline`.

- Titres : `letter-spacing: -0.02em`
- Overlines : UPPERCASE + `letter-spacing: 0.08em` (`.starium-overline`, 11px)
- Chiffres de tableau / KPI : `tabular-nums`
- Body cockpit ≈ `0.875rem` ; texte courant `text-sm` / `text-xs` ; `h1` du `PageHeader`
  `text-xl font-bold sm:text-2xl`

### Espacement, rayons, ombres, motion

- Espacement base 4px (`--space-1..24`)
- Rayons : **cards `--radius-lg` (14px)** · **boutons/chips/segmented `--control-radius` (pilule)** ·
  inputs `--radius-md` (10px) · badges `--radius-pill` · **modales `--radius-xl` (20px)**
- Contrôles interactifs (boutons, chips, segmented, switch, tabs default) : tokens `--control-*`
  (`tokens.css`) — actif/CTA = encre (`--control-active-bg`) texte blanc, secondaires blancs bordés
- Ombres : `--shadow-1` (KPI) · `-2` (cards posées) · `-3` (popovers) · `-4` (modales) ·
  `--shadow-focus` (ring doré `0 0 0 3px rgba(232,163,23,0.32)`)
- Motion : `--duration-fast|base|slow` (120/200/320ms), `--ease-standard` (Apple-like),
  `--ease-emphasis` (modales/toasts). **Fade + translate 4–8px**, jamais de scale 0→1.

**Modifier la charte globalement** = éditer `tokens.css` / `globals.css`, **pas** les chaînes
Tailwind répétées dans chaque feature.

---

## 2. Primitives structurelles `.starium-*`

| Classe | Usage | Cadre ? |
|---|---|---|
| `.starium-module` | Groupe de page (titre + description + contenu) | **Non** — fond app visible |
| `.starium-kpi-card` (+ `--interactive`) | **Une** score card KPI | Oui (`shadow-1`, `radius-lg`) |
| `.starium-kpi-strip` (+ `-*`) | Bandeau KPI historique/CODIR (1 carte, 3 groupes) | Oui (un seul) |
| `.starium-section` | Bloc cartonné **unique** (vision, encart) | Oui |
| `.starium-panel` | Panneau données (liste + toolbar) sur une `Card` | Oui (un niveau) |
| `.starium-stack` | Empilement vertical de blocs (`--ds-stack-gap` 2rem) | — |
| `.starium-section-title` / `-subtitle` | `CardTitle` / `CardDescription` | — |
| `.starium-filter-bar` / `.starium-filter-chip` | Barre « Filtrer et trier » + chips pilule (`--active` encre, `--reset` atténué) | — |
| `.starium-tab-group` / `.starium-tab-btn` | Segmented control pilule (actif = encre) | — |
| `.starium-projects-table` (+ `-label-row`, `-filter-row`) | Tableau portefeuille dense | — |
| `.starium-table-footer` | Pied pagination de panneau liste | — |
| `.starium-overline` | Libellé uppercase 11px | — |
| `.starium-text-muted` | Texte secondaire lisible | — |
| `.starium-form` / `.starium-form-*` / `.starium-modal-seg-title` | Formulaires en modale | — |

### Règle anti « cadre dans cadre » (violation la plus fréquente)

```
❌  <Card><div grid>{KpiCard × 4}</div></Card>
❌  .starium-section > grille de .starium-kpi-card
✅  <section className="starium-module">  titre + actions
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{KpiCard variant="dense" × 4}</div>
    </section>
```

Réserver `.starium-section` / `.starium-panel` à **un seul** bloc (tableau, citation, formulaire).

---

## 3. Composants imposés — ne rien réinventer

| Besoin | Composant | Fichier |
|---|---|---|
| Chargement | `LoadingState` (`rows`) / `Skeleton` | `components/feedback/loading-state.tsx` |
| Vide | `EmptyState` (`title`, `description`, `action`) | `components/feedback/empty-state.tsx` |
| Erreur | `ErrorState` / `Alert variant="destructive"` + `AlertCircle` | `components/feedback/error-state.tsx`, `ui/alert.tsx` |
| Titre de page | `PageHeader` (carte blanche, eyebrow, actions responsives) | `components/layout/page-header.tsx` |
| Espacement page | `PageContainer` (`.starium-stack`) | `components/layout/page-container.tsx` |
| KPI | `KpiCard` (`variant="default" \| "dense"`, `iconWrapperClassName`), `BudgetKpiCard` | `components/ui/kpi-card.tsx` |
| Tableau | `Table` / `TableHeader` / … ; `StariumTableWrap` pour `starium-dt` | `components/ui/table.tsx` |
| Bouton icône | `Button size="icon*"` ou `IconButton` | `components/ui/icon-button.tsx` |
| Filtres liste | `FilterBar` + `FilterBarField` | `components/layout/filter-bar.tsx` |
| Modale | `StariumModal` | `components/layout/form-dialog-shell.tsx` |

Pas de markup ad hoc (`<p>Chargement…</p>`, div vides, table HTML brute) quand un composant existe.
**Avant de créer un composant : lire `docs/INVENTAIRE-COMPOSANTS.md`.**

### Base UI — pièges

- `Button` repose sur Base UI : la prop **`asChild` est ignorée**. Pour un lien stylé bouton :
  ```tsx
  <Link href="/projects/new" className={cn(buttonVariants({ variant: 'default', size: 'sm' }))}>
    Nouveau projet
  </Link>
  ```
- `Select` : si la valeur est une sentinelle technique (`__all__`), passer le **libellé en enfant** de
  `SelectValue` — sinon la clé brute s'affiche dans le trigger :
  ```tsx
  <SelectValue placeholder="Tous">{statusFilterLabel}</SelectValue>
  ```
- Plein écran : `Select` / `Tooltip` / `Dialog` doivent utiliser
  `useFullscreenPortalContainer()` (`hooks/use-fullscreen-portal-container.ts`), sinon les popups
  sortent du sous-arbre `:fullscreen`.

---

## 4. Patterns d'écran

### Composition d'une page cockpit

```
PageContainer (.starium-stack)
  PageHeader                       carte blanche ; actions icônes seules < md, libellés ≥ sm
  .starium-module + KpiCard dense  bandeau KPI (pas de Card parente)
  LoadingState / Alert erreur
  Card size="sm" .starium-panel    liste (transparente sur mobile : max-md:border-0 max-md:bg-transparent)
    FilterBar / toolbar embedded   hidden md:block
    CardContent (scroll + useTablePan) → table desktop | cartes mobile
    CardFooter .starium-table-footer → pagination
  ou Card + EmptyState
```

Le shell gère le padding horizontal (`starium-workspace-inner`) ; `PageContainer` n'ajoute que
l'espacement vertical. Pas de `max-w-7xl` centré : pleine largeur utile à droite de la sidebar.

### Tableaux

- Bordures **horizontales uniquement**, jamais verticales.
- **Max 8 colonnes** ; au-delà → drawer de détail ou bascule de densité (`basic` / `extended`).
- En-têtes en overline uppercase ; cellules `padding: 10px 14px`, ~13px ; hover row `--neutral-50`.
- Troncature + tooltip ; `tabular-nums` sur les numériques.
- **En-tête sticky** : si la carte a une hauteur bornée et un scroll vertical sur `CardContent`,
  utiliser `Table noWrapper` (sinon le wrapper `overflow-x-auto` intermédiaire casse le `sticky`).
- Grab/pan : `useTablePan` (`hooks/use-table-pan.ts`) — seuil ~6px, `shouldSuppressClick()` dans le
  `onClick` de ligne ; liens/boutons/champs ne déclenchent pas le pan.

### États obligatoires

Chaque écran de données expose **loading, error, empty, success** de façon explicite et annoncée
(`aria-live` pour le dynamique). Liste vide : `Card size="sm"` + `EmptyState` (`CardContent py-10`).

---

## 5. RGAA (WCAG 2.1 AA) — non négociable

- HTML sémantique avant tout : `button`, `nav`, `main`, `header`, `table`, `label`. Un seul `h1`,
  hiérarchie de titres cohérente.
- Clavier complet (Tab / Shift+Tab / Entrée / Échap / flèches), `focus-visible` toujours visible,
  jamais `outline: none` sans alternative, pièges de focus gérés dans les modales.
- ARIA seulement si le natif ne suffit pas. Privilégier les primitives Base UI (accessibles).
- Chaque champ a un `<label>` associé (pas seulement un placeholder) ; erreurs via `aria-invalid` +
  `aria-describedby`, explicites et jamais portées par la couleur seule.
- Contraste texte ≥ 4.5:1, UI/texte large ≥ 3:1.
- Icônes décoratives `aria-hidden` ; icônes porteuses de sens accompagnées d'un libellé accessible.
- Toasts / chargements / alertes via `aria-live` (`polite` / `assertive`).
- `prefers-reduced-motion` respecté ; `lang="fr"`.

## 6. Mobile-first — non négociable

- Concevoir petit écran d'abord, élargir via `sm md lg xl`. **Tester dès 320px.**
- Aucune largeur fixe en px sur les conteneurs ; pas de scroll horizontal involontaire.
- **Cibles tactiles ≥ 44×44px** (`min-h-11 sm:min-h-9`) ; pas d'interaction dépendant du hover seul.
- Tableaux denses : stratégie mobile obligatoire (cartes empilées, colonnes prioritaires ou scroll
  horizontal contrôlé et documenté).
- `FilterBar` : `grid-cols-1` par défaut, champs `w-full min-w-0` — **jamais** `min-w-[200px]` sur un
  contrôle ; actions `w-full sm:w-auto`.
- Modales : panneau **centré** Starium (pas bottom-sheet) — voir skill `starium-modales`.

---

## 7. Voix et copie

Français · **sentence case** partout · overlines UPPERCASE · vouvoiement · ton posé, expert, orienté
résultat, sans superlatif marketing. **Aucun emoji dans l'UI** (seule exception : `✦` U+2726 en
ornement de titre). Verbes : aligner, piloter, décider, arbitrer, révéler, sécuriser.
Chiffres : espace fine pour les milliers (`1 240`), `%` collé, `€` après, dates `15 mai 2024`.
Libellés métier partout — **jamais un UUID / CUID / entier visible** (select, table, badge, chip,
fil d'Ariane, résultat de recherche). Fil d'Ariane : `useWorkspaceBreadcrumbOverride({ entityLabel })`.

---

## 8. Interdits (récapitulatif)

| ✗ Interdit | ✓ À la place |
|---|---|
| Fond d'app blanc pur | `--neutral-50` (`#FAF9F7`) |
| Hex / px arbitraire dans une feature | Token ou classe thème |
| Classe `border` seule | `border-border`, `border-border/70`, `border-input` |
| `neutral-500`→`800` pour du corps de texte | `text-muted-foreground` / `.starium-text-muted` |
| Grille de KPI dans une `Card` | `.starium-module` + `KpiCard` |
| Gradient vif en arrière-plan | Fond uni + icône dorée |
| Gris froid (bleuté) | Neutres « papier » chauds |
| `border-left: 4px solid gold` comme accent générique | Fond teinté + icône colorée |
| Emoji dans l'UI | Icône Lucide |
| Title Case anglais | Sentence case français |
| Ombre teintée | Ombre noire faible opacité |
| Scale 0→1 | Fade + translate 4–8px |
| > 8 colonnes de tableau | Drawer de détail / densité |
| Bordures verticales de tableau | Horizontales uniquement |
| `asChild` sur `Button` | `Link` + `buttonVariants` |
| ID technique affiché | Libellé métier |

---

## 9. Vérification avant de rendre

- [ ] Aucune valeur en dur (couleur, espacement, rayon, ombre)
- [ ] Composants existants réutilisés (inventaire consulté)
- [ ] Pas de cadre dans cadre
- [ ] États loading / empty / error présents
- [ ] Clavier + focus visible + labels + contraste AA
- [ ] Rendu correct à 320px, cibles ≥ 44px
- [ ] Libellés métier uniquement
- [ ] `pnpm --filter @starium-orchestra/web typecheck` et, si modale, `pnpm audit:modals`
