# RFC-PROJ-013-8 — Remontées, Finalisation et CR (écrans 10, 11, 19)

| | |
| --- | --- |
| **Statut** | ✅ Implémenté (F1–F5 + F3.1) |
| **Date** | 2026-09-10 |
| **Parents** | RFC-PROJ-013-5 ; 013-3 (CR/snapshot) ; 013-6 (conduite) ; 013-7 (listes / `conductClosedAt`) |
| **Écrans PDF** | **10** Articulation niveaux · **11** Finalisation · **19** CR consulté |
| **Scope** | F3 remontées COPRO→COPIL ; **F3.1** descentes COPIL→COPRO ; checklist soft 11 ; finalize opt-in ; DocumentView |

## 1. Analyse de l’existant

- Close-conduct + `to_finalize` : 013-6 / 013-7.
- Snapshot + preview / send CR : 013-3.
- Remontées inter-niveaux : livrées F3 (`ProjectReviewEscalation`).
- Descentes décisions : livrées F3.1 (`ProjectReviewDescent`).

## 2. Décisions livrées

1. Écran 11 = même URL review post-`conductClosedAt` + panneau checklist (pas de route dédiée).
2. Gates **soft only** — finalize non bloqué (y compris si remontées / descentes PENDING).
3. Side-effects **opt-in** via body finalize `{ pushActionsToTasks?, promoteRiskNotes? }` (défaut API `false`).
4. REX (`POST_MORTEM`) ignore les flags push.
5. **F3** : UX **100 % écran 10** (COPRO post-`conductClosedAt`) — pas de create depuis Animer (09) ; COPIL inject silencieux via `consolidate-escalations`.
6. **F3.1** : à la finalisation COPIL, chaque décision `VALIDATED` crée une `ProjectReviewDescent` vers le prochain COPRO ; inject ODJ `DECISION_DESCENT` si cible + ODJ non figé ; UX **écran 10** section « Décisions COPIL à appliquer » ; consolidate silencieux à l’ouverture COPRO (`consolidate-descents`). Hors scope V1 : APPLIED, multi-COPRO, CYCLE.

## 3. Implémentation

| Lot | Contenu | État |
| --- | --- | --- |
| F1 | Flags À finaliser | ✅ 013-7 |
| F2 | Checklist soft + cases opt-in | ✅ |
| F3 | Remontées COPRO→COPIL + écran 10 | ✅ |
| F3.1 | Descentes COPIL→COPRO + écran 10 | ✅ |
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
- **F3.1** :
  - `GET …/reviews/:id/descents`
  - `POST …/reviews/:id/descents/:descentId/cancel` (source COPIL ou cible COPRO)
  - `POST …/reviews/:id/consolidate-descents` (COPRO)
  - Création auto au finalize COPIL (`createDescentsFromFinalizedCopil`)
  - Audits : `project.review.descent.created|injected|cancelled`
  - Helper : `project-review-descents.ts`
  - KPI cockpit : `copilDecisionsToApply` ; liste : `incomingDescentsPendingCount`

### FE

- `ProjectReviewFinalizeChecklist` + `buildFinalizeChecklist`.
- `ProjectReviewDocumentView` : `KpiCard` + section Présence (`attendanceStatus`).
- **F3 + F3.1** : `ProjectReviewEscalationsScreen` (écran 10) — remontées + décisions COPIL ; consolidate auto COPIL (escalations) / COPRO (descents) si ODJ non figé.

## 4. Prisma

- Enum `ProjectReviewAgendaItemType.ESCALATION` + `DECISION_DESCENT`.
- Modèle `ProjectReviewEscalation` (`PENDING` \| `INJECTED` \| `CANCELLED`).
- Modèle `ProjectReviewDescent` (`PENDING` \| `INJECTED` \| `CANCELLED`).
- Migrations `20260910183000_proj_013_8_f3_review_escalations`, `20260910190000_proj_013_8_f31_review_descents`.

## 5. Tests

- Helper side-effects + finalize flags (Jest).
- Helper escalations / descents + create/consolidate (Jest).
- Vitest `review-finalize-checklist.spec.ts`.

## 6. Hors scope / suite

- F3.1 V2 : statut APPLIED, multi-cibles COPRO, injection CYCLE.
- Injection vers CYCLE / écran 18 (013-9 T4).
- Gates hard configurables ; `reportDistributedAt` distinct.
- Mapping responsable → Resource.

## 7. Conformité by design

- **RGPD** : audits counts / ids métier ; pas d’email en clair ; Task/Risk/Escalation/Descent scopés client ; owner = `ownerUserId` ; rétention cascade.
- **RGAA** : checklist Alert + liens focus ; checkbox labellisés ; titres DocumentView ; écran 10 labels + listes + cibles ≥ 44px.
- **DS** : `KpiCard`, `Alert`, `EmptyState` / `LoadingState` / `ErrorState`, tokens.
- **Sécurité** : `projects.read` / `projects.update` ; DTO validé ; isolation create/list/cancel/consolidate.
- **Mobile** : checklist et écran 10 empilés ; KPI wrap.
