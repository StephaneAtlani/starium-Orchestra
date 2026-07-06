# RFC-FE-MOB-001 — Fondations mobile-first transverses

> **Série `RFC-FE-MOB-*`** — numérotation dédiée au chantier mobile-first / by-design (juin 2026). Ce document et ses suites (`RFC-FE-MOB-002`, `RFC-FE-MOB-003`) sont les **fichiers sources** ; ils n’existaient pas avant cet audit.

## Statut

✅ Implémenté — juin 2026 (`Dialog` bottom-sheet / `size` / `DialogBody`, `Button` / `IconButton`, `PageHeader`, `prefers-reduced-motion`, tests composant §6.1).

## Référence Design System

Guide UI détaillé : [docs/FRONTEND_UI-UX.md](../FRONTEND_UI-UX.md) §1.1, §11.3, §11.3.1, §12 et sous-section « États UI ».

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
| Header workspace | `apps/web/src/components/shell/workspace-header.tsx` | Topbar 64px desktop ; barre mobile ink ; fil d’Ariane + recherche + notifications + menu compte |
| Client switcher | `apps/web/src/components/ClientSwitcher.tsx` | Dans le menu compte (section Organisation), pas dans la topbar ; largeur pleine dans le panneau dropdown |
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

- ~~`h1` en `text-3xl` fixe~~ → corrigé : **`text-2xl`** (DS §12).

---

## 1.3 Problèmes résolus par le Lot 0 (juin 2026)

Les constats §1.2 sont adressés par l’implémentation §4 : bottom-sheet + `DialogBody`, `prefers-reduced-motion` global, `Button`/`IconButton` 44 px mobile, `PageHeader` `text-2xl`. Migration des modales legacy et QA manuelle §6.2 restent en cours.

# 2. Hypothèses éventuelles

- **H1** — Le bottom-sheet mobile pour les modales centrées n'entre pas en conflit avec les ~100 dialogs existants : aucun ne surcharge le positionnement `fixed top-1/2` du mode modal (vérification par grep sur `DialogContent className` avec classes de position).
- **H2** — Les modales très larges (`sm:max-w-lg`, `sm:max-w-2xl`…) restent compatibles avec `max-w-[calc(100%-2rem)]` mobile déjà en place.
- **H3** — Cibles tactiles `icon*` : `h-11 w-11` mobile + `md:size-*` desktop — validé en tests ; desktop inchangé visuellement.
- **H4** — Aucune modification backend ni Prisma n'est requise (RFC purement frontend).

---

# 3. Liste des fichiers créés / modifiés

| Fichier | Action |
| ------- | ------ |
| `apps/web/src/components/ui/dialog.tsx` | Normaliser — bottom-sheet mobile, prop `size`, `DialogBody`, scroll unique |
| `apps/web/src/components/ui/icon-button.tsx` | **Créer** — wrapper sémantique sur `Button` |
| `apps/web/src/components/ui/button.tsx` | Normaliser variants `icon*` (`h-11 w-11` mobile, `md:size-*` desktop) |
| `apps/web/src/components/layout/page-header.tsx` | `text-2xl` strict (DS §12) |
| `apps/web/src/app/globals.css` | Règle globale `prefers-reduced-motion` |
| `apps/web/src/components/ui/dialog.spec.tsx` | **Créer** — modal / sidePanel / chatWidget / size / twMerge |
| `apps/web/src/components/ui/icon-button.spec.tsx` | **Créer** — variants icon + `IconButton` |
| `apps/web/src/components/layout/page-header.spec.tsx` | **Créer** — `text-2xl` |
| `docs/FRONTEND_UI-UX.md` | §11.3, états UI obligatoires |
| `docs/RFC/_RFC Liste.md` | Section mobile-first |
| `apps/web/src/app/(protected)/layout.tsx` | **Hors scope Lot 0** — bootstrap `LoadingState` (optionnel) |

---

# 4. Implémentation (état livré)

## 4.1 `Dialog` — socle normalisé

Fichier : `apps/web/src/components/ui/dialog.tsx`.

### Variants de layout

| Variant | Prop | État |
| ------- | ---- | ---- |
| Modal (défaut) | — | Bottom-sheet `< sm`, centré `sm+`, prop **`size`** |
| Side panel | `sidePanel` | **Inchangé** |
| Chat widget | `chatWidget` | **Inchangé** |

### Prop `size` (modal uniquement)

| `size` | Desktop (`sm+`) |
| ------ | --------------- |
| `sm` (défaut) | `sm:max-w-sm` |
| `md` | `sm:max-w-md` |
| `lg` | `sm:max-w-lg` |
| `xl` | `sm:max-w-4xl` |
| `full` | `sm:max-w-[calc(100%_-_2rem)]` |

`className` consommateur fusionné en dernier via `cn(..., className)` / `tailwind-merge` — surcharge `size` et overflow legacy.

### Stratégie de scroll

| Composant | Rôle |
| --------- | ---- |
| `DialogContent` (modal) | Conteneur `flex flex-col`, `overflow-x-hidden overflow-y-hidden`, `max-h` socle — **pas de scroll** |
| `DialogHeader` | `shrink-0` — bandeau stable |
| **`DialogBody`** (nouveau) | **Seule zone scrollable** : `flex-1 min-h-0 overflow-y-auto overscroll-contain` |
| `DialogFooter` | `shrink-0` — pied stable |

Structure cible des **nouvelles** modales :

```tsx
<DialogContent size="xl">
  <DialogHeader>...</DialogHeader>
  <DialogBody>...</DialogBody>
  <DialogFooter>...</DialogFooter>
</DialogContent>
```

### Compatibilité modales legacy (~100 usages)

Modales sans `DialogBody` : `className="overflow-y-auto"` sur `DialogContent` **surcharge** `overflow-y-hidden` du socle (`tailwind-merge`). Pas de migration module par module en Lot 0.

### Classes socle modal (extrait)

- Mobile : `inset-x-0 bottom-0`, `rounded-t-2xl`, `max-h-[min(92dvh,calc(100dvh_-_1rem))]`, `pb-[max(1rem,env(safe-area-inset-bottom))]`
- Desktop : `sm:top-1/2`, `sm:w-[calc(100%_-_2rem)]`, `sm:max-h-[calc(100dvh_-_2rem)]`, `sm:rounded-xl`
- Tokens §11.3 conservés ; animations neutralisées si `prefers-reduced-motion` (§4.2)

## 4.2 `prefers-reduced-motion` global

Ajout en fin de `apps/web/src/app/globals.css` — règle `*` / `::before` / `::after` (durées animation/transition → `0.01ms`, `scroll-behavior: auto`). Règles locales chat FAB / charts conservées (redondantes).

## 4.3 `Button` et `IconButton`

Fichiers : `button.tsx`, `icon-button.tsx`.

Variants `icon`, `icon-sm`, `icon-xs`, `icon-lg` :

- Mobile : **`h-11 w-11`** (cible 44 px réelle)
- Desktop : **`md:size-8`**, `md:size-7`, `md:size-6`, `md:size-9` (rendu inchangé)

`IconButton` : alias sémantique déléguant à `Button` ; `aria-label` obligatoire.

## 4.4 `PageHeader`

Fichier : `page-header.tsx`.

- `text-3xl` → **`text-2xl`** strict — arbitrage [FRONTEND_UI-UX.md](../FRONTEND_UI-UX.md) **§12** (pas de `sm:text-3xl`).
- `PageHeader` = seule source de vérité pour les titres de page cockpit.

## 4.5 Bootstrap loading (hors scope Lot 0)

Fichier : `apps/web/src/app/(protected)/layout.tsx` — remplacement `<p>Chargement…</p>` par `LoadingState` + `aria-live="polite"` : **non livré** ; report Lot 0.1 si besoin.

---

# 5. Modifications Prisma si nécessaire

Aucune.

---

# 6. Tests

## 6.1 Tests unitaires / composant (livré)

| Fichier | Couverture |
| ------- | ---------- |
| `dialog.spec.tsx` | Modal bottom-sheet ; `flex flex-col` + `overflow-x-hidden overflow-y-hidden` ; `DialogBody` scroll ; `sidePanel` / `chatWidget` inchangés ; `size` sm/md/xl/full ; twMerge `max-w` et `overflow-y-auto` legacy |
| `icon-button.spec.tsx` | Variants `icon*` mobile/desktop ; `IconButton` + `aria-label` |
| `page-header.spec.tsx` | `h1` en `text-2xl` ; absence `text-3xl` / `sm:text-3xl` |

Commande : `npx vitest run src/components/ui/dialog.spec.tsx src/components/ui/icon-button.spec.tsx src/components/layout/page-header.spec.tsx`

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

Socle UI transversal mobile-first livré sur **Dialog** (bottom-sheet, `size`, `DialogBody`), **Button** / **IconButton**, **PageHeader**, **motion** globale et **tests** composant. Un PR débloque l’usage mobile des ~100 dialogs via compatibilité `className` legacy, **sans migration module par module**.

**Hors scope Lot 0** : migration modales vers `DialogBody`, bootstrap `LoadingState`, checklist QA manuelle §6.2.

**Prochaines étapes** (hors scope livré) : migration progressive modales legacy vers `DialogBody` ; QA manuelle §6.2 ; E2E viewport mobile optionnel.

---

# 8. Points de vigilance

- Modales legacy sans `DialogBody` ni `overflow-y-auto` en `className` : risque de contenu non scrollable — migration progressive vers `DialogBody` ou ajout `className="overflow-y-auto"`.
- `tailwind-merge` : `className` consommateur doit rester **en dernier** dans `cn(dialogContentModalClass, sizeClass, className)`.
- Modales avec `overflow-hidden` ou layouts `flex-col` internes en `className` : comportement inchangé (dernière classe gagne).
- Bottom sheet : `safe-area-inset-bottom` sur mobile ; smoke-test `contract-form-dialog`, `project-risk-ebios-dialog`, `new-supplier-dialog` avant merge.
- Tableaux denses et toolbars : **RFC-FE-MOB-002** et **RFC-FE-MOB-003**.

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
- Réutilisation / extension : `Dialog` (+ `DialogBody`), `Button`, `IconButton`, `PageHeader` — pas de composant modal métier parallèle.
- États UI : `LoadingState`, `EmptyState`, `ErrorState`, `Alert` — voir [FRONTEND_UI-UX.md](../FRONTEND_UI-UX.md) §1.1.

## Sécurité

- Aucun impact authz, isolation client, ni surface API.
- Pas de nouveau vecteur XSS (pas de `dangerouslySetInnerHTML`).

## Interface mobile

- Bottom sheet plein écran sur `< sm` : conforme by-design §5 modales/drawers.
- Test obligatoire **320px** et **360px** avant merge Lot 0.
- Pas de dépendance au hover pour les actions dialog (touch-first).
