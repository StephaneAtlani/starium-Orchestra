# RFC-PROJ-013-7 — Listes par état, Séries et Préparation (écrans 01–08, 13–17)

| | |
| --- | --- |
| **Statut** | ✅ Socle livré — **écarts UX/comportement vs CDC 8 écrans** → [RFC-PROJ-013-10](./RFC-PROJ-013-10%20—%20CDC%20parcours%208%20écrans%20Points%20projet%20(fidélité%20visuelle).md) (plan P1–P6) |
| **Date** | 2026-09-10 (amendé 2026-09-11) |
| **Parents** | RFC-PROJ-013-5 · **parcours actif** : RFC-PROJ-013-10 |
| **Écrans PDF** | Catalogue 20 : **01–08**, **06**, **07**, **13–17** · CDC 8 : dashboard / créer / préparer (alignement 013-10) |
| **Scope** | Sous-onglets À préparer / À venir / En cours / À finaliser / Historique / Séries ; KPI ; création typée ; préparation + figer ODJ |

## 1. Analyse de l’existant (avant livraison)

- Liste unique filtrée par status API (`project-reviews-tab.tsx`) — pas les 5 états UI PDF.
- Création ODJ-first (013-4) sans split typé ni defaults COPROJ/COPIL distincts.
- Phase `prepare` sans action métier « Figer l’ordre du jour ».
- Pas d’entité série récurrente.

## 2. Décisions figées (livrées)

1. Sous-onglets = filtres UI sur mapping 013-5 §4 (+ compteurs `GET …/summary`).
2. KPI tête via **`GET /api/projects/:projectId/reviews/summary`** (agrégats, pas de N+1 FE).
3. Séries = `ProjectReviewSeries` (scopé `clientId` + `projectId`) + `POST …/generate`.
4. À finaliser = `conductClosedAt` (pas d’enum `AWAITING_REPORT`). Mutation « clôturer séance » = **RFC-PROJ-013-6** (hors scope) ; seed démo renseigne le champ.
5. Menu création (PDF 13) : split « Créer un COPROJ » + chevron (cadence / ponctuel Ad hoc) ; modale préremplie (horaire, durée, ODJ ouvert) ; CTAs « Créer » / « Créer et préparer ». Types : COPROJ→`COPRO`, COPIL, CODIR→`CODIR_REVIEW`, Revue→`PROJECT_REVIEW`, Ad hoc→`OTHER` — **pas de COTECH** V1.
6. `lock-agenda` ne change pas le status API ; `SCHEDULED` + lock → « À venir » ; generate → `SCHEDULED` + `agendaLockedAt = null` → « À préparer ».

## 3. Mapping états UI (table de vérité)

| État UI | Condition | CTA |
| --- | --- | --- |
| À préparer | `(PREPARING\|SCHEDULED)` et `agendaLockedAt = null` | Ouvrir |
| À venir | `SCHEDULED` et ODJ figé | Ouvrir |
| En cours | `IN_PROGRESS` et `conductClosedAt = null` | Reprendre la conduite |
| À finaliser | `IN_PROGRESS` et `conductClosedAt != null` | Finaliser |
| Historique | `FINALIZED` \| `CANCELLED` | Consulter |

Deep-link : `?tab=points&pointsState=…` ; flash création : `?pointsFlash=<id>` (1,6 s).

## 4. Implémentation (chemins réels)

| Zone | Fichiers |
| --- | --- |
| Prisma | `apps/api/prisma/schema.prisma` — `agendaLockedAt`, `conductClosedAt`, `seriesId`, `ProjectReviewSeries` ; migration `20260910103522_proj_013_7_review_lists_series` |
| Helper UI state | `apps/api/.../project-review-ui-state.ts` ; `apps/web/.../lib/project-review-ui-state.ts` |
| API reviews | `project-reviews.service.ts` / `.controller.ts` — list enrichie, `summary`, `lock-agenda`, `unlock-agenda` |
| API séries | `project-review-series.service.ts` / `.controller.ts` — CRUD + `generate` |
| Garde ODJ | `project-review-agenda.service.ts` — refuse structure si locked en PREPARING/SCHEDULED |
| FE listes | `project-reviews-tab.tsx`, `project-reviews-state-tabs.tsx`, `project-reviews-kpi-row.tsx`, `project-reviews-table.tsx` |
| FE création | `project-review-create-split-button.tsx`, `project-review-create-defaults.ts`, dialog prefill |
| FE séries | `project-review-series-panel.tsx` |
| FE prépa | `project-review-editor-dialog.tsx` — CTA Figer / Réouvrir ; `review-agenda-section.tsx` — `agendaStructureLocked` |
| Seed | `seed-project-demo-reviews.ts` — ≥1 review / état UI + 1 série BIWEEKLY |
| Doc API | `docs/API.md` § Points projet |

Isolation : toutes les routes valident le **client actif** + `projectId` ; RBAC `projects.read` / `projects.update`.

## 5. API (rappel)

- `GET …/reviews` — items : `uiState`, `agendaLockedAt`, `conductClosedAt`, `seriesId`, `seriesFrequency`, `agendaDoneCount`, `attendedCount`, `participantsPreview`, signaux 04
- `GET …/reviews/summary` — `countsByUiState`, `nextReview`, `quarterVolume`, `quarterVolumeByType`, `openActionsFromReviews`, `overdueActionsFromReviews`, `deferredAgendaItemsCount`, `copilDecisionsToApply`, `escalationsPendingCount` (descentes `PENDING|INJECTED`, RFC-PROJ-013-8 F3.1)
- KPI UI (PDF 01) : 4 × `KpiCard` dense (pastilles) — « Prochain point » (valeur = badge type COPROJ…), « Points ce trimestre », « Actions issues des points », « Décisions COPIL à appliquer »
- Liste UI (PDF 01–04) : cartes séance (date block / badges / meta / avatars / CTA « Préparer > ») + panneau « Continuité du pilotage »
- `POST …/reviews/:id/lock-agenda` \| `unlock-agenda`
- `GET|POST …/review-series` ; `GET|PATCH …/review-series/:id` ; `POST …/review-series/:id/generate`

## 6. Tests

- Table de vérité : `project-review-ui-state.spec.ts` (API + FE)
- Garde lock : `project-review-agenda-lock.spec.ts`
- Audits : `pnpm audit:ui-ids`, `pnpm audit:modals`

## 7. Récapitulatif

Livré L1–L5 : listes par état, KPI, figer ODJ, création typée (split PDF 13 + modale 14–16), séries + génération, seed démo. **Écran 08** : atelier ODJ (porteur / durée / type / docs par point), « Figer et passer à venir », reprise actions → ODJ, brief + diffusion. Dépendances aval : 013-6 (close-conduct / écran 09 — ✅), 013-8 (finalisation CR / 10-11-19 — ✅ F1–F5 + F3.1), 013-9 C1 (calendrier transverse — ✅).

## 8. Points de vigilance

- DocumentView FINALIZED non régressé.
- Onglet 04 peuplé après `close-conduct` (013-6 ✅) ; seed démo conserve des fixtures.- COPROJ = libellé UI uniquement (`COPRO` API).
- Generate ne mute jamais historiques / IN_PROGRESS / CANCELLED.

## 9. Conformité by design

- **RGPD** : `permanentParticipantUserIds` = IDs seuls ; audit lock/generate sans e-mail ; scope client.
- **RGAA** : `role="tablist"`, labels KPI, focus post-flash.
- **Design System** : `KpiCard`, `starium-tab-group`, `StariumModal`, loading/empty/error.
- **Sécurité** : RBAC + isolation client ; DTO class-validator ; audits sensibles.
- **Mobile** : tabs scroll horizontal ; KPI empilés ; cibles ≥ 44px.
