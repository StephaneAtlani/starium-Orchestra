---
name: starium-modales
description: Norme graphique obligatoire des modales Starium Orchestra (StariumModal, Dialog*, champs .starium-form-*). À utiliser dès qu'il s'agit de créer, modifier, refactorer ou relire une modale, un dialog, un drawer, un side panel, un bottom sheet, un picker ou une confirmation dans apps/web — y compris les fichiers *dialog*.tsx, *modal*.tsx, components/ui/dialog.tsx et components/layout/form-dialog-shell.tsx.
---

# Modales Starium — norme obligatoire

Référence : `docs/design-system/MODALES.md` + `docs/FRONTEND_UI-UX.md` §11.4.
Le rendu doit être **identique d'un écran à l'autre** : même voile, même panneau, même header, même
pied, mêmes champs.

## 1. Quoi utiliser

| Besoin | Composant |
|---|---|
| **Toute modale applicative** (formulaire, liste, confirmation, picker, chat, nav mobile) | **`StariumModal`** — `components/layout/form-dialog-shell.tsx` |
| Contenu atypique sans header Starium (palette de recherche, nav mobile) | `StariumModal` **`headless`** |
| Widget chat flottant | `StariumModal` **`chatWidget`** + `headless` |
| Tiroir latéral | `StariumModal` **`sidePanel`** |
| Socle bas niveau | primitives `Dialog*` (`components/ui/dialog.tsx`) — **ne pas importer dans une feature** |

> ~100 modales de l'app passent par `StariumModal`. `DialogContent` n'est utilisé que dans
> `form-dialog-shell.tsx` et `dialog.tsx`.

## 2. Anatomie (layout `starium`, défaut)

```
┌─────────────────────────────────────────────┐
│ [icône or]  Titre                      [×]  │  DialogHeader  .starium-modal__header
│             Sous-titre court                │
├─────────────────────────────────────────────┤
│  Corps scrollable                           │  DialogBody    .starium-modal__body
│  (.starium-form, .starium-modal-seg-title)  │
├─────────────────────────────────────────────┤
│                    [Annuler]  [Action or]   │  DialogFooter  .starium-modal__footer
└─────────────────────────────────────────────┘
```

- **Voile** : `bg-black/40`, léger flou, clic = fermer.
- **Panneau** : centré **tous viewports**, `bg-card`, `rounded-xl`, `max-h-[86vh]`, `p-0`,
  **pas de glass/blur**. Scroll **uniquement** dans `DialogBody`.
- **Icône** : 38×38, `rounded-[10px]`, fond `--brand-gold-050`, icône Lucide 18px.
- **Croix** : **haut droite** du header, `aria-label="Fermer"`.

## 3. Tailles

| `size` | Largeur | Usage |
|---|---|---|
| `sm` | `sm:max-w-sm` | Confirmation courte |
| `md` | **520px** (défaut) | Formulaire standard |
| `lg` | 560px | Formulaire dense, `StariumModal` avec icône |
| `xl` | `sm:max-w-4xl` | Tableau, picker catalogue |
| `full` | quasi plein écran | Exception |

Ne pas surcharger la largeur via `className="sm:max-w-…"` sans raison.

## 4. Gabarit — `StariumModal` (recommandé)

```tsx
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StariumModal } from '@/components/layout/form-dialog-shell';

<StariumModal
  open={open}
  onOpenChange={setOpen}
  title="Modifier la vision"
  description="Vision active : Vision 2026-2028"
  icon={Sparkles}
  size="lg"
  footer={
    <>
      <Button type="button" variant="outline" className="min-h-11 sm:min-h-9" onClick={() => setOpen(false)}>
        Annuler
      </Button>
      <Button type="button" className="min-h-11 sm:min-h-9" disabled={!canSubmit} onClick={onSubmit}>
        Enregistrer
      </Button>
    </>
  }
>
  <div className="starium-form">{/* champs .starium-form-* */}</div>
</StariumModal>
```

## 5. Gabarit — primitives `Dialog*` (socle uniquement)

```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent showCloseButton size="md">
    <DialogHeader>
      <DialogHeaderIcon icon={MonIcone} />
      <div className="starium-modal__titles">
        <DialogTitle>Titre de la modale</DialogTitle>
        <DialogDescription>Sous-titre court en une phrase.</DialogDescription>
      </div>
    </DialogHeader>
    <DialogBody>{/* contenu */}</DialogBody>
    <DialogFooter>
      <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
      <Button onClick={onSubmit}>Enregistrer</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

## 6. Formulaires dans le corps

| Élément | Classe / composant |
|---|---|
| Conteneur | `.starium-form` |
| Titre de section | `.starium-modal-seg-title` |
| Champ | `.starium-form-field` |
| Label | `.starium-form-label` + `htmlFor` |
| Contrôles | `.starium-form-input`, `.starium-form-textarea`, `.starium-form-select` |
| Aide | `.starium-form-hint` |
| Grille 2 colonnes | `.starium-form-grid.starium-form-grid--2` |
| Encart | `FORM_DIALOG_BODY_ENCART_CLASS` ou `rounded-xl border border-border/70 bg-card p-4 shadow-sm` |
| Erreur | `Alert variant="destructive"` |
| États | `LoadingState`, `EmptyState`, `ErrorState` |

Libellés en français métier ; **jamais d'ID technique visible**.
Référence : `features/strategic-vision/components/strategic-vision-form-fields.tsx`.

## 7. Pied

| Bouton | Variant | Position |
|---|---|---|
| Annuler / Fermer | `outline` | Droite, avant le primaire |
| Action principale | `default` (or) | Dernier à droite |
| Destructif | `destructive` | Gauche du groupe, **uniquement** si suppression explicite |

Cibles tactiles `min-h-11 sm:min-h-9`. Pas de pied si flux **autosave** seul (à documenter en RFC).

## 8. Accessibilité

`DialogTitle` + `DialogDescription` obligatoires · croix `aria-label="Fermer"` (jamais « Close ») ·
`<label htmlFor>` ou `aria-label` sur chaque champ · erreurs `aria-invalid` + `aria-describedby` ·
`aria-live="polite"` sur le contenu dynamique · focus trap natif Base UI · animations `motion-safe:`.

## 9. Interdits

| ❌ | ✅ |
|---|---|
| `import { Dialog… } from '@/components/ui/dialog'` dans une feature | `StariumModal` |
| `layout="legacy"` sur du neuf (bottom-sheet) | `layout="starium"` (défaut) |
| Panneau vitré `bg-background/95` + blur | Panneau opaque `bg-card` |
| Croix en haut à gauche / absolue hors header | Croix dans le header, à droite |
| Header legacy `-mx-4 -mt-4`, `pr-8` | Classes `.starium-modal__*` |
| Inputs bruts hors `.starium-form-*` | Classes formulaire DS |
| Scroll sur `DialogContent` | Scroll sur `DialogBody` uniquement |
| Bouton unique pleine largeur sans raison | Annuler `outline` + primaire à droite |
| ID technique en UI | Libellé métier |

## 10. Migration d'une modale existante

1. `DialogContent className="sm:max-w-lg p-4 …"` → `size="md"` / `size="lg"` sans padding custom.
2. Supprimer le header legacy (`-mx-4 -mt-4`, `pr-8`).
3. Envelopper le contenu scrollable dans `DialogBody`.
4. Migrer les champs vers `.starium-form-*`.
5. Si icône + titre + sous-titre + footer → basculer sur `StariumModal`.
6. Vérifier à 320px et en desktop.

**Ne pas changer la logique API lors d'un refactor visuel.**

## 11. Vérification

```bash
pnpm audit:modals   # node scripts/audit-modals.mjs — 0 DialogContent direct hors socle
pnpm --filter @starium-orchestra/web test   # dont dialog.spec.tsx
```

Exemples implémentés : `strategic-vision-edit-dialog.tsx`,
`strategic-vision-workflow-dialog.tsx`, `strategic-directions-dialog.tsx`,
`global-search-dialog.tsx` (headless), `starium-chat-drawer.tsx` (chatWidget).
