# Roadmap V1 Beta — Starium Orchestra en production

**Statut** : proposition de périmètre produit (2026-09)  
**Objectif** : une **beta production** utilisable par un DSI à temps partagé / CODIR client, avec les **liaisons critiques** branchées — pas le produit « vision Fin 2026 ».  
**Sources** : [`VISION_PRODUIT.md`](./VISION_PRODUIT.md), [`LIAISONS-MODULES.md`](./LIAISONS-MODULES.md), [`RFC/_RFC Liste.md`](./RFC/_RFC%20Liste.md), plans Budget / Projet, runbooks préprod.  
**Backlog exhaustif (tout le reste)** : [`BACKLOG-RESTE-A-FAIRE.md`](./BACKLOG-RESTE-A-FAIRE.md).

**Définition V1 Beta** : déploiement **préprod → prod** (`preprod` → `main`), multi-client réel, parcours CODIR du jour J **+ adoption** (**Orion** + **Guide** nouveaux clients), sans CMDB / GED / IA générative / connecteurs génériques.

---

## 1. Promesse produit V1 Beta

Un fractional CIO peut, **sur un client actif** :

1. Piloter **budgets** (exercice, lignes, atterrissage / PA, import, alertes overrun).
2. Piloter **projets** (portefeuille, tâches/jalons, risques, fiche décisionnelle, demandes, cycles).
3. Lire la boucle **projet ↔ ligne budgétaire** (lien + vue inverse + KPI) et l’argent **achats → ligne → Financial Core**.
4. Gouverner via **vision stratégique**, **réunions / points projet**, **alertes / cloche**.
5. Staffer via **équipes + capacité + temps réalisé** (sans encore valoriser le TJM en event financier).
6. Administrer **ACL / licences sièges / org / audit** sans fuite inter-client.
7. **S’auto-former** via **Orion** (assistant) et le **Guide** (base de connaissance / premiers pas nouveaux clients) — réponses **préconfigurées**, pas de LLM.

Ce qui **n’est pas** promis en V1 Beta : parc licences SI (RFC-037), CMDB, GED transverse, Cartographie, **IA générative / RAG**, Orchestra Finance/HR, coût réel timesheet → `FinancialEvent`.

---

## 1.1 Adoption — Orion & Guide (bloquant beta)

Deux surfaces du même socle [RFC-AI-001](./RFC/RFC-AI-001%20%E2%80%94%20Cursor%20Starium%20Chatbot%20Core.md) (module `chatbot`) ; branding produit distinct.

| Surface | Rôle | État code (approx.) | Livrable beta |
| --- | --- | --- | --- |
| **Orion** | Assistant chat : matching question → réponse admin, historique, drawer / bottom nav, feedback | Live (runtime + admin plateforme `/admin/chatbot`) | Harden UX ; smoke multi-client ; **aucune** réponse inventée ; libellés métier |
| **Guide** | Base de connaissance navigable (Explorer / reader) + **pack « Nouveaux clients »** | Live technique (`/chatbot/explore`, catégories / articles) ; contenu onboarding **insuffisant** | Pack GLOBAL édité + parcours premiers pas client |

### Pack Guide « Nouveaux clients » (contenu minimum)

Catégorie featured **Premiers pas** (scope `GLOBAL`) avec articles au minimum :

1. Connexion, MFA, choix du client actif  
2. Visibilité des modules / permissions (lien aide modèle d’accès)  
3. Premier exercice & budget  
4. Premier projet + lien budget  
5. Capacité / équipes (aperçu)  
6. Alertes & cloche  
7. Où trouver de l’aide (Orion vs Guide)

Plus : FAQ top 10 des erreurs UAT (login, client vide, module masqué, droits refusés).

### Hors Guide/Orion beta

- LLM / génération libre / lecture métier pour « inventer » une réponse  
- Actions métier depuis le chat (créer budget, muter projet…)  
- Remplacement des `MANUEL-*` (les manuels restent la doc longue ; le Guide les **pointe** via liens internes allowlist)

---

## 2. Matrice modules — IN / harden / OUT

| Module / domaine | Rôle V1 Beta | État actuel (approx.) | Action beta |
| --- | --- | --- | --- |
| Auth / multi-client / RBAC | Socle | Live | Harden + smoke multi-client |
| ACL + licences **sièges** plateforme | Socle | Live (ACL-001→014, 017–026 partiel) | Gate : pas de fuite ; OWN/SCOPE enforcement « good enough » |
| Audit + alertes/notifs (RFC-038) | Socle | Live (triggers budget/projet/contrat/vision/intake/réunions) | Completer triggers **Achats / Capacité** si gap UAT |
| **Orion** (chatbot runtime) | Adoption | Live | Harden + critères RFC-AI-001 ; seed réponses |
| **Guide** (KB + pack nouveaux clients) | Adoption | Live technique ; contenu à produire | Pack Premiers pas + Explorer polish |
| Budgets + Financial Core | Cœur | Live + BUD-040 ; BUD-041 lots 1–5 (lot 6 import hors scope) | Polish cockpit si besoin ; **ne pas** rouvrir lot 6 |
| Achats (PO / factures) → ligne | Argent | Live (`po-line`, `po-event`) | Smoke bout-en-bout + libellés |
| Projets (CRUD, tâches, Gantt, risques, sheet) | Cœur | Live | Harden ; métriques sheet / règles d’arbitrage **post-beta** si trop gros |
| Project ↔ Budget (`project-budget`, `ui-line-projects`) | Liaison critique | Live (010 + **010-B** + widget dashboard) | Smoke UAT |
| Intake + Cycles gouvernance | Amont portefeuille | Live | Smoke UAT |
| Vision stratégique | CODIR | Live ; STRAT-010 QA | **Clôturer STRAT-010** |
| Réunions / points projet | Gouvernance | Live (ponts) | Stabiliser parcours COPIL si dette UI |
| Fournisseurs + Contrats | Achats | MVP ; FOU partiel | Harden ; **pas** de pont contrat↔budget/projet en beta |
| Équipes / RH / Capacité / Timesheet | People | Live capa + TEAM-009 | Finir **FE-CAPA-001** polish |
| Scénarios projet (SC-*) | Décision | Partial backend | **Hors beta** (V1.1) sauf lecture financière déjà là |
| M365 (Teams / sync) | Overlay | Partial | Opt-in ; lot 5 Planner **hors beta** |
| Licences SI (RFC-037) | Référentiel IT | Draft / future Fin 2026 | **OUT** |
| CMDB / GED / Cartographie / IA générative / connecteurs | Vision | Future | **OUT** |
| RES-002 coût réel | Argent projet | Gap | **V1.1** (prototype optionnel en fin de beta si capacité) |

---

## 3. Liaisons — ce qui doit être « live » pour la beta

### 3.1 Obligatoire (bloquant go-live)

| Id | De → Vers | Pourquoi beta |
| --- | --- | --- |
| `project-budget` + `ui-line-projects` | Projets ↔ Budgets | Lecture portefeuille ↔ enveloppe (010-B ✅) |
| `po-line` + `po-event` | Achats → Budgets / Financial | Seul chemin argent réel aujourd’hui |
| `budget-event` | Budgets → Financial Core | Atterrissage / recalculs |
| `vision-project` (+ budget/risk/cycle) | Vision → domaines | Alignement CODIR |
| `intake-project` | Demandes → Projets | Entrée portefeuille |
| `cycle-*` | Cycles ↔ projets/budgets/risques | Pilotage périodique |
| `meet-project` / `meet-cycle` | Réunions → projets/cycles | Tenue de gouvernance |
| `project-capa` + `time-project` | Projets ↔ capa / temps | Charge (sans event €) |
| `owner-org` + `acl-all` | Org / ACL → ressources | Isolation & gouvernance accès |
| Alertes budget/projet/contrat/vision/intake | RFC-038 | Signaux cockpit |

### 3.2 Nice-to-have beta (si capacité)

| Id | Action |
| --- | --- |
| Widget dashboard budget × projet | Même API KPI que 010-B |
| Triggers alertes Achats / Capacité | Completer socle partial (§4.2 LIAISONS) |
| `task-line` explicabilité UI | Afficher FK tâche→ligne **sans** générer d’event |
| `docs-project` | Liste documents projet lisible (silo actuel) — pas de GED |

### 3.3 Catalogue des liaisons manquantes (hors beta — plan de fermeture)

Toutes les entrées `partial` / `gap` / `future` de [`LIAISONS-MODULES.md`](./LIAISONS-MODULES.md) §4.3. **Aucune n’est un livrable go-live V1 Beta** sauf le nice-to-have `task-line` UI ci-dessus.

| Id | De → Vers | Statut catalogue | Horizon | Chantier |
| --- | --- | --- | --- | --- |
| `task-line` | Projets → Budgets | partial | **Beta** (UI only) / V1.1 (event) | Afficher FK ; event auto → `gap-project-event` |
| `docs-project` | Projets → GED | partial | Beta (silo) / 2027 GED | Silo `ProjectDocument` OK ; GED transverse plus tard |
| `gap-project-event` | Projets → Financial Core | gap | **V1.1** | Enum `PROJECT` → générer events (RFC à écrire) |
| `gap-time-event` | Équipes → Financial Core | future | **V1.1** | Timesheet × `dailyRate` — RFC-RES-002 |
| `gap-res-assign` | RH → Projets | future | **V1.1** | Affectation ressources — RFC-RES-002 |
| `gap-contract-budget` | Contrats → Budgets | gap | **V1.1** | Enum `CONTRACT` + parcours — voisin RFC-037 |
| `gap-contract-project` | Contrats → Projets | gap | **V1.1** | `projectId` sur contrat / via licence SI |
| `fut-license-*` / `fut-license-resource` | Licences SI ↔ … | future / partial | **Fin 2026** | RFC-037 |
| `fut-ms-lot5` | M365 → GED | future | V1.1+ | Planner / dossier / sync auto |
| `fut-axes-po` | Achats → Organisation | future | V1.1+ | Splits analytiques au-delà de la ligne |
| `fut-proj-020` | Projets → Dashboard | future | V1.1+ | Roll-up parent / enfants |
| `fut-timeline` | Dashboard → Financial | future | Post-V1.1 | Timeline multi-domaines (RFC-032) |
| `fut-quotation` | Achats → GED | future | 2027+ | `SupplierQuotation` |
| `fut-ged-project` / `fut-evidence-ged` | GED ↔ … | future | **2027** | Document transverse |
| `fut-cmdb-*` / `fut-cmdb-resource` | CMDB ↔ … | future / partial | **2027** | Inventaire IT |
| `atlas-*` | Cartographie | future | **Fin 2026** | Overlay relations |
| `ai-*` | IA analyse | future | **Fin 2026** | ≠ Orion matching |
| `conn-*` | API externes | future | **2028+** | Hub connecteurs |
| `fut-finance` / `fut-hr` | Orchestra Finance / HR | future | Vision | Hors Orchestra IT beta |

**Règle beta** : on **ferme** la lecture (`ui-line-projects` ✅, `po-line` ✅) ; on **n’ouvre pas** l’écriture financière projet/temps/contrat. Vague 4 = rédaction RFC seulement pour `gap-project-event` + spike RES-002.

---

## 4. Vagues de delivery (ordre imposé)

Durées indicatives (équipe produit actuelle). Ajuster au calendrier commercial.

### Vague 0 — Gel du socle (1–2 sem.)

- Freeze features hors roadmap.
- Gate technique : `pnpm lint` / `typecheck` / `test` / `audit:ui-ids` / `audit:modals` ; runbook préprod ; smoke multi-client.
- Clôturer **RFC-STRAT-010** (QA vision).
- **Orion** : smoke drawer (client actif / unauthorized / no-match / historique) ; vérifier isolation `clientId` sur conversations.
- **Guide** : inventaire contenus existants ; ouvrir chantier pack « Premiers pas » (rédaction + seed admin).
- Doc : ce fichier + pointer depuis `_RFC Liste` / LIAISONS ; indexer **RFC-AI-001** si absent de la liste.

**Exit** : préprod bootable, UAT login MFA, Orion utilisable, zéro fuite client connue.

### Vague 1 — Boucle argent & budget gouvernance (2–4 sem.)

| Item | RFC / id | Critère done |
| --- | --- | --- |
| BUD-041 lot 6 (activation PA / arbitrage) | RFC-BUD-041 | ~~N/A~~ — lots 1–5 live ; lot 6 = import hors scope |
| Widget KPI projets sur `/budgets/dashboard` | 010-B follow-up | ✅ section Projets financés (budget sélectionné) |
| Smoke achats → ligne → KPI budget | `po-line` | Parcours documenté runbook |
| Import hub polish minimal | BUD-043 L3 optionnel | Pas bloquant si L1–L2 OK |
| Articles Guide liés budget / atterrissage | Guide pack | ≥ 2 articles + liens internes allowlist |

**Exit** : DAF/DSI lit atterrissage + projets financés sans Excel ; aide Orion/Guide sur ces parcours.

### Vague 2 — Portefeuille CODIR (3–5 sem.)

| Item | RFC | Critère done |
| --- | --- | --- |
| Catégories portefeuille | PROJ-014 | Référentiel client-scoped |
| Rattachement projet (± activité) | PROJ-015 | Sélecteur libellés métier |
| Agrégats KPI par catégorie | PROJ-016 | API + UI arbre (FE-008/009/010) |
| Polish capacité UI | FE-CAPA-001 | Page unique Pilotage / Affectations / Réglages |
| Articles Guide projets / capacité | Guide pack | Articles + matching Orion sur questions types |

**Exit** : portefeuille structuré + capacité quotidienne + aide contextualisée.

### Vague 3 — Durcissement beta, adoption & UAT (2–3 sem.)

- FOU contacts/catégories : finitions ciblées (pas de refonte).
- Alertes : revue couverture + seuils budget.
- ACL : smoke OWN/SCOPE sur projets/budgets ; cockpit modèle d’accès.
- M365 : laisser opt-in ; documenter limites (pas lot 5).
- Seeds démo multi-modules stables (`seed-latest-modules-demo`).
- **Guide** : pack « Nouveaux clients » **publié** (catégorie featured + 7 articles min + FAQ erreurs) ; Explorer sans ID brut ; liens vers `/client/help/access-model`.
- **Orion** : fallback no-match + suggestions featured ; feedback support plateforme opérationnel.
- Release gate (skill `starium-release-gate`) + checklist UAT clients pilotes **incluant** premier login → Guide → 1er budget / projet.

**Exit** : **Go / No-Go production**.

### Vague 4 — Buffer / dettes acceptées (parallèle, non bloquant)

- Scénarios SC cockpit UI.
- Project Sheet metrics + decision rules (PROJ-012 suite).
- Rédaction RFC `gap-project-event` (design only, pas d’implémentation forcée).
- RES-002 spike (1–2 j) pour cadrer V1.1.
- Guide V1.1 : checklist first-run interactive (wizard) si le pack statique ne suffit pas en UAT.

---

## 5. Critères Go-Live production (checklist)

### Produit

- [ ] Client switcher + isolation vérifiée (2 clients seed / UAT)
- [ ] Budget : exercice → lignes → atterrissage/PA → alertes overrun
- [ ] Projet : create → lien budget → vue inverse ligne → KPI fiche budget
- [ ] Achats : PO/facture sur ligne visible engagé/consommé
- [ ] Vision + au moins un cycle / une réunion / une demande convertie
- [ ] Capacité : affectation projet + saisie temps (même sans €)
- [ ] Cloche notifications ; pas d’ID brut en UI (`audit:ui-ids`)
- [ ] **Orion** : question connue → réponse configurée ; no-match → fallback ; isolation conversations par client
- [ ] **Guide** : catégorie Premiers pas + 7 articles min ; Explorer navigable ; liens internes OK

### Technique / sécu

- [ ] CI verte sur `preprod` ; migrations deploy OK
- [ ] Secrets/env préprod ≠ prod DB ; SMTP sandbox en préprod
- [ ] Guards client + permissions sur endpoints métier touchés
- [ ] Chatbot : pas de fuite `scope=CLIENT` / pas de lien externe hors allowlist
- [ ] Aucun DCP en clair dans les logs des parcours UAT
- [ ] Mobile smoke ≥ 320px sur cockpits budget / projets / dashboard / Orion

### Doc

- [ ] `docs/API.md` aligné routes beta (dont chatbot si manquant)
- [ ] `LIAISONS-MODULES.md` : ponts beta = `live` ; gaps hors beta documentés
- [ ] RFC-AI-001 statut aligné code ; index `_RFC Liste`
- [ ] Runbook passage prod à jour
- [ ] Pack Guide versionné (seed ou export admin) reproductible en préprod/prod

---

## 6. Hors scope V1 Beta → V1.1 / Fin 2026

| Horizon | Contenu |
| --- | --- |
| **V1.1** (post-beta, 1er trimestre après go-live) | `gap-project-event` ; RES-002 affectation + costing ; contrat↔projet/budget ; scénarios SC UI ; sheet metrics / arbitrage ; alertes configurables avancées ; **Guide wizard first-run** si besoin |
| **Fin 2026** | Licences SI (037), Cartographie, **IA analyse** (≠ Orion matching) |
| **2027+** | CMDB, GED transverse |
| **2028+** | Hub connecteurs API externes ; Orchestra Finance / HR |

---

## 7. Ordre de chantier recommandé (prochaines actions concrètes)

1. **Push / merge** RFC-PROJ-010-B + smoke UI.
2. **Vague 0** : STRAT-010 + gate préprod + smoke **Orion** + kickoff pack **Guide**.
3. **Vague 1** : BUD-041 lot 6 + widget dashboard + articles Guide budget.
4. **Vague 2** : PROJ-014 → 016 + articles Guide projets/capa.
5. **Vague 3** : pack Guide « Nouveaux clients » publié + UAT + go-live.
6. Ouvrir RFC **RES-002** / **project-event** pour V1.1 (doc only pendant la beta).

---

## 8. Conformité by design (beta)

Toute livraison vague respecte les 5 standards : RGPD (minimisation, pas de DCP en logs), RGAA, Design System, sécurité multi-client, mobile-first. Les graphiques restent **données API uniquement** (pas de séries factices).

---

*Document vivant — à réviser à chaque fin de vague. Canvas de pilotage : voir artefact Cursor associé `roadmap-v1-beta.canvas.tsx`.*
