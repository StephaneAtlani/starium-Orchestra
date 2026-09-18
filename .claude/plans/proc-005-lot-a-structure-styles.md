# Plan — PROC-005 Lot A — Structure + styles + toolbar

**RFC** : RFC-PROC-005 · **Feature** : `proc-005-lot-a-structure-styles`  
**US** : US-PROC-09 + US-PROC-10 + US-PROC-14 (partiel toolbar)  
**Commit cible** : `feat(procedures): rich editor H1–H6, colors and toolbar`

## Objectif

Étendre l’éditeur TipTap MVP : titres H1–H6, blocs HR/code, marques underline + couleur/surlignage tokenisés, toolbar groupée DS/RGAA — whitelist API alignée.

## Décisions figées

1. TipTap 3.x : ajouter `@tiptap/extension-underline`, `@tiptap/extension-text-style`, `@tiptap/extension-color`, `@tiptap/extension-highlight` (align versions `^3.31.3`).
2. Headings : `levels: [1,2,3,4,5,6]` FE + API.
3. Nodes whitelist + : `horizontalRule`, `codeBlock` (plaintext, pas de language arbitraire dangereux — `language` optionnel string ≤ 32 chars alphanum/`-`).
4. Marks whitelist + : `underline`, `strike`, `textStyle` (`colorToken`), `highlight` (`colorToken`). Conserver `bold`/`italic`/`link`.
5. **Allowlist couleurs** (clés stockées dans JSON, jamais hex brut) :

| Token | Usage | CSS (rendu FE) |
| --- | --- | --- |
| `ink` | texte | `var(--color-text)` / `var(--brand-ink)` |
| `muted` | texte | `var(--color-text-muted)` |
| `brand` | texte | `var(--brand-gold-700)` |
| `danger` | texte | `var(--state-danger)` |
| `success` | texte | `var(--state-success)` |
| `warning` | texte | `var(--state-warning)` |
| `info` | texte | `var(--state-info)` |
| `brandSoft` | surlignage | `var(--brand-gold-100)` |
| `dangerSoft` | surlignage | `var(--state-danger-bg)` |
| `successSoft` | surlignage | `var(--state-success-bg)` |
| `warningSoft` | surlignage | `var(--state-warning-bg)` |
| `infoSoft` | surlignage | `var(--state-info-bg)` |

   - `textStyle` → tokens texte seulement ; `highlight` → tokens `*Soft` seulement. Hex / token inconnu → **400**.
6. Toolbar : groupes Structure | Inline | Couleur | (Lien existant conservé). Menus couleur = liste libellés FR. Cibles `min-h-11 sm:min-h-9`. `aria-pressed` / `aria-label`. Loading éditeur → `LoadingState`.
7. **Pas de migration Prisma** (schéma inchangé).
8. **Hors scope Lot A** : assets/médias (B), Mermaid (C), modale lien / liens internes (D), outline sticky, remplacer `window.prompt` lien (D).

## Fichiers

### API
- `apps/api/src/modules/procedures/lib/procedure-content.util.ts` — whitelist + validation `colorToken` / heading 1–6 / HR / codeBlock
- `apps/api/src/modules/procedures/lib/procedure-content.util.spec.ts` (créer ou étendre) — cas 400/OK
- Tests service draft existants si besoin d’assert whitelist

### Web
- `apps/web/package.json` — deps TipTap extensions
- `apps/web/src/features/procedures/lib/procedure-color-tokens.ts` — allowlist + labels FR + CSS mapping (miroir API)
- `apps/web/src/features/procedures/lib/procedure-content.ts` — si besoin sync EMPTY_DOC
- `apps/web/src/features/procedures/components/procedure-editor-toolbar.tsx` — toolbar groupée
- `apps/web/src/features/procedures/components/procedure-rich-editor.tsx` — extensions + brancher toolbar + LoadingState + styles prose headings/couleurs

## Critères d’acceptation

1. Save draft avec H4–H6, underline, textStyle/highlight token OK ; token invalide / hex → API 400.
2. Toolbar permet H1…H6, underline, couleur texte, surlignage (libellés FR, pas d’ID).
3. `LoadingState` pendant init éditeur ; toolbar clavier + cibles ≥ 44px mobile.
4. Tests unitaires whitelist API verts ; `tsc` api+web ; `audit:ui-ids` vert.
5. Isolation client / perms inchangées (régression OK).

## By design

- **RGPD** : pas de contenu full en logs (inchangé)
- **RGAA** : headings sémantiques, toolbar aria, contrastes via tokens DS
- **DS** : tokens uniquement, LoadingState, pas de hex en dur dans features
- **Sécurité** : whitelist serveur stricte colorToken
- **Mobile** : toolbar scrollable, `min-h-11 sm:min-h-9`

## Verdict review-plan

**GO** — 1 lot, décisions figées, hors-scope clair, pas de Prisma, isolation/authz héritées.
