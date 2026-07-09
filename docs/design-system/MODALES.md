# Modales Starium — norme graphique obligatoire

**Statut** : norme produit (juillet 2026)  
**Référence visuelle** : maquette DS `Modal — Starium` (`components/Modal/Modal.jsx` dans le kit design)  
**Implémentation** : `apps/web/src/components/ui/dialog.tsx` (layout **`starium`** par défaut) + `apps/web/src/components/layout/form-dialog-shell.tsx` (`StariumModal`)

Toute **nouvelle modale** et toute **refonte UI** de modale existante doivent respecter ce document. Le rendu doit rester **identique** d’un écran à l’autre (même voile, même panneau, même header, même pied, mêmes champs formulaire).

Voir aussi [FRONTEND_UI-UX.md §11.4](../FRONTEND_UI-UX.md#114-modales--voile-et-panneau-global-dialog).

---

## 1. Quand utiliser quoi

| Besoin | Composant | Fichier |
|--------|-----------|---------|
| **Toute modale applicative** (formulaire, liste, confirmation, picker, chat, nav mobile) | **`StariumModal`** | `components/layout/form-dialog-shell.tsx` |
| Header standard icône + titre + sous-titre | `StariumModal` (défaut) | — |
| Contenu atypique sans header Starium (palette recherche, nav mobile) | `StariumModal` **`headless`** | — |
| Widget chat flottant | `StariumModal` **`chatWidget`** + `headless` | — |
| Tiroir latéral | `StariumModal` **`sidePanel`** | — |
| Implémentation bas niveau (socle uniquement) | Primitives **`Dialog*`** | `components/ui/dialog.tsx` — **ne pas importer dans les features** |
| Ancien bottom-sheet mobile (exception) | `layout="legacy"` sur `StariumModal` | — **ne pas utiliser** pour du neuf |

> **Juillet 2026** : les ~100 modales de l’app passent par `StariumModal`. `DialogContent` n’est utilisé que dans `form-dialog-shell.tsx` et `dialog.tsx`.

---

## 2. Anatomie (layout `starium`)

```
┌─────────────────────────────────────────────┐
│ [icône or]  Titre                      [×]  │  ← DialogHeader (.starium-modal__header)
│             Sous-titre court                │
├─────────────────────────────────────────────┤
│                                             │
│  Corps scrollable                           │  ← DialogBody (.starium-modal__body)
│  (.starium-form, .starium-modal-seg-title)  │
│                                             │
├─────────────────────────────────────────────┤
│                    [Annuler]  [Action or]   │  ← DialogFooter (.starium-modal__footer)
└─────────────────────────────────────────────┘
```

| Zone | Classe CSS | Règles |
|------|------------|--------|
| Voile | `DialogOverlay` | `bg-black/40`, léger flou, clic = fermer |
| Panneau | `DialogContent` | Centré **tous viewports**, `bg-card`, `rounded-xl`, `max-h-[86vh]`, `p-0`, **pas** de glass/blur sur le panneau |
| Header | `.starium-modal__header` | Flex ; padding `20px 22px` ; bordure basse |
| Icône | `.starium-modal__icon` | 38×38 px, `rounded-[10px]`, fond `--brand-gold-050`, icône Lucide 18 px |
| Titres | `.starium-modal__titles` | Bloc flex-1 ; titre + sous-titre |
| Titre | `.starium-modal__title` | Via `DialogTitle` |
| Sous-titre | `.starium-modal__subtitle` | Via `DialogDescription` — **une phrase** |
| Fermeture | `.starium-modal__close` | **Haut droite** du header (`margin-left: auto`) ; `aria-label="Fermer"` |
| Corps | `.starium-modal__body` | Padding `22px` ; seule zone scrollable |
| Pied | `.starium-modal__footer` | Bordure haute ; boutons alignés à droite, gap `10px` |

---

## 3. Tailles (`size` sur `DialogContent` / `StariumModal`)

| `size` | Largeur desktop | Usage type |
|--------|-----------------|------------|
| `sm` | `sm:max-w-sm` | Confirmation courte |
| `md` | **520px** (défaut) | Formulaire standard |
| `lg` | **560px** | Formulaire dense, modale icône StariumModal par défaut |
| `xl` | `sm:max-w-4xl` | Tableau, picker catalogue |
| `full` | quasi plein écran | Exception |

Ne pas surcharger la largeur sans raison (`className="sm:max-w-…"` via `tailwind-merge`).

---

## 4. Gabarit code — `StariumModal` (recommandé)

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
  <div className="starium-form">
    {/* champs starium-form-* */}
  </div>
</StariumModal>
```

---

## 5. Gabarit code — primitives `Dialog*`

```tsx
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogHeaderIcon,
  DialogTitle,
} from '@/components/ui/dialog';

<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent showCloseButton size="md">
    <DialogHeader>
      <DialogHeaderIcon icon={MonIcone} />
      <div className="starium-modal__titles">
        <DialogTitle>Titre de la modale</DialogTitle>
        <DialogDescription>Sous-titre court en une phrase.</DialogDescription>
      </div>
    </DialogHeader>

    <DialogBody>
      {/* contenu */}
    </DialogBody>

    <DialogFooter>
      <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
      <Button onClick={onSubmit}>Enregistrer</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

- `showCloseButton` (défaut `true`) : injecte la croix dans le header si `DialogHeader` est présent.
- Sans `DialogHeader` : croix en absolu `right-[14px] top-[14px]` sur le panneau.

---

## 6. Formulaires dans le corps

| Élément | Classe / composant |
|---------|-------------------|
| Conteneur formulaire | `.starium-form` |
| Section | `.starium-modal-seg-title` (titre de section avec séparateur) |
| Champ | `.starium-form-field` |
| Label | `.starium-form-label` + `htmlFor` |
| Input / textarea / select | `.starium-form-input`, `.starium-form-textarea`, `.starium-form-select` |
| Aide | `.starium-form-hint` |
| Grille 2 col. | `.starium-form-grid.starium-form-grid--2` |
| Encart optionnel | `FORM_DIALOG_BODY_ENCART_CLASS` ou `rounded-xl border border-border/70 bg-card p-4 shadow-sm` |
| Erreur | `Alert variant="destructive"` (§9 FRONTEND_UI-UX) |
| Chargement / vide | `LoadingState`, `EmptyState`, `ErrorState` |

**Libellés** : toujours en français métier ; jamais d’ID technique visible (règle globale inputs).

Référence champs partagés : `features/strategic-vision/components/strategic-vision-form-fields.tsx`.

---

## 7. Pied de modale (actions)

| Bouton | Variant | Position |
|--------|---------|----------|
| Annuler / Fermer | `outline` | Droite, avant l’action primaire |
| Action principale | `default` (or) | Dernier à droite |
| Destructif | `destructive` ou outline rouge | Gauche du groupe **uniquement** si suppression explicite |

- Cibles tactiles : `min-h-11` sur mobile, `sm:min-h-9` acceptable desktop.
- Pas de pied si flux **autosave** seul (documenter dans la RFC).

---

## 8. Accessibilité (RGAA)

- `DialogTitle` + `DialogDescription` obligatoires (liés par Base UI).
- Croix : `aria-label="Fermer"` (pas « Close »).
- Champs : `<label htmlFor>` ou `aria-label` ; erreurs `aria-invalid` + `aria-describedby`.
- Contenu dynamique (sauvegarde, liste) : `aria-live="polite"` si pertinent.
- Focus trap : natif Base UI / `FloatingFocusManager`.
- `prefers-reduced-motion` : animations via `motion-safe:` sur le socle `dialog.tsx`.

---

## 9. Interdictions (anti-patterns)

| ❌ Ne pas faire | ✅ Faire à la place |
|----------------|---------------------|
| `layout="legacy"` pour une nouvelle modale formulaire | `layout="starium"` (défaut) ou `StariumModal` |
| Bottom-sheet / panneau vitré `bg-background/95` + blur | Panneau opaque `bg-card` |
| Croix absolue en haut à gauche | Croix dans le header, **à droite** |
| `-mx-4 -mt-4` sur le header (ancien §11.4.1) | Classes `.starium-modal__*` natives |
| Inputs bruts `border-input` hors `.starium-form-*` | Classes formulaire DS |
| `Statement`, UUID, IDs en UI | Libellés métier français |
| Scroll sur `DialogContent` | Scroll uniquement sur `DialogBody` |
| Pied avec un seul bouton pleine largeur sans raison | `outline` Annuler + primaire à droite |

---

## 10. Migration d’une modale existante

1. Remplacer `DialogContent className="sm:max-w-lg p-4 …"` par `size="md"` ou `size="lg"` sans padding custom.
2. Supprimer header legacy (`-mx-4 -mt-4`, `pr-8` pour la croix).
3. Envelopper le contenu scrollable dans `DialogBody`.
4. Migrer les champs vers `.starium-form-*`.
5. Option rapide avec icône : basculer sur `StariumModal`.
6. Vérifier visuellement à 320px et desktop.

**Prompt agent (Cursor)** :

```text
Refactor la modale [fichier.tsx] pour respecter docs/design-system/MODALES.md et
FRONTEND_UI-UX.md §11.4 : layout starium par défaut, StariumModal ou DialogHeader/Body/Footer,
champs starium-form-*, pied Annuler (outline) + action primaire. Ne pas changer la logique API.
```

---

## 11. Fichiers sources

| Fichier | Rôle |
|---------|------|
| `apps/web/src/components/ui/dialog.tsx` | Socle Base UI, layout `starium` / `legacy`, **auto-wrap `DialogBody`**, sous-composants |
| `apps/web/src/components/layout/form-dialog-shell.tsx` | `StariumModal` |
| `apps/web/src/app/globals.css` | Classes `.starium-modal__*`, `.starium-form-*` |
| `apps/web/src/components/ui/dialog.spec.tsx` | Tests layout starium |

**Audit CI** : `node scripts/audit-modals.mjs` (structure obligatoire ; signale aussi les formulaires legacy).

**Exemples implémentés** :

- `features/strategic-vision/components/strategic-vision-edit-dialog.tsx` — `StariumModal` + formulaire
- `features/strategic-vision/components/strategic-vision-workflow-dialog.tsx` — `StariumModal` liste / workflow
- `features/strategic-vision/components/strategic-directions-dialog.tsx` — `StariumModal` contenu embarqué
