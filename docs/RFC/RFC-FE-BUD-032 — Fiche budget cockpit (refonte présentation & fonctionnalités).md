# RFC-FE-BUD-032 — Fiche budget cockpit (refonte présentation & fonctionnalités)

## Statut

**Implémentée** (lots 1 → 4 front + lot F backend). Remplace et précise le **Lot B / Phase 2–3** de [RFC-FE-BUD-031](./RFC-FE-BUD-031%20%E2%80%94%20Portefeuille%20budgets%20UI%20(refonte%20mockup).md) pour la route `/budgets/[budgetId]`.

### Décisions d’implémentation et écarts assumés

| Point | Décision retenue | Conséquence |
|-------|------------------|-------------|
| Scénarios budgétaires (§2 H4) | **Abandonnés** — la modale à coefficients `0.94` / `1.11` est supprimée sans remplacement | Les comparaisons reposent uniquement sur les **versions figées** réelles |
| Export budget (§5.4) | **Génération CSV côté client** depuis l’arbre déjà chargé (`lib/budget-detail-export.ts`) | Aucun endpoint ajouté, et donc **pas d’audit log `budget.exported`** — à rouvrir si l’audit de l’export devient une exigence |
| Onglet actif | Persisté en **query string** (`?onglet=`) | Liens profonds partageables vers un onglet ; pas de stockage local |
| KPI d’atterrissage (`ForecastKpiCards`) | Retirés de la fiche | Doublon strict de la bande KPI persistante, avec un vocabulaire divergent (« Forecast » / « Budget total ») |
| Dénouement de l’engagement (§5.2) | Événement porté par `sourceType: INVOICE` / `sourceId: invoiceId` (et non `PURCHASE_ORDER`) | L’annulation de facture est **exactement** réversible ; le plafonnement reste calculé au niveau de la commande |
| En-tête fiche | Socle **`PageHeader`** (comme le portefeuille) : identité + Accès + CTA primaire ; outils secondaires en barre sous la carte | Alignement DS ; plus de header « maison » hors pattern |
| Saisie de dépense | **Une seule** `StariumModal` avec formulaire simple : natures **Engagement / commande** et **Consommé / Facture** → `COMMITMENT_REGISTERED` / `CONSUMPTION_REGISTERED` manuels | Plus de pré-sélecteur à 3 cartes ni de 2ᵉ modale en cascade |
| Graphique Vue d’ensemble | **Réalisé vs prévu** sur **12 mois** d’exercice (`build-realized-vs-planned-chart.ts`) : Prévu = prévision/planning, Réalisé = consommé du mois | Remplace Engagé/Consommé sparse du seul widget `CONSUMPTION_TREND` |

## Titre

**Cockpit fiche budget — alignement cahier des charges DAF (présentation + fonctionnalités)**

## Objectif produit

Transformer `/budgets/[budgetId]` en **cockpit de pilotage d’un budget unique**, lisible CODIR / DAF, dont les actions et onglets correspondent **uniquement** aux besoins métier validés :

| Pilier | Intention |
|--------|-----------|
| **Budget** | Plafond voté, structure enveloppes / lignes, HT/TTC |
| **Prévisionnel** | Planning 12 mois éditable + atterrissage |
| **Snapshots** | Versions figées + comparaison dans le temps |
| **Réaffectations** | Transferts entre lignes, journalisés |
| **Import / export** | CSV / XLSX (+ API REST déjà exposée) |
| **Transversal** | Alertes, droits d’accès, rattachement direction |

**Hors objectif V1 de cette RFC :** construire une nouvelle entité « scénario budgétaire bas / central / haut » (voir §2 H4 et §3 Exclus). Les scénarios **projet** (RFC-PROJ-SC-*) restent hors périmètre.

---

# 1. Analyse de l’existant

## 1.1 Page actuelle

| Élément | Implémentation | Problème |
|---------|----------------|----------|
| Route | `apps/web/src/app/(protected)/budgets/[budgetId]/page.tsx` (~1100 lignes) | Page monolithe, responsabilités mélangées |
| Header | Carte identité + Select budget + 5 boutons outline + chips faux-onglets | ~280 px avant la première donnée ; nom répété 3× ; code technique visible (`…-g51wje5a-V3`) |
| Actions | Sources, Prévisionnel, Réaffectations, Scénarios, Saisir une dépense | Doublons, libellés faux, hiérarchie nulle |
| Pilotage | `BudgetViewTabs` — **7** modes | Recouvrements (Dashboard / Synthèse / Synthèse prévision) |
| KPI | `BudgetKpiGrid` seulement dans Dashboard ; `BudgetKpiCards` si structure vide | KPI absents en Prévisionnel / Atterrissage |
| Alertes | API cockpit `ALERT_LIST` + `BudgetAlertsPanel` | Présent sur `/budgets/dashboard`, **absent** de la fiche |
| Snapshots | API + page `/snapshots` + dialog créé | Dialog **non relié** à un bouton visible sur la fiche |
| Scénarios | `BudgetScenariosVersionsModal` | Coefficients inventés (`0.94` / `1.11`) — **données fausses** |
| Prévisionnel | Onglet + modale `BudgetPrevisionnelModal` | Doublon strict du même `BudgetExplorerTable` |
| Direction | `Budget.ownerOrgUnitId` backend + affichage header | **Absent** du formulaire `budget-form.tsx` |
| Export | — | **Inexistant** (import OK) |
| HT/TTC | `taxMode` + toggle explorateur + `*Ttc` API | Tableau dashboard recalcule TTC côté client (approximation) |
| Cadre UI | `Card` pilotage ⊃ `BudgetDetailDashboard` ⊃ N × `Card` | Cadre-dans-cadre (interdit DS) |
| Libellés | Accents manquants (`Previsionnel`, `Reaffectations`…) | Crédibilité CODIR |

## 1.2 Vocabulaire financier (source de vérité backend)

Agrégats ligne : `apps/api/src/modules/financial-core/budget-line-amounts.aggregate.ts`.

| Terme UI cible (unique) | Définition | Origine |
|-------------------------|------------|---------|
| **Budget** | Plafond (`initialAmount` / base effective après réaffectations) | Structure + `REALLOCATION_DONE` |
| **Prévision** | Plan de dépense (`forecastAmount`) | Allocations `FORECAST` / planning 12 mois |
| **Engagé** | Promesse non encore facturée | `COMMITMENT_REGISTERED` (+ alloc. `COMMITTED`) — typiquement commande |
| **Consommé** | Facturé / imputé | `CONSUMPTION_REGISTERED` (+ alloc. `CONSUMED`) — typiquement facture |
| **Restant** | `base − engagé − consommé` | Calculé |
| **Écart prévision** | `prévision − budget` | Calculé |
| **Version figée** | Snapshot immuable (RFC-031 / RFC-033) | `BudgetSnapshot` |
| **Révision** | Version éditable (RFC-019) | `Budget` versionné |

**Règle d’affichage :** un seul libellé par concept partout (KPI, colonnes, alertes). Interdit : « Total planifié » / « Forecast » / « Prévision » pour le même champ.

## 1.3 APIs déjà disponibles (réutilisation)

| Endpoint | Usage fiche |
|----------|-------------|
| `GET /api/budgets/:id` | Identité, `taxMode`, `ownerOrgUnit`, statut |
| `GET /api/budget-reporting/budgets/:id/summary` | KPI bande persistante (+ `*Ttc`) |
| `GET /api/budget-dashboard?budgetId=` | Courbe, alertes, enveloppes à risque |
| `GET/PUT …/budget-lines/:id/planning` | Prévisionnel mensuel |
| `GET /api/budget-forecast/budgets/:id` | Synthèse atterrissage |
| `GET /api/budget-comparisons/…` | Comparaison versions / snapshots |
| `GET/POST /api/budget-snapshots` | Versions figées |
| `GET/POST /api/budget-reallocations` | Réaffectations |
| `POST /api/budget-imports/*` | Import CSV/XLSX |
| Resource ACL + access diagnostics | Droits d’accès |
| `GET /api/budgets/:id/decision-history` | Historique décisions (RFC-032) |

## 1.4 RFC liées

| RFC | Relation |
|-----|----------|
| [RFC-FE-BUD-031](./RFC-FE-BUD-031%20%E2%80%94%20Portefeuille%20budgets%20UI%20(refonte%20mockup).md) | Lot A portefeuille livré ; **Lot B fiche supersédé** par la présente RFC |
| [RFC-024](./RFC-024%20%E2%80%94%20Budget%20UI.md) | Tableau unique multi-vues — conservé, onglets réduits |
| [RFC-FE-BUD-030](./RFC-FE-BUD-030%20%E2%80%94%20Forecast%20et%20Comparaison%20budg%C3%A9taire%20UI.md) | Comparaison / reporting — réintégré comme onglet Comparaisons |
| [RFC-031](./RFC-031%20%E2%80%94%20Budget%20Snapshots%20MVP%20(fig%C3%A9,%20lecture%20seule).md) / [RFC-033](./RFC-033%20%E2%80%94%20Mise%20en%20place%20des%20versions%20budg%C3%A9taires%20(produit).md) | Snapshots = versions figées |
| [RFC-017](./RFC-017%20%E2%80%94%20Budget%20Reallocation.md) | Réaffectations |
| [RFC-018](./RFC-018%20%E2%80%94%20Budget%20Data%20Import.md) | Import |
| [RFC-022](./RFC-022%20%E2%80%94%20Budget%20Cockpit%20%26%20Dashboard.md) | Alertes / seuils cockpit |
| [RFC-ORG-003](./RFC-ORG-003%20%E2%80%94%20Organisation%20(unit%C3%A9s%20org).md) *(si présent)* | `ownerOrgUnitId` |

## 1.5 Bug métier critique (hors UI mais bloquant crédibilité)

Quand une facture est liée à une commande (`Invoice.purchaseOrderId`), `InvoicesService` enregistre `CONSUMPTION_REGISTERED` **sans dénouer** l’engagement `COMMITMENT_REGISTERED` de la commande → **double comptage** dans `remainingAmount`.

→ **Lot backend séparé** dans cette RFC (§5.2) : correction du dénouement engagé → consommé.

---

# 2. Hypothèses

| # | Hypothèse | Impact si fausse |
|---|----------|------------------|
| H1 | Le cockpit reste sur `/budgets/[budgetId]` (pas de SPA inline depuis le portefeuille) | Aucun |
| H2 | Les montants KPI viennent **toujours** de l’API reporting / dashboard — jamais d’agrégat recalculé en UI pour les totaux affichés | Recalcul client = écart HT/TTC |
| H3 | Vocabulaire unique §1.2 imposé (Budget / Prévision / Engagé / Consommé / Restant / Écart prévision / Version figée) | Incohérence COMEX |
| H4 | « Scénario » au sens bas/central/haut **n’est pas** livré en V1 ; la modale fake est **retirée** ; une RFC dédiée pourra suivre | Si besoin immédiat → bloquer V1 et ouvrir RFC-FE-BUD-033 Scénarios budget |
| H5 | Export V1 = CSV des lignes (ou enveloppes+lignes) du budget courant ; XLSX en V1.1 si parseur déjà présent côté import | PDF hors scope |
| H6 | Engagement manuel sans commande et consommation manuelle sans facture restent possibles (saisie dépense) mais libellés clarifient « saisie manuelle » vs « commande / facture » | Si interdit → retirer kinds manuels |
| H7 | Le Select de switch budget reste sur la fiche (ou breadcrumb) avec **libellé métier** : `name` + code **humain** ; masquer / ne pas afficher les codes contenant un fragment CUID | Codes legacy sales |

---

# 3. Périmètre

## Inclus (V1)

### A — Structure UI (3 zones)

1. **Identité compacte** — retour portefeuille, nom + statut, meta (direction · exercice · devise · responsable), actions hiérarchisées
2. **Bande KPI + alertes persistantes** — visibles sur tous les onglets ; montants API ; toggle HT/TTC
3. **Zone de travail** — onglets métier réduits (voir B)

### B — Navigation (remplace les 7 onglets)

| Onglet | Contenu | Source |
|--------|---------|--------|
| **Vue d’ensemble** | Courbe + alertes panel + tableau enveloppes/lignes (lecture) | `BudgetDetailDashboard` refactoré (sans Card imbriquée) |
| **Prévisionnel** | Explorateur éditable 12 mois + densité mensuel/condensé | `BudgetExplorerTable` mode `previsionnel` — **plein écran, plus de modale** |
| **Suivi** | Engagé / consommé / atterrissage (lecture + drill ligne) | Modes `atterrissage` + synthèse explorateur fusionnés |
| **Comparaisons** | Snapshots, comparaison versions figées, lien révisions RFC-019 | `BudgetReportingForecastPage` + liste snapshots |
| **Réaffectations** | Journal + création | Contenu actuel modale → panneau / page intégrée |
| **Historique** | Décisions + imports récents du budget | RFC-032 + jobs import filtrés `budgetId` |

### C — Actions header (barre unique)

| Action | Comportement | Permission |
|--------|--------------|------------|
| **Importer** | Route `/budgets/:id/import` (plus de modale « Sources » listant tous les mappings client) | `budgets.update` |
| **Exporter** | Téléchargement CSV (nouveau endpoint ou génération client depuis données déjà chargées — préférer API §5.1) | `budgets.read` |
| **Version figée** | Ouvre `CreateBudgetSnapshotDialog` (déjà existant) | `budgets.create` ou `budgets.update` selon API actuelle |
| **Réaffecter** | Ouvre création réaffectation (ou bascule onglet) | `budgets.update` |
| **Saisir** | Aiguilleur enveloppe/ligne + nature (Engagement manuel / Consommation manuelle / Facture) — libellés clarifiés | `budgets.create` |
| **Modifier** | `/budgets/:id/edit` | `budgets.update` |
| **Accès** | ACL ressource budget | ACL policy |

Retirer de la barre : **Scénarios** (fake), **Prévisionnel** (redondant avec onglet), **Sources** (remplacé par Importer).

### D — Formulaire budget

- Ajouter le champ **Direction** (`ownerOrgUnitId`) avec select libellé `OrgUnit.name` (jamais l’UUID)
- Conserver HT/TTC + TVA par défaut
- Afficher le code en édition ; à la création, éviter les codes auto contenant un CUID (voir §5.3)

### E — Nettoyage crédibilité

- Supprimer ou désactiver `BudgetScenariosVersionsModal` (coefficients inventés)
- Supprimer `BudgetPrevisionnelModal` (doublon)
- Supprimer les « recommandations » codées en dur dans `BudgetDetailDashboard` ; brancher `BudgetAlertsPanel` / données `ALERT_LIST`
- Accents FR sur tous les libellés visibles
- Chips non interactives → `Badge` (pas `.starium-tab-btn`)

### F — Backend correctifs liés (même RFC, lots distincts)

- Dénouement engagé à la facturation (si `purchaseOrderId`)
- Endpoint export CSV budget (optionnel si export client-only V1 — préférer API)
- Filtre mappings / jobs import par `budgetId` dans les listes affichées sur la fiche

## Exclus (phases ultérieures / autres RFC)

- Entité `BudgetScenario` bas/central/haut (nouvelle RFC)
- Fusion `/budgets/dashboard` et fiche budget
- Export PDF / multi-budgets
- Correction massive des codes budget déjà générés en base (script migration optionnel)
- Parité onglet Budget fiche projet
- Changement du modèle Prisma hors correctifs §5

---

# 4. Architecture cible

## 4.1 Composition page

```text
PageContainer
├── BudgetDetailHeader          (identité + actions)
├── BudgetDetailKpiStrip        (KPI API + toggle HT/TTC)     .starium-module — pas de Card parente
├── BudgetDetailAlertsBanner    (si totals > 0)              aria-live="polite"
└── BudgetDetailWorkspace
    ├── BudgetDetailTabs        (6 onglets max)
    └── contenu selon tab
```

## 4.2 Mapping onglets anciens → nouveaux

| Ancien (`BudgetPilotageMode`) | Nouveau |
|-------------------------------|---------|
| `dashboard` | **Vue d’ensemble** |
| `synthese` | Fusionné dans **Suivi** |
| `previsionnel` | **Prévisionnel** |
| `atterrissage` | Fusionné dans **Suivi** (sous-vue ou colonnes) |
| `forecast` | Supprimé (contenu renvoyé vers Comparaisons / Suivi) |
| `comparaison` | **Comparaisons** |
| `decisions` | **Historique** |

Type TS : remplacer ou étendre `BudgetPilotageMode` → `BudgetDetailTabId`.

## 4.3 Fichiers à créer / modifier

### Créés

Tous les composants de la fiche vivent désormais dans `apps/web/src/features/budgets/components/budget-detail/` (barrel `index.ts`).

| Fichier | Rôle |
|---------|------|
| `lib/budget-display-labels.ts` (+ `.spec.ts`) | Libellés uniques + `isHumanBudgetCode` / `formatBudgetSelectLabel` (masquage des fragments techniques) |
| `types/budget-detail-tabs.types.ts` | `BudgetDetailTabId`, `BUDGET_DETAIL_TABS`, `budgetDetailTabToExplorerMode`, `isBudgetDetailTabId` |
| `components/budget-detail/budget-detail-header.tsx` | `PageHeader` standard : identité + statut + méta ; actions principales (Select, Accès, Saisir) ; barre d’outils secondaire (Exporter, Version figée, Comparaisons, Prévisionnel, Réaffectations) |
| `components/budget-detail/budget-detail-kpi-strip.tsx` | Bande **6 KPI** persistante (Budget, Engagé, Consommé, Restant, Dépassement, Taux d’exécution) + filtre Tout/CAPEX/OPEX + toggle HT/TTC |
| `components/budget-detail/budget-detail-alerts-banner.tsx` | Alertes API `ALERT_LIST` (composant conservé ; bandeau optionnel selon composition page) |
| `components/budget-detail/budget-detail-tabs.tsx` (+ `.spec.tsx`) | 6 onglets, `role="tablist"`, navigation flèches, scroll horizontal contrôlé |
| `components/budget-detail/budget-detail-workspace.tsx` | Switch de contenu + toolbar contextuelle |
| `components/budget-detail/budget-reallocations-panel.tsx` | Journal des réaffectations + CTA création (réutilisé par `/reallocations`) |
| `components/budget-detail/budget-comparisons-panel.tsx` | Versions figées + comparaison (`BudgetReportingForecastPage variant="embedded"`) |
| `components/budget-detail/budget-historique-panel.tsx` | Frise des décisions + accès à l’assistant d’import |
| `lib/budget-detail-export.ts` (+ `.spec.ts`) | `buildBudgetDetailCsvContent` / `downloadBudgetDetailCsv` (CSV client) |
| `lib/build-realized-vs-planned-chart.ts` (+ `.spec.ts`) | 12 colonnes Prévu / Réalisé pour la Vue d’ensemble |
| `components/forms/budget-form-direction.spec.tsx` | Non-régression du champ Direction (libellé d’unité, jamais l’UUID) |

### Modifiés

| Fichier | Changement |
|---------|------------|
| `apps/web/src/app/(protected)/budgets/[budgetId]/page.tsx` | Orchestration mince : état planning + hooks de données, tout le JSX délégué |
| `apps/web/src/app/(protected)/budgets/[budgetId]/reallocations/page.tsx` | Réutilise `BudgetReallocationsPanel` (fin de la duplication) |
| `apps/web/src/features/budgets/components/budget-detail-dashboard.tsx` | Anti cadre-dans-cadre ; graphique **Réalisé vs prévu** (12 mois) ; panel Analyse & recommandations = lignes critiques API |
| `apps/web/src/features/budgets/components/budget-detail-modals/budget-expense-entry-modal.tsx` | Formulaire unique : **Engagement / commande** et **Consommé / Facture** (libellé, enveloppe, ligne, montant HT, date, aperçu d’impact) → événement financier manuel |
| `apps/web/src/features/budgets/components/budget-detail-modals/index.ts` | `BudgetDetailModal` réduit à `'expense' \| null` |
| `apps/web/src/app/(protected)/budgets/page.tsx` | Portefeuille : fetch exercice effectif sans attendre la synchro URL (réduction du waterfall loading) |
| `apps/api/src/modules/budget-reporting/budget-reporting.service.ts` | Portefeuille : select montants minimal + pas de TTC sur `getExerciseSummary` / `listBudgetsForExercise` |
| `apps/web/src/features/budgets/components/forms/budget-form.tsx` | Champ Direction via `Controller` + `OwnerOrgUnitSelect` |
| `apps/web/src/features/budgets/schemas/create-budget.schema.ts` | `ownerOrgUnitId: z.string().nullable().optional()` |
| `apps/web/src/features/budgets/api/budget-management.api.ts` | `ownerOrgUnitId` sur `CreateBudgetPayload` |
| `apps/web/src/features/budgets/mappers/budget-form.mappers.ts` | Mapping `ownerOrgUnitId` (API ↔ formulaire) |
| `apps/api/src/modules/procurement/invoices/invoices.service.ts` (+ `.spec.ts`) | Dénouement / rétablissement de l’engagement de commande |

Aucun changement Prisma, aucun changement de formule dans `budget-line-amounts.aggregate.ts`.

### Supprimés

| Fichier | Motif |
|---------|-------|
| `budget-detail-modals/budget-scenarios-versions-modal.tsx` | Coefficients inventés `0.94` / `1.11` |
| `budget-detail-modals/budget-previsionnel-modal.tsx` | Doublon strict de l’onglet Prévisionnel |
| `budget-detail-modals/budget-forecast-revision-modal.tsx` | Repris par l’onglet Comparaisons |
| `budget-detail-modals/budget-sources-imports-modal.tsx` | Remplacé par le CTA Importer → assistant d’import |
| `budget-detail-modals/budget-reallocations-journal-modal.tsx` | Remplacé par `BudgetReallocationsPanel` |
| `components/budget-view-tabs.tsx` | Remplacé par `BudgetDetailTabs` |
| `components/budget-scenario-select.tsx` | Code mort (scénarios abandonnés) |
| `components/budget-kpi-cards.tsx` | Remplacé par la bande KPI persistante |

---

# 5. Implémentation

## 5.1 Frontend — lots

### Lot 1 — Structure & vocabulaire (priorité)

1. Extraire `BudgetDetailHeader`, `BudgetDetailKpiStrip`, `BudgetDetailTabs`, `BudgetDetailWorkspace`
2. KPI persistants via `useBudgetSummary` + `formatTaxAwareAmount` / `*Ttc` API
3. Toggle HT/TTC au niveau bande KPI (pas seulement toolbar explorateur)
4. Helper `formatBudgetSelectLabel(name, code)` : n’afficher le code que s’il est « humain » (regex : pas de segment 8+ alphanum type CUID)
5. Libellés uniques dans `budget-display-labels.ts`
6. Accents FR partout sur la fiche

**DoD Lot 1 :** header ≤ ~120 px desktop ; KPI visibles en Prévisionnel ; aucun ID/CUID visible ; typecheck OK.

### Lot 2 — Onglets & suppression doublons

1. Mapper les 6 onglets §3.B
2. Supprimer modales Scénarios + Prévisionnel
3. Brancher `CreateBudgetSnapshotDialog` sur CTA **Version figée**
4. **Importer** → `router.push(budgetImport(id))` ; liste mappings filtrée ou masquée sur la fiche
5. Intégrer réaffectations dans l’onglet (réutiliser contenu modale en panneau)
6. Brancher `BudgetAlertsPanel` / widget `ALERT_LIST` sur Vue d’ensemble + bandeau

**DoD Lot 2 :** plus de contenu fake ; snapshots accessibles en 1 clic ; 0 doublon prévisionnel.

### Lot 3 — Formulaire direction + export

1. Select direction dans `budget-form.tsx` (options `OrgUnit` libellées)
2. Export CSV : endpoint `GET /api/budgets/:id/export?format=csv` **ou** génération client depuis tree déjà chargé (documenter le choix)
3. Tests vitest labels + smoke page

**DoD Lot 3 :** direction éditable ; export téléchargeable ; mobile 320 px OK.

### Lot 4 — Polish DS / RGAA

1. Anti cadre-dans-cadre (Dashboard sans Card parentes inutiles)
2. Tableaux : `StariumTableWrap` ; stratégie mobile (scroll contrôlé / cartes)
3. Cibles ≥ 44 px ; `aria-live` alertes ; focus-visible
4. Tokens uniquement (retirer `bg-emerald-100` etc. hors palette)

## 5.2 Backend — dénouement engagé (Lot F)

**Règle implémentée** dans `invoices.service.ts` — à la création d’une facture liée à une `PurchaseOrder` et à une ligne budgétaire :

1. `CONSUMPTION_REGISTERED` (existant)
2. `poCommitment` = somme des `amountHt` des `financialEvent` `{ clientId, budgetLineId, eventType: COMMITMENT_REGISTERED, sourceType: PURCHASE_ORDER, sourceId: po.id }` — intègre déjà les négatifs d’annulation de commande
3. `alreadyInvoiced` = somme des `amountHt` des `invoice` `{ clientId, purchaseOrderId: po.id, status: { not: CANCELLED }, id: { not: created.id } }`
4. `unwind = max(0, min(created.amountHt, poCommitment − alreadyInvoiced))`
5. si `unwind > 0` → `COMMITMENT_REGISTERED` d’un montant **négatif**, `sourceType: INVOICE`, `sourceId: created.id`, libellé « Dénouement engagement commande *référence* »

`cancel()` somme les dénouements portés par la facture et crée l’événement opposé, ce qui rétablit exactement l’engagement.

**Écart assumé vs proposition initiale :** l’événement de dénouement est porté par `sourceType: INVOICE` / `sourceId: invoiceId` (et non `PURCHASE_ORDER` / `poId`) afin que l’annulation de facture soit strictement réversible. Le plafonnement, lui, reste calculé au niveau de la commande.

Tests (`invoices.service.spec.ts`) : facture sans PO → aucun dénouement · facture partielle → engagement résiduel correct · facture > engagement → plafonné · commande déjà entièrement facturée ou annulée → aucun dénouement · annulation de facture → engagement rétabli · agrégats scopés au client actif.

## 5.3 Codes budget

- Générateur actuel : éviter d’embarquer un fragment `cuid` dans `code`
- Format cible : `{clientCode}-{year}-{slug}-V{n}` ou code saisi utilisateur
- Migration données existantes : **hors V1** (script optionnel)

## 5.4 Export — implémentation client (option retenue)

L’endpoint ci-dessous n’a **pas** été créé. L’export est généré côté client dans `lib/budget-detail-export.ts` depuis les enveloppes et les lignes déjà chargées : une ligne de sous-total par enveloppe puis ses lignes, colonnes `Type ; Enveloppe ; Ligne ; Code ; Nature ; Budget HT ; Prévision HT ; Engagé HT ; Consommé HT ; Restant HT ; TVA % ; Budget TTC`, séparateur `;` et décimales françaises (Excel FR), aucun identifiant technique. Conséquence assumée : **pas d’audit log `budget.exported`**.

Piste serveur conservée si l’audit de l’export ou l’export hors périmètre chargé devient une exigence :

```http
GET /api/budgets/:budgetId/export?format=csv
Permission: budgets.read
Scope: client actif + budgetId
Réponse: text/csv ; attachment ; colonnes métier (enveloppe, ligne, montants HT, taux, TTC si dispo)
Audit: budget.exported (sans DCP)
```

---

# 6. Modifications Prisma

**Aucune obligatoire en V1** pour l’UI.

| Option | Quand |
|--------|-------|
| Aucune | Export client-only + dénouement via événements existants |
| Index / champ export job | Si export asynchrone (hors V1) |
| `BudgetScenario` | **RFC séparée** — pas ici |

---

# 7. Tests

## Backend

| Cas | Module |
|-----|--------|
| Dénouement PO + facture (partiel, plafonné, déjà facturé, PO annulée) | `invoices.service.spec.ts` |
| Annulation de facture → engagement rétabli | idem |
| Isolation client des agrégats engagement / facturé | idem |
| Export CSV scope client | *sans objet — export client* |
| Recalcul remaining après dénouement | inchangé (`budget-line-amounts.aggregate.ts` non modifié) |

## Frontend

| Cas | Fichier |
|-----|---------|
| Libellés uniques / masquage des codes techniques | `lib/budget-display-labels.spec.ts` |
| Onglets : 6 onglets, `aria-selected`, changement d’onglet, mapping mode explorateur | `components/budget-detail/budget-detail-tabs.spec.tsx` |
| Export CSV : en-têtes, agrégation enveloppe, échappement, TTC absent | `lib/budget-detail-export.spec.ts` |
| Graphique 12 mois Prévu / Réalisé | `lib/build-realized-vs-planned-chart.spec.ts` |
| Formulaire budget : champ Direction avec libellé d’unité | `components/forms/budget-form-direction.spec.tsx` |
| Surface des modales de la fiche réduite à `expense` | `components/budget-detail-modals/budget-detail-modals-surface.spec.ts` |

Commandes :

```bash
pnpm --filter @starium-orchestra/web typecheck
pnpm --filter @starium-orchestra/web test
pnpm --filter @starium-orchestra/api test
pnpm audit:modals
```

---

# 8. Critères d’acceptation

- [x] Structure 3 zones (identité / KPI / workspace Vue d’ensemble)
- [x] 6 onglets métier alignés cahier des charges ; plus de « Synthèse prévision » creux
- [x] KPI persistants (6 cellules mockup) ; montants cohérents HT/TTC via API
- [x] CTA Version figée, Exporter, Comparaisons, Prévisionnel, Réaffectations, Accès, Saisir visibles et fonctionnels
- [x] Aucune modale Scénarios avec coefficients inventés
- [x] Aucune modale Prévisionnel doublon
- [x] Saisie de dépense = formulaire unique (Engagement / commande · Consommé / Facture)
- [x] Graphique Vue d’ensemble = Réalisé vs prévu sur 12 mois
- [x] Alertes / lignes critiques depuis l’API (plus de recommandations hardcodées)
- [x] Direction éditable sur le formulaire budget (libellé OrgUnit)
- [x] Aucun UUID / CUID affiché comme libellé principal
- [x] Accents FR ; tokens DS ; pas de cadre-dans-cadre ; `PageHeader` standard
- [x] Mobile dès 320 px ; cibles ≥ 44 px (Prévisionnel forcé en densité `condense` sous `md`)
- [x] (Lot F) Facture liée à commande ne double plus engagé + consommé
- [ ] Reste ouvert : audit log de l’export (nécessite l’endpoint serveur §5.4) et normalisation des `code` budget existants (§5.3, hors V1)

---

# 9. Plan de livraison

| Phase | Contenu | Effort indicatif |
|-------|---------|------------------|
| **0** | Validation H4 (scénarios) + vocabulaire §1.2 avec product owner | 0,5 j |
| **1** | Lot 1 structure + KPI | 2–3 j |
| **2** | Lot 2 onglets + suppressions + snapshots + alertes | 3–4 j |
| **3** | Lot 3 direction + export | 1–2 j |
| **4** | Lot 4 polish DS/RGAA + doc | 1 j |
| **F** | Dénouement engagé (backend) — peut être parallèle dès Phase 1 | 1–2 j |

---

# 10. Récapitulatif

Cette RFC **ne reconstruit pas** le noyau financier : elle **réorganise l’UI** de la fiche budget pour coller au cahier des charges, **élimine le faux** (scénarios inventés), **remonte** ce qui existait déjà (snapshots, alertes, import), **complète** ce qui manquait (direction formulaire, export), et **corrige** le double comptage engagé/consommé.

---

# 11. Points de vigilance

1. **Scénarios** — ne pas réintroduire de chiffres inventés ; ouvrir une RFC dédiée si besoin métier confirmé (bas/central/haut).
2. **Engagé ≠ commande** — natures de saisie : **Engagement / commande** (`COMMITMENT_REGISTERED` manuel) et **Consommé / Facture** (`CONSUMPTION_REGISTERED` manuel) ; une commande fournisseur continue de générer l’engagement côté procurement.
3. **Forecast ≠ atterrissage intelligent** — le prévisionnel reste un plan ; ne pas promettre de recalage auto sur le réalisé sans RFC forecast.
4. **Codes legacy** — masquer en UI sans migration peut masquer des codes encore utiles ; préférer détection CUID stricte.
5. **Permissions** — ne pas affaiblir ACL pour « simplifier » la barre d’actions.
6. **Page monolithe** — extraire les composants avant d’empiler de nouveaux features.
7. **RFC-FE-BUD-031 Lot B** — considérer cette RFC comme source de vérité pour la fiche ; éviter deux specs concurrentes.

---

# 12. Conformité by design

## RGPD

- Pas de nouvelle DCP ; `ownerUserId` / responsables déjà présents.
- Export CSV : montants et libellés métier ; **pas** d’emails / IP ; audit `budget.exported` sans DCP en clair.
- Scope client strict sur export et listes.
- Logs : jamais de payload facture / email en clair.

## RGAA

- Un seul `h1` (nom budget) ; onglets `role="tablist"` / `aria-selected`.
- Labels sur Select direction, HT/TTC, actions.
- Alertes via `aria-live="polite"` ; erreurs `aria-invalid` + `aria-describedby`.
- Contraste AA ; info jamais par la couleur seule (icône + texte sur alertes).
- Focus-visible ; pas de piège de focus hors modales `StariumModal`.

## Design System

- `PageContainer`, `PageHeader` ou header compact tokens, `PortfolioKpiRow` / `BudgetKpiCard`, `StariumModal`, `Badge`, `EmptyState` / `LoadingState` / `ErrorState`.
- Pas de Card autour d’une grille KPI ; pas de valeurs hex / px arbitraires.
- Libellés métier partout (règle valeur ≠ ID).
- Norme modales : `docs/design-system/MODALES.md`.

## Sécurité

- Permissions existantes inchangées sur les endpoints.
- Export : `budgets.read` + isolation `clientId`.
- Dénouement facture : validation PO même client / même ligne.
- Pas de sur-exposition de champs ACL.

## Interface mobile

- Identité empilée ; actions en wrap / menu overflow si besoin.
- KPI 2 colonnes dès `sm`.
- Tableaux : `StariumTableWrap` + scroll horizontal contrôlé ; Prévisionnel 12 mois : densité condensée par défaut sous `md`.
- Cibles tactiles ≥ 44×44 px ; pas d’action hover-only.

---

# 13. Décisions à trancher avant code (Phase 0)

| # | Question | Options |
|---|----------|---------|
| D1 | Scénarios bas/central/haut | **A)** Hors V1 (recommandé) · **B)** Ouvrir RFC-FE-BUD-033 avant Lot 2 |
| D2 | Export | **A)** CSV API · **B)** CSV client-only V1 |
| D3 | Switch budget | **A)** Select dans header · **B)** Dropdown breadcrumb |
| D4 | Saisie engagement manuel sans PO | **A)** Conservée (libellé clair) · **B)** Interdite |

Réponses par défaut si non tranché : **D1=A, D2=A, D3=A, D4=A**.
