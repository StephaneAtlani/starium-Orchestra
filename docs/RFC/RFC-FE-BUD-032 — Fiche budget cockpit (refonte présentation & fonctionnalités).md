# RFC-FE-BUD-032 — Fiche budget cockpit (refonte présentation & fonctionnalités)

## Statut

**Draft** — spécification à implémenter. Remplace et précise le **Lot B / Phase 2–3** de [RFC-FE-BUD-031](./RFC-FE-BUD-031%20%E2%80%94%20Portefeuille%20budgets%20UI%20(refonte%20mockup).md) pour la route `/budgets/[budgetId]`.

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

### Créer

| Fichier | Rôle |
|---------|------|
| `docs/RFC/RFC-FE-BUD-032 — Fiche budget cockpit (refonte présentation & fonctionnalités).md` | La présente RFC |
| `apps/web/src/features/budgets/components/budget-detail-header.tsx` | Identité + actions |
| `apps/web/src/features/budgets/components/budget-detail-kpi-strip.tsx` | Bande KPI persistante (`PortfolioKpiRow` / `BudgetKpiCard`) |
| `apps/web/src/features/budgets/components/budget-detail-alerts-banner.tsx` | Wrap `BudgetAlertsPanel` ou bande compacte |
| `apps/web/src/features/budgets/components/budget-detail-tabs.tsx` | Remplace `BudgetViewTabs` (6 onglets) |
| `apps/web/src/features/budgets/components/budget-detail-workspace.tsx` | Switch contenu onglets |
| `apps/web/src/features/budgets/lib/budget-display-labels.ts` | Libellés uniques + helper masquage code CUID |
| `apps/api/src/modules/budget-export/…` *(si Lot F API)* | Export CSV |

### Modifier (principaux)

| Fichier | Changement |
|---------|------------|
| `apps/web/src/app/(protected)/budgets/[budgetId]/page.tsx` | Orchestration mince ; délégation aux composants ci-dessus |
| `apps/web/src/features/budgets/components/budget-detail-dashboard.tsx` | Anti cadre-dans-cadre ; alertes API ; montants TTC API ; accents |
| `apps/web/src/features/budgets/components/budget-view-tabs.tsx` | Déprécié → `budget-detail-tabs.tsx` |
| `apps/web/src/features/budgets/types/budget-pilotage.types.ts` | Nouveaux ids d’onglet |
| `apps/web/src/features/budgets/components/forms/budget-form.tsx` | Champ `ownerOrgUnitId` |
| `apps/web/src/features/budgets/schemas/create-budget.schema.ts` | `ownerOrgUnitId` optionnel |
| `apps/web/src/features/budgets/components/budget-detail-modals/*` | Retirer Scénarios fake + Prévisionnel modale ; conserver expense / realloc |
| `apps/api/src/modules/procurement/invoices/invoices.service.ts` | Dénouement engagement |
| `apps/api/src/modules/financial-core/budget-line-amounts.aggregate.ts` | Doc + tests si formule évolue |
| `docs/RFC/RFC-FE-BUD-031 — …` | Pointer Lot B → RFC-FE-BUD-032 |
| `docs/RFC/_RFC Liste.md` | Index |
| `docs/modules/budget-frontend.md` | Parcours fiche |
| `docs/INVENTAIRE-COMPOSANTS.md` | Nouveaux composants détail |

### Supprimer / déprécier

| Fichier | Action |
|---------|--------|
| `budget-detail-modals/budget-scenarios-versions-modal.tsx` | Supprimer ou gate `featureFlag` off + toast « non disponible » |
| `budget-detail-modals/budget-previsionnel-modal.tsx` | Supprimer |
| `budget-scenario-select.tsx` | Garder placeholder **uniquement** si RFC scénarios ouverte ; sinon retirer de la fiche |

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

**Règle :** à la validation d’une facture liée à une `PurchaseOrder` :

1. Créer `CONSUMPTION_REGISTERED` (existant)
2. Créer un `COMMITMENT_REGISTERED` **négatif** (ou événement dédié de dénouement) pour le montant facturé, plafonné à l’engagement restant de la commande, `sourceType: PURCHASE_ORDER`, `sourceId: poId`

**Alternative acceptable :** recalcul `committedAmount = max(0, engagements − consommations liées PO)` — à documenter dans le service ; préférer la piste événements pour auditabilité.

Tests obligatoires :

- Isolation client
- Facture sans PO → pas de dénouement
- Facture partielle → engagement résiduel correct
- Annulation facture → rétablir l’engagement

## 5.3 Codes budget

- Générateur actuel : éviter d’embarquer un fragment `cuid` dans `code`
- Format cible : `{clientCode}-{year}-{slug}-V{n}` ou code saisi utilisateur
- Migration données existantes : **hors V1** (script optionnel)

## 5.4 Export API (si Lot 3 côté serveur)

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
| Dénouement PO + facture | `invoices.service.spec.ts` |
| Isolation client facture / PO | idem |
| Export CSV scope client | `budget-export` si créé |
| Recalcul remaining après dénouement | `budget-line-amounts.aggregate.spec.ts` |

## Frontend

| Cas | Fichier |
|-----|---------|
| Labels uniques / masquage CUID | `budget-display-labels.spec.ts` |
| Onglets : mode → contenu | smoke / unit tabs |
| Snapshot dialog ouvert depuis CTA | interaction légère |
| Formulaire budget : champ direction présent | `budget-form` |
| Pas de rendu Scénarios fake | assertion absence coefficients |

Commandes :

```bash
pnpm --filter @starium-orchestra/web typecheck
pnpm --filter @starium-orchestra/web test
pnpm --filter @starium-orchestra/api test
pnpm audit:modals
```

---

# 8. Critères d’acceptation

- [ ] Structure 3 zones (identité / KPI+alertes / workspace)
- [ ] ≤ 6 onglets métier alignés cahier des charges ; plus de « Synthèse prévision » creux
- [ ] KPI persistants sur tous les onglets ; montants cohérents HT/TTC via API
- [ ] CTA Version figée, Importer, Exporter, Réaffecter, Accès, Modifier visibles et fonctionnels
- [ ] Aucune modale Scénarios avec coefficients inventés
- [ ] Aucune modale Prévisionnel doublon
- [ ] Alertes réelles (API) sur la fiche ; plus de recommandations hardcodées
- [ ] Direction éditable sur le formulaire budget (libellé OrgUnit)
- [ ] Aucun UUID / CUID affiché comme libellé principal
- [ ] Accents FR ; tokens DS ; pas de cadre-dans-cadre
- [ ] Mobile dès 320 px ; cibles ≥ 44 px
- [ ] (Lot F) Facture liée à commande ne double plus engagé + consommé

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
2. **Engagé ≠ commande** — clarifier dans l’UI (tooltip) : la commande *génère* l’engagement ; la saisie manuelle est un engagement sans PO.
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
