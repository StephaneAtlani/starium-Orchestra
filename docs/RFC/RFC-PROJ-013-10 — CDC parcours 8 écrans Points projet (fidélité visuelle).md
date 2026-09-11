# RFC-PROJ-013-10 — CDC parcours 8 écrans Points projet (fidélité visuelle)

| | |
| --- | --- |
| **Statut** | 📝 Draft — **source produit active** pour le parcours linéaire |
| **Date** | 2026-09-11 |
| **Parents** | RFC-PROJ-013-5 (catalogue 20 écrans — historique) ; 013-6 ; 013-7 ; 013-8 |
| **Source produit** | [*Points projet — Cahier des charges · Écrans*](./_sources/Point_projet-CDC-ecrans.pdf) (24 p., 11 sept. 2026) |
| **Règle UX** | **Zéro écart visuel** avec les captures / plans du CDC (zones, libellés, pieds de modale, pastilles, messages exacts). Toute livraison d’écran = maquette CDC + critères de recette annexes. |

---

## 1. Analyse de l’existant

| Couche | État | Écart vs CDC 8 écrans |
| --- | --- | --- |
| Dashboard (listes / KPI / cartes) | 013-7 + itérations UI | Messages vides / retard / squelettes partiels ; CTA « Préparer › » ok |
| Créer (modale) | 013-7 split + defaults | Pas pastilles types CDC ; pas ODJ éditable inline ; pas toast undo 6 s ; champs horaire/lieu absents ou hérités série |
| Préparer | Éditeur + ODJ | Pas compteur durée cumulée ; porteur/nature incomplets ; figer n’ouvre pas systématiquement convocation 04 |
| Convocation | Invitations / e-mail | Pas aperçu 2 volets vivant ; pas suivi nominatif réponses dans prépa |
| Démarrer | Absent | CDC **écran à créer** (émargement) |
| Animer | 013-6 | À aligner libellés / stepper / messages |
| Clôture | `closeConduct` direct | CDC **écran à créer** (3 contrôles bloquants) |
| CR & diffusion | 013-8 | À aligner édition live + verrouillage post-diffusion |

**Numérotation** : le CDC **remplace** le découpage 01–20 de 013-5 pour le **parcours d’une instance**. Le catalogue 20 écrans reste référence pour Séries / Cycles / Calendrier (hors périmètre CDC §24).

### Mapping CDC ↔ anciens # PDF 013-5

| CDC | Ancien # (approx.) | Nature |
| --- | --- | --- |
| 01 Dashboard | 01–05 listes | Onglet |
| 02 Créer | 07 / 13–17 | Modale |
| 03 Préparer | 08 | Modale / écran travail |
| 04 Convocation | (implicite invitations) | Modale 2 volets |
| 05 Démarrer | — | **Nouveau** |
| 06 Déroulement | 09 | Écran live |
| 07 Clôture | — | **Nouveau** |
| 08 CR & diffusion | 11 / 19 | Écran travail |

---

## 2. Hypothèses (à trancher avant recette, pas avant P1)

1. **Émargement** : seul l’animateur positionne Présent / Absent / Excusé (participant n’émarge pas lui-même) — défaut V1.
2. **Diffusion CR** : `projects.update` suffit (animateur / éditeurs projet).
3. **Relance J-2** : option cochable à la convocation (pas systématique forcée).
4. **COTECH** : hors V1 (comme 013-7) ; pastilles CDC : COPROJ · COPIL · CODIR · Revue · Ad hoc.
5. **Fidélité visuelle** : `StariumModal` + tokens ; **interdiction** de « équivalent » libre (pas de Dialog* feature, pas de pied de modale inventé). Source = captures CDC pages plan.

---

## 3. Parcours linéaire (schéma)

```text
01 Dashboard
    │ Créer un point
    ▼
02 Créer ──« Créer »──► 01 (flash + toast)
    │
    └──« Créer et préparer »──► 03 Préparer
                                    │ « Figer l'ordre du jour »
                                    ▼
                               04 Convocation ──envoi──► 03 (suivi) · point « À venir »
                                    │
                         « Démarrer › » (J0 ±30 min)
                                    ▼
                               05 Démarrer (émargement)
                                    │ « Démarrer la séance »
                                    ▼
                               06 Déroulement
                                    │ « Clôturer la séance »
                                    ▼
                               07 Clôture (contrôles)
                                    │ « Confirmer la clôture »
                                    ▼
                               08 CR & diffusion ──« Diffuser »──► Historique (lecture)

Retours autorisés : 04→03 (réouvrir ODJ + renotif) ; 08 édition avant diffusion.
Interdits : dé-démarrer ; réécrire CR après diffusion (rectificatif hors scope CDC).
```

### États UI (inchangés vs 013-7)

| État UI | Condition API |
| --- | --- |
| À préparer | `(PREPARING\|SCHEDULED)` ∧ `agendaLockedAt = null` |
| À venir | `SCHEDULED` ∧ ODJ figé |
| En cours | `IN_PROGRESS` ∧ `conductClosedAt = null` |
| À finaliser | `IN_PROGRESS` ∧ `conductClosedAt != null` |
| Historique | `FINALIZED` \| `CANCELLED` |

**Précision CDC** : passage À préparer → À venir à **l’envoi des convocations** (04), pas seulement au lock isolé. V1 : `lock-agenda` + envoi invitation atomique côté service (ou lock au succès d’envoi).

---

## 4. Spécification par écran (contrats)

### 01 — Dashboard

- Zones : KPI (4) · sous-onglets + compteurs · cartes séance · Continuité du pilotage · CTA créer.
- Interactions / messages exacts : CDC p.5 + annexe R01.*
- **DoD visuel** : carte = date block or · titre · badges · meta · avatars · CTA doré aligné verticalement.

### 02 — Créer un point (modale)

Zones CDC (plan p.6) :

1. En-tête `Créer un point projet` + sous-titre + croix  
2. Type — pastilles segmentées (ambre sur sélection)  
3. Titre  
4. Objectif  
5. Équipe/série + Date  
6. Modèle d’ODJ  
7. Pied : Annuler · **Créer et préparer** (primaire encre) — + **Créer** (secondaire) si on conserve le retour dashboard (CDC p.7 le décrit ; p.6 note un écart maquette)

Validations bloquantes / toasts : CDC p.7 + R02.*  
**DoD visuel** : capture p.6 — pastilles, grille, pied StariumModal (Annuler gauche, primaire droite).

### 03 — Préparer

Zones CDC p.8 : en-tête · bandeau séance · ODJ (+ ajouter) · supports · points à arbitrer · panneau reprise · pied (brouillon / démarrer / figer→04).  
Contrôles bloquants / durée cumulée : p.9 + R03.*  
**DoD visuel** : numéros ambre, poignées, compteur `cumul / durée séance` (ambre si dépassement, jamais rouge).

### 04 — Convocation

Modale 2 volets : options + aperçu vivant (sigle, ODJ, PJ, .ics).  
Envoi → état À venir + suivi nominatif dans 03. R04.*

### 05 — Démarrer (**nouveau**)

Écran centré ~880 px : émargement · ODJ lecture · priorités · barre d’action. R05.*  
Prisma : positions présence déjà partiellement via `attendanceStatus` — compléter si besoin.

### 06 — Déroulement

Alignement 013-6 sur messages / stepper CDC p.14–15. R06 (annexe 3).

### 07 — Clôture (**nouveau**)

Écran ~900 px : bilan · À corriger (bloquant) · À signaler · émargement définitif · remontées.  
3 contrôles bloquants CDC p.16–17. R07.*

### 08 — CR & diffusion

Alignement 013-8 : édition live, diffusion, verrouillage. R08.*

---

## 5. Plan de développement (ordre d’exécution — **à suivre**)

> Chaque phase = code + tests + **revue visuelle vs PNG CDC** (`docs/RFC/_sources/Point_projet-CDC-ecrans.pdf` / extrait `/tmp/point-projet-cdc`) + critères Rxx de l’annexe.  
> **Gate** : `pnpm audit:modals` · `pnpm audit:ui-ids` · typecheck workspace touché.

### Phase P0 — Socle doc & garde-fous (cette RFC)

- [x] Archiver CDC PDF sous `_sources/`
- [x] Publier RFC-PROJ-013-10 + index `_RFC Liste`
- [ ] Pointer 013-5 / 013-7 vers cette RFC comme source active parcours

### Phase P1 — 02 Créer (fidélité modale)

- [x] Refondre `project-review-create-dialog.tsx` zone par zone (pastilles type, titre, objectif, série/date, modèle ODJ).
- [x] Defaults / placeholders / libellés modèle ODJ dans `project-review-create-defaults.ts`.
- [x] Validations messages exacts CDC.
- [x] Toast « … créé. » + actions Préparer / Annuler la création 6 s (cancel API).
- [x] Tests Vitest helpers + mapping presets Revue / Ad hoc.

**Prisma** : templates code V1 (presets) — pas de migration P1.

### Phase P2 — 03 Préparer + chaîne figer → 04

- [x] UI préparation = zones CDC (bandeau, ODJ, supports, arbitrages, reprise).
- [x] Compteur durée cumulée (ambre si dépassement).
- [x] Contrôles bloquants avant figer (FE + `lockAgenda` API).
- [x] CTA « Figer l’ordre du jour » → coquille 04 (schedule + lock + invite à l’envoi).
- [x] Tests guards Vitest / Jest + DELETE agenda item.

### Phase P3 — 04 Convocation ← **prochaine**

1. Modale 2 volets aperçu vivant.  
2. Envoi = lock + invitations + passage À venir.  
3. Suivi réponses dans 03.  
4. Relance J-2 optionnelle (job BullMQ si absent).

### Phase P4 — 05 Démarrer + 07 Clôture (nouveaux écrans)

1. Route / écran 05 + API start inchangée enrichie émargement initial.  
2. Écran 07 avant `closeConduct` / finalize.  
3. Wiring CTA dashboard « Démarrer › » dans la fenêtre ±30 min.

### Phase P5 — 06 + 08 alignement + 01 polish

1. Messages / layout 06 vs CDC.  
2. 08 diffusion / verrou.  
3. 01 messages vides exacts, retard, squelettes 4+3.

### Phase P6 — Recette annexe complète

Checklist R01–R08 ; go/no-go release.

---

## 6. Fichiers (cible)

| Zone | Chemins |
| --- | --- |
| FE create | `project-review-create-dialog.tsx`, `project-review-create-defaults.ts`, `project-review-create-split-button.tsx` |
| FE prepare / animate | `project-review-editor-dialog.tsx`, `review-agenda-section.tsx`, `project-review-animate-session.tsx` |
| FE list | `project-reviews-tab.tsx`, `project-reviews-table.tsx`, `project-reviews-kpi-row.tsx`, `project-reviews-continuity-panel.tsx` |
| FE new | `project-review-start-screen.tsx` (05), `project-review-close-screen.tsx` (07), `project-review-convocation-dialog.tsx` (04) |
| API | `project-reviews.service.ts`, invitations, lock-agenda, start, closeConduct, finalize |
| Prisma | au besoin : templates ODJ, champs suivi convocation / relance |
| Doc | `docs/API.md`, `docs/INVENTAIRE-COMPOSANTS.md`, cette RFC |

---

## 7. Modifications Prisma (si P1/P3 l’exigent)

| Besoin | Proposition |
| --- | --- |
| Modèles ODJ par type | Table `ProjectReviewAgendaTemplate` (`clientId`, `reviewType`, items JSON) **ou** seed code V1 |
| Relance J-2 | `inviteReminderAt` / job queue sur participants |
| Suivi RSVP | Champs participants existants (`attendanceStatus`, `lastInvitedAt`) — compléter si manquant |

Pas de migration bloquante pour démarrer P1 (templates en code autorisés V1).

---

## 8. Tests

- Unitaires : validations create, lock+invite atomique, start refuse ODJ non figé, close refuse 3 contrôles.  
- Isolation client sur toute mutation.  
- FE : labels métier (pas d’ID), `audit:modals` = 0 Dialog feature.  
- Recette manuelle : PNG CDC page plan vs screenshot écran.

---

## 9. Conformité by design

- **RGPD** : e-mails participants uniquement pour envoi convocation/CR ; logs sans e-mail en clair ; scope `clientId`.  
- **RGAA** : focus ouverture modale (intitulé présélectionné) ; `aria-invalid` + messages exacts ; cibles ≥ 44 px.  
- **Design System** : `StariumModal`, `.starium-form-*`, tokens `--control-*` (bordures grises secondaires), pastilles type ambre — **pas** de chrome inventé.  
- **Sécurité** : RBAC `projects.read` / `projects.update` ; DTO class-validator ; audit create / lock / invite / start / close / finalize.  
- **Mobile** : modales centrées Starium ; cartes liste empilées ; pieds d’action sticky si besoin.

---

## 10. Récapitulatif / vigilance

- Cette RFC **pilote** le développement ; 013-7 reste « socle listes/séries » mais n’est plus la vérité UX création/préparation.  
- Hors périmètre CDC : séries config, calendrier, cycles multi-projets, transcription IA (annexe p.24).  
- Risque : dualité « Créer » vs « Créer et préparer seul » — trancher en P1 en favorisant **les deux CTAs** (p.7 comportement) pour ne pas régresser le retour dashboard.

---

## 11. Critères de non-régression visuelle (gate)

Pour chaque écran livré :

1. Zones numérotées CDC présentes et dans le même ordre.  
2. Libellés d’en-tête / pied / messages = texte CDC (pas paraphrase).  
3. Primaire = encre (`--control-active-bg`) ; secondaires bordés `--control-border`.  
4. Aucun écart « on verra plus tard » sur la modale — sinon phase **non done**.
