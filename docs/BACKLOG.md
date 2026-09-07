# Backlog — reste à faire

**Date** : 2026-09-07 · Aligné [`ROADMAP.md`](./ROADMAP.md) + [`LIAISONS-MODULES.md`](./LIAISONS-MODULES.md) + [`API.md`](./API.md) §5.7a.

Liste **uniquement** du travail restant (pas de historique « fait »). Trajectoire / horizons : [`ROADMAP.md`](./ROADMAP.md).

| Tag | Horizon |
| --- | --- |
| **B0–B3** | V1 Beta (vagues) |
| **NTH** | Nice-to-have beta |
| **BUF** | Buffer pendant beta |
| **V11** | V1.1 post go-live |
| **F26** | Fin 2026 |
| **27** | 2027 |
| **VIS** | 2028+ |

---

## A. V1 Beta — obligatoire

### Vague 0 — Gel socle

| # | Item | Ref |
| --- | --- | --- |
| B0.2 | Gate technique : lint / typecheck / test / `audit:ui-ids` / `audit:modals` | release-gate |
| B0.3 | Préprod bootable + smoke multi-client + MFA (+ smoke Orion runbook §5) | runbook préprod |

### Vague 1 — Argent & PA

| # | Item | Ref |
| --- | --- | --- |
| B1.3 | Smoke achats → ligne → KPI (runbook) | `po-line` |
| B1.4 | Articles Guide budget / atterrissage (≥ 2) | Guide |

### Vague 2 — Portefeuille CODIR

| # | Item | Ref |
| --- | --- | --- |
| B2.1 | **RFC-PROJ-014** — catégories portefeuille | PROJ-014 |
| B2.2 | **RFC-PROJ-015** — rattachement projet (± activité) | PROJ-015 |
| B2.3 | **RFC-PROJ-016** — agrégats KPI par catégorie | PROJ-016 |
| B2.4 | **RFC-FE-PROJ-008 / 009 / 010** (+ 011B si activité) | FE portefeuille |
| B2.5 | **RFC-FE-CAPA-001** — polish page capacité | FE-CAPA-001 |
| B2.6 | Articles Guide projets / capacité + matching Orion | Guide |

### Vague 3 — Adoption, harden, UAT

| # | Item | Ref |
| --- | --- | --- |
| B3.1 | Pack **Guide** « Nouveaux clients » (7 articles + FAQ UAT) | Guide |
| B3.2 | **Orion** : fallback + featured + feedback support | Orion |
| B3.3 | FOU-026 / FOU-027 — finitions ciblées | FOU |
| B3.4 | Alertes : revue couverture + seuils budget | RFC-038 |
| B3.5 | ACL smoke OWN/SCOPE + cockpit accès | ACL |
| B3.6 | Seeds démo multi-modules stables | seed |
| B3.7 | Documenter limites M365 (pas lot 5) | INT-010 |
| B3.8 | Release gate + UAT clients | go-live |
| B3.9 | Doc : API chatbot, LIAISONS, runbook prod, pack Guide seedable | doc |

---

## B. V1 Beta — nice-to-have

| # | Item | Ref |
| --- | --- | --- |
| NTH.1 | Triggers alertes Achats / Capacité | RFC-038 |
| NTH.2 | `task-line` — afficher FK tâche→ligne (sans event) | LIAISONS |
| NTH.3 | `docs-project` — liste documents projet (silo) | PROJ-DOC-001 |
| NTH.4 | BUD-043 L3 (KPI / timeline hub import) | BUD-043 |
| NTH.5 | Import polish gros fichiers / export | BUD-043 / 018 |

---

## C. Buffer pendant beta

| # | Item | Ref |
| --- | --- | --- |
| BUF.1 | Rédaction RFC `gap-project-event` (design only) | PROJ-010 §6 |
| BUF.2 | Spike **RFC-RES-002** (1–2 j) | RES-002 |
| BUF.3 | Notes dettes SC UI / sheet metrics | SC / PROJ-012 |
| BUF.4 | **RFC-PROJ-013-3** — Lot 0+A sans comité. Note arbitrage D1–D7. Dump ops avant C6 seed. C9 → 013-4 | PROJ-013-3 |

---

## D. V1.1 — post go-live

### Liaisons

| # | Id | Chantier |
| --- | --- | --- |
| V11.L1 | `gap-project-event` | FinancialEvent source PROJECT |
| V11.L2 | `gap-time-event` | Timesheet × dailyRate |
| V11.L3 | `gap-res-assign` | Affectation ressources projets |
| V11.L4 | `gap-contract-budget` | Contrat → ligne / event |
| V11.L5 | `gap-contract-project` | Lien contrat ↔ projet |
| V11.L6 | `task-line` (suite) | Event auto si modèle OK |
| V11.L7 | `fut-ms-lot5` | Planner / dossier / sync |
| V11.L8 | `fut-axes-po` | Splits analytiques |
| V11.L9 | `fut-proj-020` | Roll-up parent / enfants |

### Produit

| # | Item | Ref |
| --- | --- | --- |
| V11.1 | **RFC-RES-002** + FE-PROJ-005 | RES-002 |
| V11.2 | Project Sheet Metrics + Decision Rules | PROJ-012 |
| V11.3 | **RFC-PROJ-022** (+ 021 si besoin) | PROJ-022 |
| V11.4 | Scénarios SC UI | PROJ-SC |
| V11.5 | FE-PROJ-014 arbitrage CODIR | FE-PROJ-014 |
| V11.6 | Project ↔ Supplier + FE-PROJ-007 | FE |
| V11.7 | Alerting budgétaire avancé | plan Budget |
| V11.8 | Workflow budgétaire DAF/DG | plan Budget |
| V11.9 | Axes analytiques DAF-ready | RFC-021 |
| V11.10 | Guide wizard first-run | Guide |
| V11.11 | Steward ownership hors Projet | ORG-004 |
| V11.12 | ACL OWN/SCOPE enforcement complet | ACL-015/024 |
| V11.13 | INT-010 queue / stale | INT-010 |
| V11.14 | INT-009 UI sync documents | INT-FE-009 |
| V11.15 | BUD-043 L4 / BUD-044 | budget |
| V11.16 | Vue multi-client DSI fractional | plan Budget |
| V11.17 | RFC-039 recherche transversale | RFC-039 |
| V11.M1 | **RFC-MEET-001** backend réunions | MEET-001 |
| V11.M2 | **RFC-FE-MEET-001** UI réunions | FE-MEET-001 |

---

## E. Fin 2026

| # | Item | Ref |
| --- | --- | --- |
| F26.1 | **RFC-037** Licences SI + ponts | `fut-license-*` |
| F26.2 | Cartographie (Atlas) | `atlas-*` |
| F26.3 | IA analyse (≠ Orion) | `ai-*` |
| F26.4 | Timeline multi-domaines | RFC-032 |

---

## F. 2027

| # | Item | Ref |
| --- | --- | --- |
| 27.1 | CMDB | `fut-cmdb-*` |
| 27.2 | GED + `SupplierQuotation` | `fut-ged-*` |
| 27.3 | Preuves conformité → GED | `fut-evidence-ged` |

---

## G. 2028+

| # | Item | Ref |
| --- | --- | --- |
| VIS.1 | Hub connecteurs API | `conn-*` |
| VIS.2 | Orchestra Finance | `fut-finance` |
| VIS.3 | Orchestra HR / SIRH → capa | `fut-hr` |

---

## H. Dettes / partiels

| Domaine | Reste | Horizon |
| --- | --- | --- |
| Budget cockpit CODIR-ready | Widgets / explicabilité | NTH → V11 |
| RFC-024 UI | Planning avancé, saisie masse | V11 |
| RES-001 catalogue | Partiel | V11 + RES-002 |
| INT-006 Graph ressources | Partiel | V11 |
| StrategicLink BUDGET/RISK/CYCLE write | Hors write V1 | V11 / F26 |
| MANUEL-* ↔ Guide | Liens depuis articles | B3 |

---

## Ordre d’attaque

1. B0.2–B0.3 — gate monorepo + préprod MFA / smoke Orion manuel  
2. B1.3–B1.4 → B2.* → B3.*  
3. BUF.1–2 en parallèle (doc)  
4. Après go-live : V11.L1 + V11.1 puis MEET  
