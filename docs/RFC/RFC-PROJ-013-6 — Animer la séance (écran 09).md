# RFC-PROJ-013-6 — Animer la séance (écran 09)

| | |
| --- | --- |
| **Statut** | ✅ Implémenté |
| **Date** | 2026-09-10 |
| **Parents** | RFC-PROJ-013-5 (catalogue) ; 013-4 (ODJ-first) ; 013-7 (`conductClosedAt` / listes) |
| **Écran PDF** | **09 — Séance en cours — conduite** |
| **Scope** | Workspace live : présence, ODJ, présentation / décision, timers, close-conduct → À finaliser |

## 1. Analyse de l’existant

| Élément | État |
| --- | --- |
| Shell Animer | ✅ `project-review-animate-session.tsx` |
| Wire éditeur | ✅ gate `shouldShowAnimateSession` (`conduct` + `!conductClosedAt` + ≠ `POST_MORTEM`) |
| `POST …/close-conduct` | ✅ pose `conductClosedAt`, status `IN_PROGRESS` inchangé |
| Garde `finalize` | ✅ exige `conductClosedAt` (pilotage) ; REX `POST_MORTEM` exempté |
| Timer point / Point suivant / auto-start | ✅ |
| Escalade / diffusion CR | Hors scope → **013-8** |

## 2. Hypothèses tranchées

1. Une seule conduite ouverte : **toast soft** au `start` si une autre `uiState === in_progress` (pas de contrainte Prisma V1).
2. Suspendre → liste `?pointsState=in_progress` ; status inchangé.
3. Clôturer footer = **close-conduct uniquement** (jamais `finalize` depuis le shell 09).
4. Risque Consigner = note préfixée `Risque : ` + toast info 013-8 — **pas** de `ProjectRisk` create.
5. Reopen conduct / unlock-conduct : hors V1.

## 3. UX livrée

- Header Mic + meta ; mobile : CTA **Présence & ODJ** → `StariumModal` sidePanel
- Strip : EN SÉANCE · chrono séance · présents · Point i/n · k traités · chrono point (`aria-live` throttlé)
- Modes Présentation / Décision ; Acter / Trancher (Adopté→`VALIDATED`, Rejeté→`REJECTED`, Reporté→`SUPERSEDED`) / Assigner (libellé porteur) / Consigner
- Footer : Suspendre · **Point suivant** · Clôturer & générer le CR
- Après close-conduct : bandeau « Conduite clôturée » + flux Prévisualiser / Finaliser (éditeur)

## 4. Fichiers

| Zone | Chemins |
| --- | --- |
| API | `project-reviews.service.ts`, `.controller.ts`, `project-audit.constants.ts` |
| FE API/hooks | `project-reviews.api.ts`, `use-project-review-mutations.ts` |
| Shell / gate | `project-review-animate-session.tsx`, `project-review-editor-dialog.tsx` |
| Helpers | `review-agenda-utils.ts` (+ vitest) |
| Doc | cette RFC, `_RFC Liste.md`, `API.md` |

## 5. Implémentation

| Lot | Contenu | État |
| --- | --- | --- |
| A | Shell + présence + ODJ + modes | ✅ |
| B | Timer par point ; Point suivant ; auto-start 1er TODO | ✅ |
| C | Routing Acter/Trancher/Assigner/Consigner (`agendaItemId`) | ✅ |
| D | `close-conduct` + garde finalize + gate Animer + mode to_finalize | ✅ |
| E | Vitest helpers + drawer mobile + doc | ✅ |

### Contrat `POST …/reviews/:reviewId/close-conduct`

- Préconditions : scope client/projet ; status ∈ `IN_PROGRESS` (alias `IN_REVIEW`) ; `conductClosedAt == null`
- Effets : `conductClosedAt = now()` ; status inchangé ; audit `PROJECT_REVIEW_CONDUCT_CLOSED`
- Messages : « La conduite est déjà clôturée » / « La conduite ne peut être clôturée que sur un point en cours »

### `finalize`

- Pilotage : refuse sans `conductClosedAt` (« Clôturez d’abord la conduite… »)
- `POST_MORTEM` : n’exige pas `conductClosedAt`

## 6. Prisma

- Aucune migration nouvelle (champs livrés en **013-7**).

## 7. Tests

- API : closeConduct OK / déjà closed / hors status / isolation 404 ; finalize sans close refuse ; POST_MORTEM OK
- Vitest : `canAdvanceAgendaPoint`, `shouldTickPointTimer`, `formatConductElapsed`, `shouldShowAnimateSession`

## 8. Récapitulatif

Écran **09** livré : conduite live + close-conduct → onglet **À finaliser** (013-7). Diffusion CR / remontées = **013-8**.

## 9. Points de vigilance

- Autosave décisions/actions avant close-conduct (state éditeur).
- Ne pas finaliser depuis le Mic.
- Unlock conduct hors V1 (SQL admin si besoin seed).

## 10. Conformité by design

- **RGPD** : présence = DCP séance ; audits sans e-mail ; scope client
- **RGAA** : Switch labellisés ; `aria-live` timer throttlé ; focus drawer
- **Design System** : CTA or Starium ; tokens ; `EmptyState` / loading
- **Sécurité** : `projects.update` ; isolation client ; DTO vide OK close-conduct
- **Mobile** : drawer Présence/ODJ ; footer stack `min-h-11` ; cibles ≥ 44px
