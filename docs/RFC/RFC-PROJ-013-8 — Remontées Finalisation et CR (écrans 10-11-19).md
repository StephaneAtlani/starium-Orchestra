# RFC-PROJ-013-8 — Remontées, Finalisation et CR (écrans 10, 11, 19)

| | |
| --- | --- |
| **Statut** | ✅ Implémenté |
| **Date** | 2026-09-10 |
| **Parents** | RFC-PROJ-013-5 ; 013-3 (CR/snapshot) ; 013-6 (conduite) ; 013-7 (listes / `conductClosedAt`) |
| **Écrans PDF** | **10** Sujets à remonter · **11** Finalisation · **19** CR consulté |
| **Scope** | F3 remontées COPRO→COPIL (écran 10) ; checklist soft 11 ; finalize opt-in ; DocumentView KPI + présence |

## 1. Analyse de l’existant

- Close-conduct + `to_finalize` : 013-6 / 013-7.
- Snapshot + preview / send CR : 013-3.
- Remontées inter-niveaux : livrées F3 (`ProjectReviewEscalation`).

## 2. Décisions livrées

1. Écran 11 = même URL review post-`conductClosedAt` + panneau checklist (pas de route dédiée).
2. Gates **soft only** — finalize non bloqué (y compris si remontées PENDING).
3. Side-effects **opt-in** via body finalize `{ pushActionsToTasks?, promoteRiskNotes? }` (défaut API `false`).
4. REX (`POST_MORTEM`) ignore les flags push.
5. **F3** : UX **100 % écran 10** (COPRO post-`conductClosedAt`) — pas de create depuis Animer (09) ; COPIL inject silencieux via `consolidate-escalations`. Direction **COPRO → COPIL** uniquement (descente = hors scope F3.1).

## 3. Implémentation

| Lot | Contenu | État |
| --- | --- | --- |
| F1 | Flags À finaliser | ✅ 013-7 |
| F2 | Checklist soft + cases opt-in | ✅ |
| F3 | Remontées COPRO→COPIL + écran 10 | ✅ |
| F4 | Push Task / promote Risk au finalize | ✅ |
| F5 | DocumentView KPI + présence | ✅ |

### API

- `POST …/reviews/:id/finalize` accepte `FinalizeProjectReviewDto`.
- Audits : `project.review.actions_pushed`, `project.review.risks_promoted` (counts).
- Helpers : `project-review-finalize-side-effects.ts`.
- **F3** :
  - `GET …/reviews/:id/escalations`
  - `POST …/reviews/:id/escalations` (COPRO)
  - `POST …/reviews/:id/escalations/:escId/cancel`
  - `POST …/reviews/:id/consolidate-escalations` (COPIL)
  - Audits : `project.review.escalation.created|injected|cancelled`
  - Helper : `project-review-escalations.ts`

### FE

- `ProjectReviewFinalizeChecklist` + `buildFinalizeChecklist`.
- `ProjectReviewDocumentView` : `KpiCard` + section Présence (`attendanceStatus`).
- **F3** : `ProjectReviewEscalationsScreen` (écran 10) dans l’éditeur COPRO post-conduct ; consolidate auto à l’ouverture COPIL si ODJ non figé.

## 4. Prisma

- Enum `ProjectReviewAgendaItemType.ESCALATION`.
- Modèle `ProjectReviewEscalation` (`PENDING` \| `INJECTED` \| `CANCELLED`).
- Migration `20260910183000_proj_013_8_f3_review_escalations`.

## 5. Tests

- Helper side-effects + finalize flags (Jest).
- Helper escalations + create/consolidate (Jest).
- Vitest `review-finalize-checklist.spec.ts`.

## 6. Hors scope / suite

- F3.1 : descente décisions COPIL → COPRO suivant.
- Injection vers CYCLE / écran 18 (013-9).
- Gates hard configurables ; `reportDistributedAt` distinct.
- Mapping responsable → Resource.

## 7. Conformité by design

- **RGPD** : audits counts / ids métier ; pas d’email en clair ; Task/Risk/Escalation scopés client ; owner = `ownerUserId` ; rétention cascade.
- **RGAA** : checklist Alert + liens focus ; checkbox labellisés ; titres DocumentView ; écran 10 labels + listes + cibles ≥ 44px.
- **DS** : `KpiCard`, `Alert`, `EmptyState` / `LoadingState` / `ErrorState`, tokens.
- **Sécurité** : `projects.read` / `projects.update` ; DTO validé ; isolation create/list/cancel/consolidate.
- **Mobile** : checklist et écran 10 empilés ; KPI wrap.
