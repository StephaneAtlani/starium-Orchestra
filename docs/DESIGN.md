# Design System — Versioning procédures (Starium Orchestra)

## Product Context
- **Quoi** : Publication de procédures en versions `vX.Y` (mineure / majeure), historique des publiées, restore vers brouillon — sans confondre brouillon et version officielle.
- **Pour qui** : Duo rédacteur + publieur (DSI / responsable procédure) ; lecteurs CODIR / opérationnels en secondaire.
- **Espace** : SaaS B2B gouvernance / conformité, module Procédures.
- **Type** : web app / outil interne (dans Orchestra).
- **Memorable thing** : la version officielle se lit d’un coup d’œil, le brouillon ne se confond jamais.

## Aesthetic Direction
- **Direction** : Luxury / Refined (Apple-inspired Starium + signature or)
- **Décoration** : minimal — typo, whitespace, or rare (sélection, focus, accent modale)
- **Mood** : premium, sobre, lisible CODIR ; le signal « majeure » est clair sans dramaturgie rouge
- **Références** : handoff `docs/design_handoff_procedures/` (tokens, boutons, historique `.pr-hist`) ; norme modales `docs/design-system/MODALES.md` ; tokens app `apps/web/src/styles/tokens.css`

## Typography
- **Display/Hero** : Manrope (800) — identité produit déjà en place
- **Body** : Manrope (400–600) — lisibilité procédures longues
- **Data/Tables** : Manrope + `tabular-nums` pour `vX.Y` et dates
- **Code** : ui-monospace / JetBrains Mono si snippet technique (hors UI métier)
- **Loading** : Manrope variable self-hosted (prod) ; Google Fonts OK pour preview
- **Scale** : 12 / 13 / 14 / 16 / 20 / 24 / 32 px (alignée DS Starium)

## Color
- **Approche** : restrained — encre pour CTA, or pour accent, sémantique pour badges
- **Primary** : `#0E0E10` (brand-ink) — CTA Publier, segmented actif
- **Secondary / accent** : `#E8A317` (brand-gold) — focus, icône modale, liseré sélection
- **Neutrals** : `#FAF9F7` → `#0E0E10` (papier chaud, jamais blanc pur en fond d’app)
- **Semantic** : success `#1F8A5B` / warning `#C77A00` (badge Majeure) / error `#B42318` / info `#2A6FDB`
- **Dark mode** : hors scope de ce lot ; respecter variables thème existantes si présentes

## Spacing
- **Base** : 8px
- **Densité** : confortable en modales ; éditeur peut rester dense (handoff)
- **Scale** : 2xs(2) xs(4) sm(8) md(16) lg(24) xl(32) 2xl(48) 3xl(64)

## Layout
- **Approche** : grid-disciplined (shell app + panneau historique)
- **Grid** : éditeur handoff (plan | document | panneaux) ; historique en colonne droite ou tiroir &lt; 1100px
- **Max content width** : aligné pages Orchestra (~1340px shell)
- **Border radius** : sm 6px, md 10px (inputs), lg 14px (cards), xl 20px (modales), pill 999px (boutons / segmented / badges)

## Motion
- **Approche** : minimal-fonctionnel
- **Easing** : enter ease-out, exit ease-in, move ease-in-out
- **Duration** : micro 50–100ms, court 120–200ms (DS), moyen 250–400ms ; respecter `prefers-reduced-motion`

## Patterns spécifiques versioning

### Affichage version
- Publiée courante / historique : libellé `v{major}.{minor}` uniquement (jamais d’UUID).
- Brouillon : pas de `vX.Y` ; méta explicite « Brouillon » + éventuellement « Publiée courante : vX.Y » à part.

### Modale Publier (`StariumModal`)
- Segmented **Mineure** (défaut) / **Majeure** ; aperçu du prochain libellé.
- 1ʳᵉ publish : segmented masqué, forcé `v1.0`.
- Commentaire obligatoire si Majeure ; erreur inline explicite si vide.
- Pied : Annuler (outline) + Publier (encre) avec libellé incluant le `vX.Y` cible.

### Historique
- Liste publiées only ; `vX.Y` en gras ; résumé ; auteur libellé ; badges Courante / Majeure.
- Empty / error states explicites.

### Restore
- Deuxième `StariumModal` de confirmation ; copie vers brouillon ; pas de nouveau `vX.Y`.

## Decisions Log
| Date | Décision | Rationale |
|------|----------|-----------|
| 2026-09-18 | Création initiale | /design — handoff = tokens/boutons/modales ; composition UI versioning pour le PRD |
| 2026-09-18 | Pas de nouveau DS | Réutiliser Manrope + or Starium ; pas de recherche concurrente |
| 2026-09-18 | Badge Majeure = warning soft | Signal gouvernance sans confondre avec erreur |
| 2026-09-18 | Preview | `docs/design-preview.html` |
