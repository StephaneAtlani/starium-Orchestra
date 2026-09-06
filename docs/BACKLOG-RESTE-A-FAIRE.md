# Backlog — tout ce qui reste à faire

**Date** : 2026-09 · Aligné [`ROADMAP-V1-BETA.md`](./ROADMAP-V1-BETA.md) + [`LIAISONS-MODULES.md`](./LIAISONS-MODULES.md) + [`RFC/_RFC Liste.md`](./RFC/_RFC%20Liste.md).

Légende horizon :

| Tag | Signification |
| --- | --- |
| **B0–B3** | Vagues beta go-live (obligatoire sauf mention NTH) |
| **NTH** | Nice-to-have beta (si capacité) |
| **V1.1** | Post go-live (trimestre suivant) |
| **F26** | Fin 2026 |
| **27+** | 2027 et au-delà |
| **VIS** | Vision long terme (pas daté) |

---

## A. Beta — obligatoire (bloquant go-live)

### A.1 Vague 0 — Gel socle

| # | Item | Ref |
| --- | --- | --- |
| B0.1 | Push / merge **RFC-PROJ-010-B** (commit local) + smoke UI drawer + fiche budget | 010-B |
| B0.2 | Gate technique : lint / typecheck / test / `audit:ui-ids` / `audit:modals` | release-gate |
| B0.3 | Préprod bootable + smoke multi-client + MFA | runbook préprod |
| B0.4 | Clôturer **RFC-STRAT-010** (QA vision) | STRAT-010 |
| B0.5 | **Orion** : smoke drawer (authz client, no-match, historique, isolation) | AI-001 |
| B0.6 | **Guide** : inventaire KB + kickoff pack Premiers pas | AI-001 |
| B0.7 | Indexer **RFC-AI-001** dans `_RFC Liste` + statut aligné code | doc |

### A.2 Vague 1 — Argent & PA

| # | Item | Ref |
| --- | --- | --- |
| B1.1 | **RFC-BUD-041 lot 6** — activation PA / arbitrage | BUD-041 |
| B1.2 | Widget KPI projets sur `/budgets/dashboard` | 010-B follow-up |
| B1.3 | Smoke achats → ligne → KPI (runbook) | `po-line` |
| B1.4 | Articles Guide budget / atterrissage (≥ 2) | Guide |

### A.3 Vague 2 — Portefeuille CODIR

| # | Item | Ref |
| --- | --- | --- |
| B2.1 | **RFC-PROJ-014** — catégories portefeuille | PROJ-014 |
| B2.2 | **RFC-PROJ-015** — rattachement projet (± activité) | PROJ-015 |
| B2.3 | **RFC-PROJ-016** — agrégats KPI par catégorie | PROJ-016 |
| B2.4 | **RFC-FE-PROJ-008 / 009 / 010** (+ 011B si activité) — UI arbre / filtres / sélecteur | FE portefeuille |
| B2.5 | **RFC-FE-CAPA-001** — polish page capacité (encarts risque/plan, DS) | FE-CAPA-001 |
| B2.6 | Articles Guide projets / capacité + matching Orion | Guide |

### A.4 Vague 3 — Adoption, harden, UAT

| # | Item | Ref |
| --- | --- | --- |
| B3.1 | Pack **Guide** « Nouveaux clients » publié (7 articles + FAQ UAT) | Guide |
| B3.2 | **Orion** : fallback + featured + feedback support OK | Orion |
| B3.3 | FOU-026 / FOU-027 — finitions ciblées (pas refonte) | FOU |
| B3.4 | Alertes : revue couverture + seuils budget | RFC-038 |
| B3.5 | ACL smoke OWN/SCOPE projets/budgets + cockpit accès | ACL |
| B3.6 | Seeds démo multi-modules stables | seed |
| B3.7 | Documenter limites M365 (pas lot 5) | INT-010 |
| B3.8 | Release gate + UAT clients (login → Guide → 1er budget/projet) | go-live |
| B3.9 | Doc : API.md chatbot, LIAISONS, runbook passage prod, pack Guide seedable | doc |

---

## B. Beta — nice-to-have (si capacité)

| # | Item | Ref |
| --- | --- | --- |
| NTH.1 | Triggers alertes **Achats** / **Capacité** | RFC-038 partial |
| NTH.2 | `task-line` — afficher FK tâche/activité → ligne (sans event) | LIAISONS |
| NTH.3 | `docs-project` — liste documents projet lisible (silo) | PROJ-DOC-001 |
| NTH.4 | BUD-043 L3 (KPI / timeline hub import) | BUD-043 |
| NTH.5 | Import polish gros fichiers / export | BUD-043 / 018 |

---

## C. Vague 4 / buffer pendant beta (non bloquant)

| # | Item | Ref |
| --- | --- | --- |
| BUF.1 | Rédaction RFC **`gap-project-event`** (design only) | PROJ-010 §6 |
| BUF.2 | Spike **RFC-RES-002** (1–2 j) | RES-002 |
| BUF.3 | Notes dettes SC UI / sheet metrics (pas d’impl forcée) | SC / PROJ-012 |

---

## D. V1.1 — post go-live

### D.1 Liaisons à fermer

| # | Id liaison | Chantier |
| --- | --- | --- |
| V11.L1 | `gap-project-event` | FinancialEvent source PROJECT |
| V11.L2 | `gap-time-event` | Timesheet × dailyRate → Financial |
| V11.L3 | `gap-res-assign` | Affectation ressources projets |
| V11.L4 | `gap-contract-budget` | Contrat → ligne / event CONTRACT |
| V11.L5 | `gap-contract-project` | Lien contrat ↔ projet |
| V11.L6 | `task-line` (suite) | Event auto depuis tâche si modèle OK |
| V11.L7 | `fut-ms-lot5` | Planner / dossier / sync auto |
| V11.L8 | `fut-axes-po` | Splits analytiques au-delà de la ligne |
| V11.L9 | `fut-proj-020` | Roll-up parent / enfants |

### D.2 Modules / RFC produit

| # | Item | Ref |
| --- | --- | --- |
| V11.1 | **RFC-RES-002** Assignment + Costing + **FE-PROJ-005** | RES-002 |
| V11.2 | Project Sheet **Metrics** + **Decision Rules** | PROJ-012 suite |
| V11.3 | **RFC-PROJ-022** validation fiche (+ 021 historique si besoin) | PROJ-022 |
| V11.4 | Scénarios **SC-*** cockpit UI (SC-002 partial → UI ; SC-001→007) | PROJ-SC |
| V11.5 | FE-PROJ-014 finitions arbitrage CODIR | FE-PROJ-014 |
| V11.6 | Project ↔ Supplier + FE-PROJ-007 | futur / FE |
| V11.7 | Alerting budgétaire avancé (règles configurables) | plan Budget |
| V11.8 | Workflow budgétaire processus (DAF/DG, files) | plan Budget |
| V11.9 | Axes analytiques reporting DAF-ready | RFC-021 |
| V11.10 | Guide **wizard first-run** interactif | Guide V1.1 |
| V11.11 | Steward ownership extension hors Projet | ORG-004 hors V1 |
| V11.12 | ACL-015 OWN/SCOPE enforcement complet | ACL-015/024 suite |
| V11.13 | INT-010 fiabilisation queue / stale (lot 2) | INT-010 |
| V11.14 | INT-009 UI statuts sync documents | INT-FE-009 |
| V11.15 | BUD-043 L4 / BUD-044 automatisation import | budget |
| V11.16 | Vue multi-client DSI fractional (reporting) | plan Budget |
| V11.17 | RFC-039 recherche transversale (si draft → impl) | RFC-039 |

### D.3 Réunions (module neuf)

| # | Item | Ref |
| --- | --- | --- |
| V11.M1 | **RFC-MEET-001** backend réunions CODIR/COPIL/COPRO | MEET-001 Draft |
| V11.M2 | **RFC-FE-MEET-001** UI préparation / conduite / présent | FE-MEET-001 Draft |

*(Aujourd’hui : points projet / ponts live ; module Réunions catalogue = encore Draft.)*

---

## E. Fin 2026

| # | Item | Ref / liaison |
| --- | --- | --- |
| F26.1 | **RFC-037** Licences SI + ponts contrats/budgets/projets | `fut-license-*` |
| F26.2 | Cartographie (Atlas overlay) | `atlas-*` |
| F26.3 | IA analyse (insights lecture seule) — **≠ Orion** | `ai-*` |
| F26.4 | Timeline multi-domaines | `fut-timeline` / RFC-032 |

---

## F. 2027+

| # | Item | Ref / liaison |
| --- | --- | --- |
| 27.1 | CMDB (apps, BDD, domaines, certificats, téléphonie) | `fut-cmdb-*` |
| 27.2 | GED transverse + devis `SupplierQuotation` | `fut-ged-*` / `fut-quotation` |
| 27.3 | Preuves conformité → GED | `fut-evidence-ged` |

---

## G. 2028+ / Vision

| # | Item | Ref |
| --- | --- | --- |
| VIS.1 | Hub connecteurs API externes | `conn-*` |
| VIS.2 | Orchestra Finance (DAF) | `fut-finance` |
| VIS.3 | Orchestra HR / SIRH → capacité | `fut-hr` |

---

## H. Dettes / partiels à ne pas oublier (hors vagues)

| Domaine | Reste | Horizon typique |
| --- | --- | --- |
| Budget cockpit « CODIR-ready » | Finition widgets / explicabilité cellule | NTH → V1.1 |
| RFC-024 UI | Scénarios planning avancés, saisie de masse | V1.1 |
| RES-001 catalogue | Partiel | V1.1 avec RES-002 |
| INT-006 sélection ressources Graph | Partiel | V1.1 |
| StrategicLink BUDGET/RISK write | Rejeté MVP STRAT | V1.1 / F26 |
| MANUEL-* sync contenu Guide | Pointer depuis articles | B3 |

---

## I. Compteurs (ordre de grandeur)

| Horizon | Items listés |
| --- | --- |
| Beta obligatoire (A) | ~26 |
| Nice-to-have beta (B) | 5 |
| Buffer (C) | 3 |
| V1.1 (D) | ~28 |
| Fin 2026 (E) | 4 |
| 2027+ (F) | 3 |
| Vision (G) | 3 |

**Total tracké** : ~70 chantiers (certains regroupables).

---

## J. Ordre d’attaque immédiat

1. B0.1 Push 010-B  
2. B0.2–B0.7 Vague 0  
3. B1.* → B2.* → B3.*  
4. En parallèle buffer BUF.1–2 (doc only)  
5. Après go-live : V11.L1 + V11.1 (argent projet) puis MEET / SC  

Canvas : `backlog-reste-a-faire.canvas.tsx` (filtre par horizon).
