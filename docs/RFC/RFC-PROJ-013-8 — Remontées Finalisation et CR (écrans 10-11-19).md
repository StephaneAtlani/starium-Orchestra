# RFC-PROJ-013-8 — Remontées, Finalisation et CR (écrans 10, 11, 19)

| | |
| --- | --- |
| **Statut** | ✅ Implémenté (F2/F4/F5) · 📝 F3 reporté |
| **Date** | 2026-09-10 |
| **Parents** | RFC-PROJ-013-5 ; 013-3 (CR/snapshot) ; 013-6 (conduite) ; 013-7 (listes / `conductClosedAt`) |
| **Écrans PDF** | **10** Sujets à remonter (reporté) · **11** Finalisation · **19** CR consulté |
| **Scope V1** | Checklist soft 11 ; finalize opt-in push tâches/risques ; DocumentView KPI + présence |

## 1. Analyse de l’existant

- Close-conduct + `to_finalize` : 013-6 / 013-7.
- Snapshot + preview / send CR : 013-3.
- Remontées inter-niveaux : absentes (F3).

## 2. Décisions V1 livrées

1. Écran 11 = même URL review post-`conductClosedAt` + panneau checklist (pas de route dédiée).
2. Gates **soft only** — finalize non bloqué.
3. Side-effects **opt-in** via body finalize `{ pushActionsToTasks?, promoteRiskNotes? }` (défaut API `false`).
4. REX (`POST_MORTEM`) ignore les flags push.
5. F3 remontées / Prisma escalation : **hors V1**.

## 3. Implémentation

| Lot | Contenu | État |
| --- | --- | --- |
| F1 | Flags À finaliser | ✅ 013-7 |
| F2 | Checklist soft + cases opt-in | ✅ |
| F3 | Remontées COPROJ→COPIL | 📝 Reporté |
| F4 | Push Task / promote Risk au finalize | ✅ |
| F5 | DocumentView KPI + présence | ✅ |

### API

- `POST …/reviews/:id/finalize` accepte `FinalizeProjectReviewDto`.
- Audits : `project.review.actions_pushed`, `project.review.risks_promoted` (counts).
- Helpers : `project-review-finalize-side-effects.ts`.

### FE

- `ProjectReviewFinalizeChecklist` + `buildFinalizeChecklist`.
- `ProjectReviewDocumentView` : `KpiCard` + section Présence (`attendanceStatus`).

## 4. Prisma

Aucune migration V1.

## 5. Tests

- Helper side-effects + finalize flags (Jest).
- Vitest `review-finalize-checklist.spec.ts`.

## 6. Hors scope / suite

- F3 : `ProjectReviewEscalation`, UI écran 10, ODJ COPIL / CYCLE.
- Gates hard configurables ; `reportDistributedAt` distinct.
- Mapping responsable → Resource.

## 7. Conformité by design

- **RGPD** : audits counts ; pas d’email en clair ; Task/Risk scopés client.
- **RGAA** : checklist Alert + liens focus ; checkbox labellisés ; titres DocumentView.
- **DS** : `KpiCard`, `Alert`, tokens.
- **Sécurité** : `projects.update` ; DTO validé ; isolation create.
- **Mobile** : checklist empilée ; KPI wrap ; cibles ≥ 44px.
