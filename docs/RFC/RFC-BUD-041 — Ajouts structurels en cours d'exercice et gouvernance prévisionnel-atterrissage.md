# RFC-BUD-041 — Gouvernance en cours d'exercice, prévision d'atterrissage (PA) et arbitrage budgétaire

## Statut

🟡 **Partiel** — lots 1–5 implémentés (2026-08-29). Lot 6 import **hors scope**.

## Priorité

🔥 Haute — gouvernance CODIR / DSI, clarté vocabulaire (**PA** vs **atterrissage** vs **plan 12 mois**), cohérence avec RFC-BUD-040, RFC-033 (versions figées) et RFC-032 (décisions).

## Dépendances

* [RFC-015-2 — Budget Management Backend](./RFC-015-2%20%E2%80%94%20Budget%20Management%20Backend.md)
* [RFC-017 — Budget Reallocation](./RFC-017%20%E2%80%94%20Budget%20Reallocation.md)
* [RFC-019 — Budget Versioning](./RFC-019%20%E2%80%94%20Budget%20Versioning.md) — révision formelle de masse (distincte de la PA)
* [RFC-023 — Budget Prévisionnel (Planning & Atterrissage)](./RFC-023%20%E2%80%94%20Budget%20Pr%C3%A9visionnel%20(Planning%20%26%20Atterrissage).md)
* [RFC-030 / RFC-FE-BUD-030](./RFC-030%20%E2%80%94%20Budget%20Forecast%20%26%20Comparaison%20Budg%C3%A9taire.md) — comparaisons live / snapshot
* [RFC-032 — Historisation décisions budgétaires](./RFC-032%20%E2%80%94%20Historisation%20d%C3%A9cisions%20budg%C3%A9taires.md)
* [RFC-033 — Versions budgétaires (version figée)](./RFC-033%20%E2%80%94%20Mise%20en%20place%20des%20versions%20budg%C3%A9taires%20(produit).md)
* [RFC-BUD-040 — Unification atterrissage](./RFC-BUD-040%20%E2%80%94%20Unification%20atterrissage%2C%20pr%C3%A9vision%20et%20forecast.md)
* [RFC-FE-BUD-032 — Fiche budget cockpit](./RFC-FE-BUD-032%20%E2%80%94%20Fiche%20budget%20cockpit%20(refonte%20pr%C3%A9sentation%20%26%20fonctionnalit%C3%A9s).md)
* [RFC-018 — Budget Data Import](./RFC-018%20%E2%80%94%20Budget%20Data%20Import.md) — fichiers Excel/CSV ; voir §3.7

## Décisions produit validées (2026-08-28)

| # | Décision | Choix retenu |
|---|----------|--------------|
| **D1** | Typage des changements mid-year | **Ajout structurel validé** (nouvelle enveloppe/ligne) **ou** **ajustement du plan 12 mois** sur ligne ACTIVE — jamais confondus en UI/API |
| **D2** | Nom du rituel de gouvernance | **Prévision d'atterrissage** (abrégé **PA** en UI secondaire) — préparation et arbitrage « ça on fait / ça on ne fait pas » |
| **D3** | Nom du KPI chiffré | **Atterrissage** (`landingAmount`, RFC-BUD-040) — **résultat** de la PA, pas le nom du rituel |
| **D4** | Onglet grille 12 mois | Conserver l’id technique `previsionnel` ; **sous-titre UI obligatoire** : *« Plan annuel (12 mois) — alimente l’atterrissage »* |
| **D5** | Cycle PA | Budget **live** + **version figée** scénario arbitré → **comparaison** → validation CODIR → **activation** sur le live |
| **D6** | Version figée ≠ révision | Snapshot (RFC-033) = photo ; révision (RFC-019) = clone éditable — la PA s’appuie surtout sur **snapshots + comparaison + activation** |
| **D7** | Import ERP / API | **Trois canaux** distincts (fichier, API REST, connecteur ERP futur) — chacun mappé sur une **intention** ; jamais confondu avec l’**activation PA** |

---

# 0. Glossaire canonique (à afficher dans l’app)

> **Objectif** : l’utilisateur ne doit plus confondre *prévision d’atterrissage*, *atterrissage*, *plan 12 mois* et *version figée*.

| Terme UI (français) | Clé technique | Question métier | Définition courte |
|---------------------|---------------|-----------------|-------------------|
| **Prévision d'atterrissage (PA)** | `landingForecastExercise` | *Qu’arbitre-t-on pour finir l’exercice ?* | **Rituel / exercice de gouvernance** : préparer un scénario (lignes, plan, réalloc), le comparer au live, le faire valider, puis l’**activer** |
| **Atterrissage** | `landingAmount` | *Où finit-on l’exercice en € ?* | **KPI chiffré** : consommé + engagé + prévision restante (RFC-BUD-040) |
| **Plan annuel (12 mois)** | `planningTotalAmount` | *Comment répartir sur l’année ?* | Somme des mois saisis — **saisie** dans l’onglet aujourd’hui nommé « Prévisionnel » |
| **Prévision restante** | `remainingPlanning` | *Qu’il reste à dépenser sur les mois futurs ?* | Somme des mois **après** la date de référence |
| **Budget live** | `Budget` `VALIDATED` | *Vérité opérationnelle actuelle* | Budget éditable en cours d’exercice (dépenses, engagés, atterrissage recalculé) |
| **Version figée** | `BudgetSnapshot` | *Photo à un instant T* | Copie **lecture seule** (RFC-033) — référence ou scénario arbitré |
| **Scénario arbitré** | snapshot occasion `PA_ARBITRATED` | *Proposition post-PA avant validation* | Version figée du budget **après** construction du scénario arbitré |
| **Activation PA** | `applyLandingForecastScenario` | *Le scénario validé devient le live* | Application contrôlée des écarts scénario → live (lot 5) |

### Ce qu’il ne faut **pas** mélanger

```
Prévision d'atterrissage (PA)     = le PROCESSUS (comité, arbitrage, validation)
Atterrissage                      = le CHIFFRE (résultat)
Plan annuel (12 mois)             = la SAISIE mensuelle
Version figée                     = la PREUVE / comparaison
```

### Chaîne de causalité (à expliquer en UI)

```
Plan 12 mois (saisie)
    → Prévision restante (mois futurs)
        → Atterrissage (KPI bandeau)
            → Prévision d'atterrissage (PA) = exercice qui ajuste le plan + structure
                → Version figée « scénario arbitré »
                    → Activation → nouveau live
```

---

# 1. Analyse de l'existant

## 1.1 Comportement actuel (code)

| Action | Budget `VALIDATED` | Budget `LOCKED` / `ARCHIVED` |
|--------|-------------------|------------------------------|
| `POST /api/budget-envelopes` | ✅ Autorisé | ❌ Refusé |
| `POST /api/budget-lines` | ✅ Autorisé | ❌ Refusé |
| `POST /api/budget-snapshots` | ✅ (version figée) | — |
| Comparaison live / snapshot | ✅ Onglet Comparaisons | — |
| **Activation scénario PA → live** | ❌ **Absent** | — |
| Vocabulaire **PA** en UI | ❌ **Absent** | — |

Références : `budget-envelopes.service.ts`, `budget-lines.service.ts`, `budget-snapshots.service.ts`, `budget-display-labels.ts`.

## 1.2 Moteur atterrissage (post RFC-BUD-040)

| Concept | Champ / service | Rôle |
|---------|-----------------|------|
| Plan 12 mois | `planningTotalAmount` | Répartition — **pas** le KPI fin d’exercice |
| Prévision restante | `remainingPlanning` | Mois futurs uniquement |
| **Atterrissage** | `landingAmount` | Projection fin d’exercice |
| Recalcul | `BudgetLandingService` | À chaque planning ou événement financier |

## 1.3 Lacunes (dont clarté PA)

1. **Vocabulaire** : onglet « Prévisionnel » prêté à tort pour la **PA** ou l’**atterrissage**.
2. **Pas de parcours PA nommé** : snapshots et comparaisons existent mais pas le fil « préparer PA → figer scénario arbitré → comparer → activer ».
3. **Pas d’activation** : après validation CODIR, pas de bouton « Appliquer la prévision d’atterrissage ».
4. **Typage d’intention** mid-year : structure vs ajustement plan vs réallocation.
5. **Workflow post-validation** sur nouvelles lignes/enveloppes insuffisant.
6. **KPI** : lignes non `ACTIVE` peuvent brouiller le cockpit.

## 1.4 Briques existantes à réutiliser (ne pas dupliquer)

| Mécanisme | Rôle dans la PA |
|-----------|-----------------|
| **Version figée** (RFC-033) | Référence « avant PA » + capture « scénario arbitré » |
| **Comparaisons** (RFC-030) | Live vs scénario arbitré (atterrissage, plan, structure) |
| **Réallocation** (RFC-017) | Arbitrage « on déplace » sans nouvelle ligne |
| **Décisions** (RFC-032) | Trace validation / activation PA |
| **Révision** (RFC-019) | Si changement de masse — hors PA courante |

---

# 2. Hypothèses

| # | Hypothèse | Si fausse |
|---|-----------|-----------|
| H1 | La **PA** est un rituel **récurrent** (ex. août, fin T3), pas seulement la validation initiale | Adapter le workflow |
| H2 | Le **scénario arbitré** est matérialisé par une **version figée** dédiée (occasion `PA_ARBITRATED`) | Utiliser uniquement RFC-019 |
| H3 | L’**activation** propage planning + montants + lignes activées — pas les consommés/engagés réels | Spécifier le périmètre d’apply |
| H4 | L’**atterrissage** reste le KPI unique de fin d’exercice (RFC-BUD-040) | Revoir avec DAF |
| H5 | Seuils et validateurs **configurables par client** | Règles codées en dur |

---

# 3. Modèle métier

## 3.1 Cycle **Prévision d'atterrissage (PA)** — cœur produit

```
┌──────────────────────────────────────────────────────────────────────────┐
│  PRÉVISION D'ATTERRISSAGE (PA) — ex. août 2026                           │
├──────────────────────────────────────────────────────────────────────────┤
│  1. FIGER RÉFÉRENCE (optionnel)                                          │
│     Version figée « Avant PA » — occasion PA_BASELINE ou dernière validée │
│                                                                          │
│  2. BUDGET LIVE — construire le scénario arbitré                         │
│     • Intention A : nouvelles lignes/enveloppes (sous validation)        │
│     • Intention B : ajuster plan 12 mois (lignes ACTIVE)                 │
│     • Intention C : réallocations (RFC-017)                              │
│     → Atterrissage live recalculé en temps réel (aperçu)                 │
│                                                                          │
│  3. FIGER SCÉNARIO ARBITRÉ                                               │
│     Version figée « PA — scénario arbitré » (occasion PA_ARBITRATED)     │
│                                                                          │
│  4. COMPARER                                                             │
│     Live (ou baseline) vs scénario arbitré — onglet Comparaisons         │
│     Focus : atterrissage, écart, lignes ajoutées/modifiées               │
│                                                                          │
│  5. VALIDER (CODIR / DSI)                                                │
│     Décision tracée — RFC-032 (budget.landing_forecast.validated)        │
│                                                                          │
│  6. ACTIVER                                                              │
│     Appliquer le scénario arbitré sur le budget live                     │
│     (planning, montants révisés, activation lignes en attente)         │
│     Nouvelle version figée « PA — activée » (optionnel)                  │
└──────────────────────────────────────────────────────────────────────────┘
```

**État cible UI** : entrée de menu ou bandeau fiche budget **« Prévision d'atterrissage »** guidant les étapes 1→6 (checklist), sans remplacer les écrans existants.

## 3.2 Typologie des changements **pendant** la PA (intentions A / B / C)

```
┌─────────────────────────────────────────────────────────────────┐
│  Budget LIVE (exercice en cours) — préparation PA               │
├─────────────────────────────────────────────────────────────────┤
│  A. AJOUT STRUCTUREL          │  B. AJUSTEMENT PLAN 12 MOIS       │
│  (nouvelle enveloppe / ligne) │  (ligne ACTIVE)                   │
│  → DRAFT → PENDING_VALIDATION │  → PATCH planning               │
│  → ACTIVE à l’étape 6         │  → audit planning.updated         │
├─────────────────────────────────────────────────────────────────┤
│  C. RÉALLOCATION (RFC-017)    │  D. RÉVISION FORMELLE (RFC-019)  │
│  entre lignes existantes      │  si seuil masse dépassé           │
└─────────────────────────────────────────────────────────────────┘
```

## 3.3 Règle d’or (D1)

| Intention | Objet créé ? | Impact plan 12 mois | Impact **atterrissage** | Dans la PA |
|-----------|--------------|---------------------|-------------------------|------------|
| **A — Ajout structurel** | Oui | À l’activation (étape 6) | Oui | « On fait » (nouveau sujet) |
| **B — Ajustement plan** | Non | Oui | Oui | « On ajuste / on ne fait pas » (plan → 0) |
| **C — Réallocation** | Non | Non | Oui (transfert) | « On priorise autrement » |
| **D — Révision** | Clone budget | Oui | Oui | Hors PA standard |

## 3.4 Cycle — ajout structurel (intention A)

```
Création sur budget VALIDATED (souvent pendant préparation PA)
  status = DRAFT ou PENDING_VALIDATION (config)
  justification obligatoire (lien PA / CODIR)
  ↓
Validation métier (étape 5 PA ou seuil auto)
  status = ACTIVE (ou activation différée étape 6)
  planning initialisé (prorata mois restants par défaut)
  landingAmount recalculé
  ↓
Inclus dans version figée « scénario arbitré » à l’étape 3
```

**Tant que statut ∉ { ACTIVE }** : pas de dépense ; exclu des KPI cockpit officiels.

## 3.5 Cycle — ajustement plan 12 mois (intention B)

1. Onglet **Plan annuel (12 mois)** (ex-« Prévisionnel »)
2. Modifier les mois futurs (y compris **0** = « on ne fait pas »)
3. Sauvegarde → `budget_line.planning.updated`
4. **Atterrissage** bandeau mis à jour (aperçu PA)

**Libellé UI** : « Ajuster le plan pour l’atterrissage » — **pas** « Prévision d'atterrissage » (réservé au rituel global).

## 3.6 Activation PA (étape 6) — comportement cible

`POST /api/budgets/:budgetId/landing-forecast/apply`

Entrée : `arbitratedSnapshotId` (version figée scénario validé)

Effets (transaction) :

1. Pour chaque ligne du snapshot vs live : appliquer **planning 12 mois** et **revisedAmount** si écart autorisé
2. Activer les lignes `PENDING_VALIDATION` présentes dans le scénario
3. Ne **pas** écraser `consumedAmount` / `committedAmount` réels
4. Recalcul `landingAmount` global
5. Audit `budget.landing_forecast.applied` + entrée décisionnelle RFC-032
6. Option : créer snapshot « PA — activée »

**Hors MVP lot 1–3** : spécification détaillée des règles de merge ligne à ligne (lot 5).

## 3.7 Import ERP, fichiers et API — articulation avec la PA

> L’import n’est **pas** la PA. C’est un **canal d’entrée** de données vers le budget live. La PA reste un **rituel de gouvernance** (scénario, validation, activation).

### 3.7.1 Trois canaux d’alimentation

| Canal | Statut Orchestra | Usage typique | Intention RFC-BUD-041 |
|-------|------------------|---------------|------------------------|
| **A. Fichier Excel/CSV** | ✅ **Implémenté** — RFC-018 + **RFC-BUD-043** L1–L2 (`/api/budget-imports/*`, hub `/budgets/imports`, wizard `/budgets/[budgetId]/import`) | Export ERP / compta / Excel maison ; réimport mensuel | Selon mapping — voir §3.7.2 |
| **B. API REST Orchestra** | ✅ **Disponible** (API-first) | Intégrateur, ETL, script DSI, iPaaS (Make, n8n…) | CRUD budget-lines, planning, events — voir §3.7.3 |
| **C. Connecteur ERP natif** | ❌ **Hors scope** RFC-018 MVP | Sync SAP / BC / Cegid / etc. | Phase ultérieure (RFC dédiée ou module `integrations`) |

**Principe** : le backend Orchestra reste la **source de vérité pilotage** ; l’ERP/compta alimente le **réel** (consommé, parfois engagé) ; la PA arbitre le **scénario forward** (plan + structure).

### 3.7.2 Import fichier (RFC-018) — ce qui existe

| Donnée importable aujourd’hui | Effet | Rapport à la PA |
|------------------------------|-------|-----------------|
| Structure ligne (code, nom, enveloppe, montants initiaux/révisés) | CREATE / UPDATE `BudgetLine` via `externalId` ou clé composite | **Intention A** si nouvelle ligne — doit respecter gardes mid-year (§3.4) |
| `consumedAmount` / `committedAmount` (si mappés) | Mise à jour agrégats ligne | **Réalité comptable** — alimente l’**atterrissage**, pas le scénario PA |
| Planning 12 mois | ❌ **Non** dans l’import budget actuel | Saisie API `PATCH planning` ou UI plan 12 mois (**intention B**) |
| `FinancialEvent` (factures, écritures) | ❌ **Exclu** MVP RFC-018 | Passer par API financial-core ou saisie Orchestra / procurement |

Après `execute` : recalcul **`landingAmount`** (`BudgetLandingService`) — cohérent RFC-BUD-040.

**Modes** : `CREATE_ONLY` | `UPSERT` | `UPDATE_ONLY` — traçabilité `BudgetImportRowLink` + audit `budget_import.*`.

### 3.7.3 API REST (intégration sans connecteur dédié)

Tout intégrateur peut utiliser les **mêmes APIs** que le frontend :

| Besoin intégration | Endpoints | Intention |
|--------------------|-----------|-----------|
| Créer / mettre à jour des lignes | `POST/PATCH /api/budget-lines` | **A** (structure) — gardes mid-year |
| Mettre à jour le plan 12 mois | `PATCH /api/budget-lines/:id/planning` | **B** (ajustement atterrissage) |
| Enregistrer une consommation / facture | API financial-core / procurement | **Réel** — met à jour consommé → atterrissage |
| Réaffectation | `POST` réallocations (RFC-017) | **C** |
| Figurer une PA | `POST /api/budget-snapshots` + comparaisons | Rituel PA (§3.1) |
| Activer scénario PA | `POST .../landing-forecast/apply` (lot 5) | Activation |

**Auth** : JWT + `X-Client-Id` + RBAC (`budgets.update`, etc.) — pas de contournement tenant.

### 3.7.4 Règles PA × import (à implémenter)

1. **Réimport ERP mensuel** (consommé / engagé) : **autorisé** sur budget `VALIDATED` ; ne déclenche **pas** une PA ; met à jour l’**atterrissage live** pour préparer la prochaine PA.
2. **Import structurel** pendant préparation PA : lignes créées en `DRAFT` / `PENDING_VALIDATION` (lot 2) ; incluses dans snapshot « scénario arbitré » ; **ACTIVE** seulement après validation PA (étape 5–6).
3. **Import massif ≠ activation PA** : un `execute` import ne remplace **jamais** l’étape « Appliquer la prévision d’atterrissage » (lot 5).
4. **Option config** `importDefaultLineStatusOnValidatedBudget` : `PENDING_VALIDATION` (défaut) vs `DRAFT`.
5. **Audit** : chaque import taggé `sourceChannel: FILE | API` ; visible dans historique **Décisions** (RFC-032) — action `budget_import.executed` existante.

### 3.7.5 Écarts produit (à traiter)

| Écart | Lot suggéré |
|-------|-------------|
| Pas de mapping « import = intention A/B » en UI | Lot 2 — choix à l’execute |
| Pas d’import planning 12 mois | Lot 6 — extension RFC-018 ou API bulk planning |
| Pas de connecteur ERP temps réel | RFC future `RFC-BUD-042` (ERP natif) ; hub profils/historique → **RFC-BUD-043** ; planification SFTP/cron → **RFC-BUD-044** |
| Import consommé sans garde PA | Documenter : réel toujours autorisé ; structure soumise à gardes |

### 3.7.6 Schéma — flux ERP vs PA

```
ERP / Compta                    Orchestra (budget LIVE)
     │                                    │
     │  export CSV / API                  │
     ├──────────────────────────────────►│ consommé, engagé (réel)
     │                                    │ → atterrissage recalculé
     │                                    │
     │                                    │  PA (rituel humain)
     │                                    │  ├─ ajuste plan 12 mois (B)
     │                                    │  ├─ ajoute lignes (A)
     │                                    │  ├─ fige scénario arbitré
     │                                    │  └─ active après CODIR
     │                                    │
     └─ (ne remplace pas la PA)           └─ cockpit = vérité pilotage
```

---

# 4. Vocabulaire UI — modifications obligatoires

Fichier cible : `apps/web/src/features/budgets/lib/budget-display-labels.ts`

```ts
export const BUDGET_LABELS = {
  // … existant …
  /** Rituel de gouvernance mid-year / CODIR (RFC-BUD-041). */
  landingForecastExercise: "Prévision d'atterrissage",
  landingForecastExerciseShort: 'PA',
  /** Onglet — id route `previsionnel` inchangé (D4). */
  planningTab: 'Prévisionnel',
  planningTabSubtitle: 'Plan annuel (12 mois) — alimente l’atterrissage',
  planningTotal: 'Total plan annuel',
  // landing, landingGap, remainingPlanning : inchangés (RFC-BUD-040)
};
```

### Écrans — exigences de clarté

| Zone | Avant (confus) | Après (RFC-BUD-041) |
|------|----------------|---------------------|
| Bandeau KPI | Atterrissage seul | Hint : *« Résultat de votre plan et de l’exécution ; ajustez via le plan 12 mois ou une PA »* |
| Onglet grille | « Prévisionnel » seul | Titre + **sous-titre D4** ; encart : atterrissage budget actuel (lecture seule) |
| Outils header | Version figée, Comparaisons dispersés | Groupe **« Prévision d'atterrissage »** : *Démarrer / Reprendre une PA* |
| Comparaisons | Baseline / snapshot générique | Presets : *Live vs scénario arbitré PA* |
| Versions figées | Nom libre | Types d’occasion : `PA_BASELINE`, `PA_ARBITRATED`, `PA_ACTIVATED` (seed RFC-033 §4.4) |

---

# 5. Liste des fichiers à créer / modifier

## 5.1 Backend

| Fichier | Action |
|---------|--------|
| `budget-workflow-config.merge.ts` | Seuils mid-year + flags PA |
| `policies/mid-year-structural.policy.ts` | **Créer** |
| `budget-envelopes.service.ts` / `budget-lines.service.ts` | Gardes + submit/activate |
| `budget-line-planning.service.ts` | `initializePlanningForMidYearLine()` |
| `financial-core/...` | Refus events si ligne non ACTIVE |
| `budget-audit.constants.ts` | `budget.landing_forecast.*`, `budget_line.submitted`, `.activated` |
| `budget-landing-forecast/` (module) | **Créer** lot 5 — orchestration PA + `apply` |
| `budget-snapshot-occasion-types` seed | `PA_BASELINE`, `PA_ARBITRATED`, `PA_ACTIVATED` |

## 5.2 Frontend

| Fichier | Action |
|---------|--------|
| `budget-display-labels.ts` | Glossaire §4 |
| `budget-detail-header.tsx` | Groupe PA + CTA |
| `budget-landing-forecast-panel.tsx` | **Créer** — checklist PA (étapes 1–6) |
| `budget-detail-tabs` / explorateur | Sous-titre onglet plan 12 mois |
| `budget-comparisons-panel.tsx` | Preset comparaison PA |
| `create-budget-snapshot-dialog.tsx` | Occasions PA pré-sélectionnables |
| Formulaires enveloppe/ligne | Parcours « dans le cadre d’une PA » |

## 5.3 Documentation

| Fichier | Action |
|---------|--------|
| `docs/API.md` | Routes PA + apply |
| `docs/modules/budget-frontend.md` | Parcours PA |
| `docs/RFC/_RFC Liste.md` | Index mis à jour |

---

# 6. Implémentation — lots

## Lot 1 — Clarté vocabulaire (quick win)

1. `BUDGET_LABELS` + sous-titres onglet plan 12 mois + hints bandeau KPI
2. Encart atterrissage en tête onglet Prévisionnel (lecture API landing)
3. Types d’occasion snapshot PA (seed + admin)
4. **Aucune** logique apply — purement UX + doc in-app (tooltip / aide contextuelle)

## Lot 2 — Garde-fous mid-year (intentions A / B)

1. Validation obligatoire nouvelles lignes sur budget VALIDATED
2. Refus dépenses sur lignes non ACTIVE
3. Exclusion KPI lignes en attente

## Lot 3 — Submit / activate structurel

1. Routes `submit` / `activate` ligne et enveloppe
2. Init planning prorata + recalcul atterrissage

## Lot 4 — Panneau **Prévision d'atterrissage**

1. Checklist guidée : figer → construire → figer scénario → comparer → valider
2. Liens profonds vers Comparaisons / Versions figées / Plan 12 mois
3. État PA en cours (snapshotIds, statut brouillon/validé)

## Lot 5 — **Activation PA** (apply scénario → live)

1. `POST .../landing-forecast/apply`
2. Merge planning + montants + activation lignes
3. Audit + snapshot « PA activée »
4. Tests isolation + non-régression consommés réels

## Lot 6 — Import & intégration (extension RFC-018)

1. Choix d’**intention** à l’execute import (`STRUCTURAL` | `ACTUALS_UPDATE`)
2. Gardes mid-year sur import structurel (statut ligne imposé)
3. Doc intégrateur : cookbook API REST pour ETL (sans connecteur ERP)
4. (Phase 2) Import colonnes planning 12 mois ; connecteur ERP

---

# 7. Modifications Prisma

## 7.1 MVP lots 1–4

* Extension JSON `budgetWorkflowConfig` (seuils, flags PA)
* Types d’occasion snapshot (tables existantes RFC-033)
* Optionnel : `BudgetSnapshot.metadata` JSON `{ paSessionId, paStep }` — phase 2 si checklist persistée

## 7.2 Lot 5 (option table légère)

```prisma
// Phase 2 si checklist PA persistée — hors MVP lot 4
model BudgetLandingForecastSession {
  id                    String   @id @default(cuid())
  clientId              String
  budgetId              String
  status                String   // DRAFT | SCENARIO_FROZEN | VALIDATED | APPLIED
  baselineSnapshotId    String?
  arbitratedSnapshotId  String?
  appliedAt             DateTime?
  validatedByUserId     String?
  // …
}
```

Migration lot 5 uniquement si validé — lot 4 peut utiliser snapshots + audits seuls.

---

# 8. API (aperçu)

## 8.1 Existants amendés

| Route | Amendement |
|-------|------------|
| `POST /api/budget-snapshots` | Suggestion occasion PA ; lien optionnel `paSessionId` |
| `GET /api/budget-comparisons/...` | Preset documenté live vs `arbitratedSnapshotId` |
| `PATCH /api/budget-lines/:id/planning` | Lignes ACTIVE ; mention « intention B » en audit |

## 8.2 Nouveaux (lots 3 & 5)

| Route | Description |
|-------|-------------|
| `POST /api/budget-lines/:id/submit` | Soumission structurelle |
| `POST /api/budget-lines/:id/activate` | Activation structurelle (prorata planning) |
| `POST /api/budget-envelopes/:id/submit` | Soumission enveloppe |
| `POST /api/budget-envelopes/:id/activate` | Activation enveloppe **sans cascade lignes** (C8) |
| `GET /api/budgets/:budgetId/landing-forecast` | État PA contractuel (C3) |
| `POST /api/budgets/:budgetId/landing-forecast/validate` | Marquer PA validée (CODIR) — lot 4 |
| `POST /api/budgets/:budgetId/landing-forecast/apply` | **Activation PA** — lot 5 |

---

# 9. Tests

* Glossaire : aucune chaîne UI « Prévisionnel » utilisée pour désigner la PA ou l’atterrissage
* Parcours PA : figer → comparer → (apply) avec isolation client
* Apply : consommés réels inchangés ; planning mis à jour
* Activation structurelle : prorata août → déc correct

---

# 10. Récapitulatif

| Question | Réponse |
|----------|---------|
| Comment s’appelle l’exercice d’arbitrage en août ? | **Prévision d'atterrissage (PA)** |
| Comment s’appelle le chiffre de fin d’exercice ? | **Atterrissage** |
| Où saisit-on les mois ? | **Plan annuel (12 mois)** — onglet Prévisionnel |
| Comment fige-t-on le scénario arbitré ? | **Version figée** occasion `PA_ARBITRATED` |
| Comment valide-t-on puis active-t-on ? | Décision RFC-032 → **Activation PA** (lot 5) |
| Ajout ligne vs ajustement plan ? | Intentions **A** vs **B** — jamais confondus |
| Import ERP / API remplace la PA ? | **Non** — import = canal données ; PA = rituel + activation (§3.7) |
| Réimport mensuel consommé ? | **Oui** — met à jour le réel / atterrissage live, pas le scénario arbitré |

---

# 11. Points de vigilance

1. **Ne pas renommer** l’onglet route `previsionnel` sans migration URL — utiliser sous-titre (D4).
2. **Snapshot ≠ live** : le scénario arbitré est une **photo** ; l’activation est l’étape critique.
3. **Double comptage** : réalloc + nouvelle ligne pour le même besoin.
4. **Snapshots historiques** : PA d’août n’altère pas les figées de mars.
5. **RFC-019** : révision lourde distincte de la PA trimestrielle.
6. **Import ≠ PA** : un réimport ERP de consommés ne doit pas être présenté comme « validation PA » ; un import structurel doit passer par les gardes mid-year (§3.7.4).

---

# 12. Conformité by design

## 12.1 RGPD

* Justifications PA : texte court ; pas de DCP en clair dans les logs ; scope client.

## 12.2 RGAA

* Checklist PA : HTML sémantique, étapes numérotées, `aria-live` sur statut ; libellés explicites (glossaire §0).

## 12.3 Design System

* Panneau PA : `.starium-module` + `KpiCard` ; modales `StariumModal` ; pas d’ID brut (`displayLabel`).

## 12.4 Sécurité

* `apply` : permission dédiée `budgets.landing_forecast.apply` ; validation client ; audit obligatoire.

## 12.5 Mobile

* Checklist PA empilée ; comparaison snapshot → scroll horizontal contrôlé ; cibles ≥ 44 px.

---

# 13. Hors scope

* Workflow multi-validateurs PA
* Notifications email CODIR automatiques
* PA inter-budget / inter-exercice
* Table `BudgetLandingForecastSession` avant lot 5 validé

---

# 14. Critères d’acceptation produit

1. Un utilisateur peut expliquer la différence **PA / atterrissage / plan 12 mois** sans formation (glossaire §0 visible ou accessible).
2. L’onglet grille affiche le **sous-titre D4** et l’**atterrissage** budget actuel.
3. Un parcours **« Prévision d'atterrissage »** guide figer → scénario → comparer → valider.
4. Les versions figées PA (`PA_ARBITRATED`) se créent et se comparent au live.
5. Intentions **A** et **B** ont des entrées UI distinctes.
6. Après validation CODIR, **l’activation** applique le scénario sur le live (lot 5).
7. Historique **Décisions** trace validation et activation PA.
8. `pnpm audit:ui-ids` vert ; aucun libellé ambigu « prévisionnel » pour l’atterrissage KPI.
