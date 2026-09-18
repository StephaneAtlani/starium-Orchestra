# Plan — `comp-ev-1-liste-preuves`

**RFC** : RFC-COMP-004 COMP.EV.1 · **Commit** : `feat(compliance): polish evidence list meta and hide FILE kind`

## Objectif

Rendre la liste « Preuves & documents » du tiroir digne du mock : méta lisible, empty explicite, ouvrir les liens, masquer FILE (pas d’upload).

## Décisions figées

1. **FILE masqué** du menu d’ajout (H1 différé) — pas de hint « bientôt » en option A/B : simplement absent.
2. **Retirer** = hors scope EV.1 (→ EV.2 + DELETE soft).
3. Pas d’API Nest nouvelle.

## Fichiers

| Mod | `compliance-assess-ui.tsx` — retirer FILE de `EVIDENCE_ADD_OPTIONS` |
| Mod | `compliance-assess-drawer-body.tsx` — EmptyState, méta date/kind, CTA Ouvrir |
| Créer | `lib/compliance-evidence-display.ts` + spec — libellés kind / méta |
| Mod | RFC-COMP-004 / BACKLOG — EV.1 clos |

## Acceptation

1. Menu ajout : Lien / Référence / Note seulement (pas Fichier).
2. Empty : « Aucune preuve jointe. »
3. Ligne : icône + titre + méta `Type · date` (+ vN) ; lien cliquable / bouton Ouvrir.
4. `audit:ui-ids` + tests lib verts.

## Hors scope

Retirer, edit, assessment, versions, REFERENCE kind API, réutilisation.

## By design

RGPD ok · RGAA labels/empty · DS tokens · Sécurité inchangée · Mobile min-h-11.

## Verdict

GO
