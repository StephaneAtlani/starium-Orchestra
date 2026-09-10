# RFC-PROJ-013-7 — Listes par état, Séries et Préparation (écrans 01–08, 13–17)

| | |
| --- | --- |
| **Statut** | 📝 Draft |
| **Date** | 2026-09-10 |
| **Parents** | RFC-PROJ-013-5 |
| **Écrans PDF** | **01–08**, **06**, **07**, **13–17** |
| **Scope** | Sous-onglets À préparer / À venir / En cours / À finaliser / Historique / Séries ; KPI ; création typée ; préparation + figer ODJ |

## 1. Analyse de l’existant

- `project-reviews-tab.tsx` : liste unique filtrée par status API, pas les 5 états UI PDF.
- Création : `project-review-create-dialog.tsx` (ODJ + questions seed 013-4) — pas split button typé ni defaults COPROJ/COPIL distincts (14/15).
- Préparation : phase `prepare` single-tab — **pas** d’action métier « Figer l’ordre du jour ».
- Séries récurrentes : absentes côté `ProjectReview` (cadence = saisie manuelle / reprise).

## 2. Hypothèses

1. Sous-onglets = filtres UI sur mapping 013-5 §4 (+ compteurs).
2. KPI tête (01) : prochain point, volume trimestre, actions issues, décisions COPIL à appliquer — agrégats API ou dérivés liste (préciser endpoint).
3. Séries (06) = nouvelle entité `ProjectReviewSeries` (client + project scoped) générant des `ProjectReview` SCHEDULED — V1 peut être « modèle de récurrence » minimal.
4. « Créer et préparer » vs « Créer » (14) = `onCreated(openEditor)` déjà partiel.

## 3. Cible fonctionnelle

### Listes 01–05
- 4 KPI (01) ; colonnes date, type, cadence, participants, état préparation.
- 03 : heure démarrage, avancement ODJ, présence ; CTA **Reprendre la conduite** → 09.
- 04 : signal arbitrages sans verdict / actions sans porteur ou échéance.
- 05 : décisions actées + actions ouvertes ; Consulter → 19.

### Séries 06
- Type, fréquence, durée, salle, équipe permanente ; génération séances futures ; ne pas altérer historiques.

### Création 07 / 13–17
- Split : défaut COPROJ ; menu COPROJ/COPIL/COTECH/CODIR/Revue/Ad hoc avec cadence/audience/durée annoncées.
- Modales préremplies (14–16) ; flash liste 1,6 s (17).

### Préparation 08
- Reprise actions/décisions non soldées ; porteur + durée + type par sujet ; docs par point ; brief diffusable.
- **Figer ODJ** → état UI À venir (`agendaLockedAt`).

## 4. Fichiers

| Zone | Chemins typiques |
| --- | --- |
| FE listes | `project-reviews-tab.tsx` ; nouveaux sous-composants filtres/KPI |
| FE création | `project-review-create-dialog.tsx` ; split button cycles/fiche |
| FE préparation | editor phase prepare ; CTA Figer ODJ |
| API | reviews list filters ; `POST …/lock-agenda` ; CRUD series (si lot séries) |
| Prisma | `agendaLockedAt` ; modèle Series (lot dédié) |

## 5. Lots

| Lot | Contenu |
| --- | --- |
| L1 | Sous-onglets 01–05 + mapping + CTA conduite / finaliser / consulter |
| L2 | KPI tête + badges consolidation COPIL |
| L3 | Figer ODJ (API + UI 08) |
| L4 | Split création + defaults par type (13–16) |
| L5 | Séries 06 (Prisma + génération) |

## 6. Prisma

- Minimal L3 : `ProjectReview.agendaLockedAt DateTime?`
- L5 : `ProjectReviewSeries` + `seriesId` nullable sur review
- Statut `AWAITING_REPORT` **ou** `conductClosedAt` — décider avec 013-6/013-8

## 7. Tests

- Filtres états UI (table de vérité).
- Lock agenda : refuse mutation structure ODJ si locked (sauf admin reopen).
- Isolation client sur series.

## 8. Récapitulatif

Socle listes + préparation + création typée du PDF ; dépendance amont de 09/11.

## 9. Points de vigilance

- Ne pas casser DocumentView FINALIZED (05/19).
- Seed démo : données pour chaque sous-onglet.
- Performance : KPI sans N+1.

## 10. Conformité by design

- **RGPD** : participants série = DCP ; minimisation ; scope client.
- **RGAA** : tabs listes ; labels KPI ; focus après création.
- **Design System** : FilterBar / tab group Starium ; StariumModal création.
- **Sécurité** : lock agenda audité ; RBAC.
- **Mobile** : sous-onglets scroll horizontal ; KPI empilés.
