# Roadmap Starium Orchestra — Fin 2026 / 2027

**Document unique** de trajectoire produit. Détail opérationnel des chantiers : [`BACKLOG.md`](./BACKLOG.md).  
**Sources** : [`VISION_PRODUIT.md`](./VISION_PRODUIT.md), [`LIAISONS-MODULES.md`](./LIAISONS-MODULES.md), [`RFC/_RFC Liste.md`](./RFC/_RFC%20Liste.md).

---

## 1. Cadre

| Horizon | Objectif |
| --- | --- |
| **V1 Beta (2026)** | Prod multi-client : budgets, projets, liaisons critiques, vision, capa, Orion + Guide — sans CMDB / GED / LLM |
| **V1.1 (post go-live, 2026)** | Argent projet (events, RES-002), scénarios UI, réunions module, harden liaisons contrat |
| **Fin 2026** | Licences SI, Cartographie, IA analyse (lecture) |
| **2027** | CMDB, GED transverse |
| **2028+** | Connecteurs, Orchestra Finance / HR |

---

## 2. V1 Beta — go-live production (2026)

**Promesse** : un DSI à temps partagé pilote un client actif — budgets, projets, achats→ligne, vision, réunions/points, équipes/capa/temps, ACL, Orion + Guide (réponses préconfigurées).

### Modules IN

Auth/RBAC multi-client · ACL sièges · audit/alertes · Orion · Guide · Budgets + Financial Core · Achats→ligne · Projets · Project↔Budget · Intake/cycles · Vision (`PROJECT`) · Réunions/points (ponts) · Fournisseurs/contrats (MVP) · Équipes/capa/timesheet · M365 opt-in (sans Planner lot 5).

### OUT beta

Licences SI (037) · CMDB · GED · Cartographie · IA générative · Orchestra Finance/HR · timesheet→`FinancialEvent` · write StrategicLink BUDGET/RISK/CYCLE.

### Liaisons bloquantes

`project-budget` + `ui-line-projects` · `po-line` + `po-event` · `budget-event` · `vision-project` · `intake-project` · `cycle-*` · `meet-project` / `meet-cycle` · `project-capa` + `time-project` · `owner-org` + `acl-all` · alertes métier (RFC-038).

### Vagues (ordre)

| Vague | Focus | Exit |
| --- | --- | --- |
| **0** Gel socle | **Reste** : gate lint/typecheck/test monorepo · préprod MFA + smoke Orion (runbook §5). *Déjà en place* : index RFC-AI-001, seed Guide `premiers-pas`, specs isolation/no-match | Préprod bootable, zéro fuite client |
| **1** Argent | Smoke achats→ligne→KPI · articles Guide budget | Atterrissage + projets financés lisibles CODIR |
| **2** Portefeuille | PROJ-014→016 + FE · FE-CAPA-001 · Guide projets/capa | Portefeuille structuré + capa quotidienne |
| **3** UAT | Pack Guide Nouveaux clients · Orion fallback · FOU/ACL/alertes · release gate | **Go / No-Go prod** |

Adoption beta (Orion + Guide, [RFC-AI-001](./RFC/RFC-AI-001%20—%20Cursor%20Starium%20Chatbot%20Core.md)) : pack « Premiers pas » (kickoff seed + 7 articles min en Vague 3) ; pas de LLM ; pas d’actions métier depuis le chat.

### Go-live (checklist)

Produit : isolation 2 clients · budget (exercice→PA→alertes) · projet↔ligne↔KPI · achats→ligne · vision + cycle/réunion/demande · capa + temps · cloche · Orion matching/no-match · Guide Premiers pas.

Tech : CI `preprod` · secrets/env · guards client · chatbot allowlist · pas de DCP en logs · mobile ≥ 320px cockpits.

Doc : `API.md` §5.7a chatbot · RFC-AI-001 indexée · runbook préprod smoke Orion · pack Guide seedable (kickoff `premiers-pas` ; pack 7 art. = B3.1).

---

## 3. V1.1 — post go-live (encore 2026)

Fermer les trous d’argent et de décision sans ouvrir CMDB/GED :

- `gap-project-event` · RES-002 affectation + costing · contrat↔projet/budget  
- Scénarios SC UI · Project Sheet metrics / decision rules · FE arbitrage  
- Module **Réunions** (MEET-001 + FE)  
- Alertes budgétaires avancées · axes analytiques DAF-ready · Guide wizard first-run si besoin  
- M365 lot 5 / INT polish selon capacité  

---

## 4. Fin 2026

| Chantier | Notes |
| --- | --- |
| **RFC-037** Licences SI | Ponts contrats / budgets / projets |
| **Cartographie** (Atlas) | Overlay relations — lit les ponts, ne duplique pas |
| **IA analyse** | Insights lecture seule + audit ; ≠ Orion matching ; pas de DCP en clair vers LLM |
| Timeline multi-domaines | RFC-032 / `fut-timeline` |

---

## 5. 2027

| Chantier | Notes |
| --- | --- |
| **CMDB** | Apps, BDD, domaines, certificats, téléphonie |
| **GED** transverse | Documents cross-modules + `SupplierQuotation` · preuves conformité→GED |

---

## 6. 2028+ (hors planification détaillée)

Hub connecteurs API · Orchestra Finance (DAF) · Orchestra HR / SIRH→capacité.

---

## 7. Règles transverses

- Isolation multi-client + RBAC sur chaque livraison.  
- Standards by design : RGPD, RGAA, Design System, sécu, mobile-first.  
- Graphiques = données API uniquement.  
- Catalogue ponts : [`LIAISONS-MODULES.md`](./LIAISONS-MODULES.md) — source de vérité technique ; ce fichier donne l’**horizon**, le backlog les **items**.

---

*Un seul fichier roadmap. Un seul fichier backlog. Pas de doublon V1-BETA / RESTE-A-FAIRE.*
