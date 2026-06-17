# RFC-FE-MOB-001 — Fondations mobile-first transverses

> **Série `RFC-FE-MOB-*`** — numérotation dédiée au chantier mobile-first / by-design (juin 2026). Ce document et ses suites (`RFC-FE-MOB-002`, `RFC-FE-MOB-003`) sont les **fichiers sources** ; ils n’existaient pas avant cet audit.

## Statut

📝 Draft

## Priorité

Haute — Lot 0 (prérequis des lots suivants)

## Dépendances

- [RFC-014-1 — UX/UI et Design System de l’application](./RFC-014-1%20%E2%80%94%20UX-UI%20et%20Design%20System%20de%20l%E2%80%99application.md) (fichier existant)
- [RFC-014-2 — Login, bootstrap applicatif, navigation et affichage par rôle](./RFC-014-2%20%E2%80%94%20Login%2C%20bootstrap%20applicatif%2C%20navigation%20et%20affichage%20par%20r%C3%B4le.md) (fichier existant)
- [docs/FRONTEND_UI-UX.md](../FRONTEND_UI-UX.md) §1.1 (standards by design)
- [.cursor/rules/by-design-standards.mdc](../../.cursor/rules/by-design-standards.mdc)
- Audit mobile-first frontend (juin 2026) — constats sur `apps/web`

## Suite du programme (même lot documentaire)

- [RFC-FE-MOB-002 — DataTable responsive et listes denses](./RFC-FE-MOB-002%20%E2%80%94%20DataTable%20responsive%20et%20listes%20denses.md) — Lot 1
- [RFC-FE-MOB-003 — FilterBar, toolbars et plan de migration modules](./RFC-FE-MOB-003%20%E2%80%94%20FilterBar%2C%20toolbars%20et%20plan%20de%20migration%20modules.md) — Lots 1 à 4

---

# 1. Analyse de l'existant

## 1.1 Shell applicatif (déjà conforme en grande partie)

Le socle navigation est **déjà pensé mobile** :

| Composant | Fichier | État |
| --------- | ------- | ---- |
| App shell | `apps/web/src/components/shell/app-shell.tsx` | `100dvh`, gutter `px-4 sm:px-5`, `min-w-0` |
| Sidebar drawer | `apps/web/src/components/shell/sidebar.tsx` | Overlay `fixed inset-0`, `translate-x` mobile, `Escape`, `body overflow hidden` |
| Header workspace | `apps/web/src/components/shell/workspace-header.tsx` | Hamburger `md:hidden`, `aria-expanded` / `aria-controls`, layout colonne `sm:` |
| Client switcher | `apps/web/src/components/ClientSwitcher.tsx` | Largeur contrainte mobile |
| Page header pages | `apps/web/src/components/layout/page-header.tsx` | Actions en colonne puis ligne `sm:` |

**Hors scope Lot 0** : refonte du shell (déjà OK). Ce lot cible les **fondations UI transverses** qui impactent ~100 écrans sans les modifier un par un.

## 1.2 Problèmes identifiés (audit juin 2026)

### Modales (`DialogContent` modal centré)

Fichier : `apps/web/src/components/ui/dialog.tsx`

- Positionnement `top-1/2 -translate-y-1/2` **sans `max-height` ni `overflow-y`**.
- Formulaires longs (contrats, fournisseurs, risques EBIOS, revues projet…) **coupés** sur petits écrans (< 700px de hauteur utile).
- ~100 usages de `DialogContent` dans le repo.

Les variantes `sidePanel` et `chatWidget` sont déjà adaptées mobile ; seul le mode **modal centré** est concerné.

### `prefers-reduced-motion`

Fichier : `apps/web/src/app/globals.css`

- Règles locales uniquement (chat FAB, charts SVG).
- Animations Dialog (`animate-in`, `zoom`, `slide`) et sidebar (`transition-transform`) **non neutralisées** globalement.

### Cibles tactiles

Fichier : `apps/web/src/components/ui/button.tsx`

- Variantes `icon` = `size-8` (32×32 px), `icon-sm` = 28×28 px.
- By-design exige **≥ 44×44 px** pour les actions principales sur mobile.
- Impact : hamburger header, fermeture sidebar, actions icône dans toolbars.

### Titres de page

Fichier : `apps/web/src/components/layout/page-header.tsx`

- `h1` en `text-3xl` fixe → titres lourds et risque de débordement sur 320px.

---

# 2. Hypothèses éventuelles

- **H1** — Le bottom-sheet mobile pour les modales centrées n'entre pas en conflit avec les ~100 dialogs existants : aucun ne surcharge le positionnement `fixed top-1/2` du mode modal (vérification par grep sur `DialogContent className` avec classes de position).
- **H2** — Les modales très larges (`sm:max-w-lg`, `sm:max-w-2xl`…) restent compatibles avec `max-w-[calc(100%-2rem)]` mobile déjà en place.
- **H3** — Augmenter la taille tactile des boutons `icon` sur mobile (`min-h-11 min-w-11` sous `md`) n'altère pas significativement les layouts desktop.
- **H4** — Aucune modification backend ni Prisma n'est requise (RFC purement frontend).

---

# 3. Liste des fichiers à créer / modifier

| Fichier | Action |
| ------- | ------ |
| `apps/web/src/components/ui/dialog.tsx` | Modifier — modal mobile bottom-sheet + scroll interne |
| `apps/web/src/app/globals.css` | Modifier — règle globale `prefers-reduced-motion` |
| `apps/web/src/components/ui/button.tsx` | Modifier — cibles tactiles mobile variantes `icon*` |
| `apps/web/src/components/layout/page-header.tsx` | Modifier — titre responsive |
| `apps/web/src/components/ui/dialog.spec.tsx` | Créer — tests classes layout mobile/desktop |
| `apps/web/src/components/layout/page-header.spec.tsx` | Créer ou étendre — classes responsive titre |
| `docs/RFC/RFC-FE-MOB-001 — Fondations mobile-first transverses.md` | Ce document |
| `docs/RFC/_RFC Liste.md` | Mettre à jour — section mobile-first |

---

# 4. Implémentation complète

## 4.1 `DialogContent` — modal centré responsive

### Comportement cible

| Viewport | Layout modal centré |
| -------- | ------------------- |
| `< sm` (mobile) | **Bottom sheet** : ancré en bas, pleine largeur (`inset-x-0 bottom-0`), coins supérieurs arrondis (`rounded-t-2xl`), hauteur max `min(92dvh, …)`, contenu scrollable |
| `≥ sm` | Comportement actuel : centré `top-1/2`, `max-w-sm` par défaut (ou surcharge consommateur) |

### Classes proposées (`dialogContentModalClass`)

Remplacer la classe actuelle par une composition du type :

```text
/* commun */
fixed z-[81] grid w-full gap-4 border border-border/60 bg-background/95 text-sm shadow-lg outline-none

/* mobile : bottom sheet */
inset-x-0 bottom-0 max-h-[min(92dvh,100dvh-1rem)] translate-y-0 rounded-t-2xl border-b-0 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]
overflow-y-auto overscroll-contain

/* sm+ : modal centré */
sm:inset-x-auto sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:max-w-[calc(100%-2rem)] sm:max-h-[calc(100dvh-2rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:p-4 sm:pb-4
```

Conserver les animations existantes ; elles seront neutralisées par §4.2 si `prefers-reduced-motion`.

### Invariants

- `sidePanel` et `chatWidget` : **inchangés**.
- `DialogFooter` : déjà en `flex-col-reverse sm:flex-row` — compatible bottom sheet.
- Focus trap Radix/Base UI : inchangé.
- Fermeture `Escape` et clic overlay : inchangés.

## 4.2 `prefers-reduced-motion` global

Ajouter dans `globals.css` :

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

**Exception** : conserver les règles déjà présentes pour chat FAB / charts si un comportement « off » explicite est préférable (redondant avec la règle globale — acceptable).

## 4.3 Cibles tactiles — `Button`

Modifier les variantes `icon`, `icon-sm`, `icon-xs`, `icon-lg` :

```text
min-h-11 min-w-11 md:min-h-0 md:min-w-0
/* puis tailles existantes size-8, size-7, etc. à partir de md: */
md:size-8  (pour icon)
```

Alternative si régression visuelle : nouvelle variante `icon-touch` réservée au header/sidebar — **non retenue** par défaut (préférer le bump global mobile sur `icon*`).

## 4.4 `PageHeader` — titre responsive

```diff
- text-3xl font-bold
+ text-2xl font-bold sm:text-3xl
```

Conserver `min-w-0` et `truncate` sur les zones à risque de débordement (déjà en place sur le header workspace).

## 4.5 États de chargement bootstrap

Fichier : `apps/web/src/app/(protected)/layout.tsx`

Amélioration optionnelle Lot 0 : remplacer le `<p>Chargement…</p>` par `LoadingState` + `aria-live="polite"` — **recommandé** mais peut être décalé en Lot 0.1 si hors temps.

---

# 5. Modifications Prisma si nécessaire

Aucune.

---

# 6. Tests

## 6.1 Tests unitaires / composant

| Test | Assertion |
| ---- | --------- |
| `dialog.spec.tsx` | `DialogContent` mode modal inclut classes bottom-sheet sans `sidePanel` |
| `dialog.spec.tsx` | `sidePanel` / `chatWidget` n'incluent pas les classes bottom-sheet |
| `page-header.spec.tsx` | `h1` contient `text-2xl` et `sm:text-3xl` |

## 6.2 Tests manuels (checklist Lot 0)

- [ ] iPhone SE / 320px : ouvrir `contract-form-dialog`, `new-supplier-dialog`, `project-risk-ebios-dialog` — contenu entièrement scrollable, boutons footer accessibles.
- [ ] Android ~360px : même scénario.
- [ ] Desktop `≥ 1024px` : modales centrées inchangées visuellement.
- [ ] `prefers-reduced-motion: reduce` (DevTools) : pas d'animation perceptible sur dialog/sidebar.
- [ ] Hamburger + fermer menu : zone cliquable ≥ 44px sur mobile.
- [ ] Navigation clavier : Tab dans modale bottom-sheet, focus visible, `Escape` ferme.

## 6.3 Non-régression

- Chat drawer (`sidePanel`) et widget chat (`chatWidget`) : ouverture/fermeture OK.
- Modales en plein écran Gantt / fullscreen portal : inchangées (`useFullscreenPortalContainer`).

---

# 7. Récapitulatif final

Ce lot pose les **fondations transverses** mobile-first sur 4 fichiers UI centraux. Un seul PR débloque l'usage mobile des ~100 dialogs et aligne motion + tactile + titres sur les standards by-design, **sans migration module par module**.

Effort estimé : **0,5–1 jour** dev + 0,5 jour QA manuelle multi-viewports.

---

# 8. Points de vigilance

- Vérifier les dialogs qui passent `className` avec `max-h-*` ou `overflow-*` custom — ne pas doubler les conflits.
- Bottom sheet : prévoir `safe-area-inset-bottom` pour iPhone avec encoche/barre home.
- Ne pas réduire la taille desktop des boutons icône — le bump tactile est **mobile-only** (`md:` reset).
- Les tableaux denses et toolbars sont traités dans **RFC-FE-MOB-002** et **RFC-FE-MOB-003**.

---

# 9. Conformité by design

## RGPD

- Aucune collecte ni exposition de DCP supplémentaire.
- Les modales affichent des formulaires existants ; pas de changement de finalité.
- Logs inchangés.

## RGAA

- Bottom sheet : focus piégé dans la modale (comportement natif Base UI/Radix).
- Bouton fermer : `sr-only` « Fermer » déjà présent.
- `prefers-reduced-motion` : conformité WCAG 2.1 critère 2.3.3.
- Cibles tactiles ≥ 44px sur mobile : critère 2.5.5 (AAA visé, AA renforcé).
- États chargement bootstrap : prévoir `aria-live="polite"` (amélioration optionnelle §4.5).

## Design System

- Tokens existants (`border-border`, `bg-background`, `rounded-xl`) — pas de hex en dur.
- Réutilisation `Dialog`, `Button`, `PageHeader` — pas de nouveau composant modal parallèle.
- Cohérence avec `docs/FRONTEND_UI-UX.md` §1.1 (mobile).

## Sécurité

- Aucun impact authz, isolation client, ni surface API.
- Pas de nouveau vecteur XSS (pas de `dangerouslySetInnerHTML`).

## Interface mobile

- Bottom sheet plein écran sur `< sm` : conforme by-design §5 modales/drawers.
- Test obligatoire **320px** et **360px** avant merge Lot 0.
- Pas de dépendance au hover pour les actions dialog (touch-first).
