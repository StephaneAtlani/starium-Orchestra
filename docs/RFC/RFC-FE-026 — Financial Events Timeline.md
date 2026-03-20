# **RFC-FE-026 — Financial Events Timeline**

## 1. Objectif

Fournir une **visualisation chronologique unifiée** des événements financiers liés à une ligne budgétaire afin de permettre à l’utilisateur de :

* comprendre l’évolution du budget
* identifier les impacts financiers
* analyser les causes de consommation ou d’ajustement

👉 Objectif clé :
**passer d’une lecture fragmentée (tabs) à une lecture causale et temporelle**

---

## 2. Scope

### Inclus

* timeline des événements financiers au niveau **BudgetLine**
* agrégation multi-sources :

  * commitments (PO)
  * invoices
  * allocations
  * financial events
* affichage UI + interactions

### Exclu

* modification backend
* timeline agrégée au niveau budget
* analytics avancées (burn rate, forecast)

---

## 3. Positionnement dans l’interface

### Emplacement principal

* **Cible long terme** : **Budget Line Detail UI (RFC-FE-005)** — page `/budget-lines/[id]`.
* **Livré en V1** : **`BudgetLineIntelligenceDrawer`** — ouvert depuis l’explorer budget (`/budgets/[budgetId]`, clic sur une ligne). Aucune page `/budget-lines/[id]` requise pour la timeline V1.

---

### Intégration

Ajout d’un nouvel onglet dans le drawer (libellés FR) :

```
[ Vue d’ensemble ] [ Commandes ] [ Factures ] [ Allocations ] [ Timeline ] [ Infos DSI ]
```

👉 `Timeline` = onglet dédié (agrégation multi-sources côté frontend)

---

## 4. Problème actuel

* données dispersées dans plusieurs tabs
* aucune vision globale
* difficulté à expliquer :

  * consommation
  * écarts
  * historique

---

## 5. Solution

Créer une **timeline unifiée des événements financiers**.

---

## 6. Modèle de données frontend

```ts
type TimelineEvent = {
  id: string
  date: string
  type: 'commitment' | 'invoice' | 'allocation' | 'adjustment'
  title: string
  description?: string
  amount: number
  currency: string
  direction: 'increase' | 'decrease'
  status?: string
  referenceId?: string
}
```

---

## 7. Sources de données

### APIs utilisées (inchangées — implémentation V1)

Endpoints **sous** `budget-lines` (scopes client via `X-Client-Id` + droits `budgets.read` / `procurement.read` selon route) :

* `GET /api/budget-lines/:id/events`
* `GET /api/budget-lines/:id/allocations`
* `GET /api/budget-lines/:id/purchase-orders`
* `GET /api/budget-lines/:id/invoices`

*(Les variantes query globales type `GET /api/invoices?budgetLineId=` ne sont pas utilisées par la V1 livrée.)*

---

### Stratégie

* récupération parallèle (React Query)
* normalisation côté frontend
* merge + tri chronologique

---

## 8. Mapping métier

### Commitment (PO)

* type : `commitment`
* direction : `decrease`
* signification : engagement budgétaire

---

### Invoice

* type : `invoice`
* direction : `decrease`
* signification : consommation réelle

---

### Allocation

* type : `allocation`
* direction :

  * incoming → `increase`
  * outgoing → `decrease`

---

### FinancialEvent

* type : `adjustment`
* fallback générique

---

## 9. Architecture frontend

### Arborescence

```
features/budgets/components/timeline/
├── budget-line-timeline.tsx
├── timeline-event-item.tsx
├── timeline-filters.tsx
├── timeline-utils.ts
```

---

### Hook principal

```ts
useBudgetLineTimeline(budgetLineId)
```

Responsabilités :

* fetch multi-sources
* transformation
* tri
* filtrage
* cache

---

### Merge

```ts
const events = [
  ...mapCommitments(),
  ...mapInvoices(),
  ...mapAllocations(),
  ...mapFinancialEvents()
]

return events.sort((a, b) => new Date(b.date) - new Date(a.date))
```

---

## 10. UI / UX

### Structure

Timeline verticale :

```
● 12 jan 2026
  PO-001 créé
  -5 000 €

● 18 jan 2026
  Facture F-2026-12
  -4 200 €

● 25 jan 2026
  Allocation entrante
  +2 000 €
```

---

### Codes visuels

* 🔴 sortie → decrease
* 🟢 entrée → increase
* ⚪ neutre → draft

---

### Badges

* PO
* FACTURE
* ALLOCATION
* AJUSTEMENT

---

### Interactions

* click → ouvre détail (drawer existant)
* hover → tooltip
* filtres :

  * type
  * période
* tri :

  * date desc (par défaut)

---

## 11. États UI

* loading → skeleton
* empty → “Aucun événement financier”
* error → retry

---

## 12. Performance

### Pagination

* support backend offset/limit
* infinite scroll recommandé

---

### React Query

* cache par `budgetLineId`
* invalidation obligatoire après :

  * création invoice
  * création commitment
  * allocation

---

## 13. Accessibilité

* navigation clavier
* focus sur éléments timeline
* aria-label

---

## 14. Cohérence métier

La timeline doit être :

* cohérente avec :

  * KPI
  * remaining budget
* sans doublons
* triée correctement

---

## 15. Critères de succès

* compréhension immédiate de l’historique
* capacité à expliquer une variation budgétaire
* performance fluide
* cohérence des données

---

## 16. Risques

### Données incomplètes

* invoice sans commitment
* allocation isolée

👉 fallback obligatoire

---

### Volume élevé

👉 pagination obligatoire

---

## 17. Évolutions futures

* burn rate graph
* forecast
* IA explicative
* alertes dérive budgétaire

---

## 18. Priorité

👉 **Haute**

Justification :

* impact UX majeur
* différenciation produit
* base pour analytics avancées

---

## 19. Dépendances

* RFC-FE-005 (Budget Line Detail UI)
* RFC-015 (Financial Core) 

---

## 20. Résumé

Cette RFC introduit une **timeline financière unifiée** au niveau ligne budgétaire permettant :

* une lecture claire
* une compréhension immédiate
* une base solide pour le pilotage financier

---

## Verdict

👉 Feature **structurante**
👉 Transformation UX majeure
👉 Fondamentale pour ton positionnement “cockpit de pilotage”

---

## 21. Implémentation V1 (état repo)

**Périmètre** : drawer uniquement, **frontend uniquement**, backend non modifié.

| Élément | Détail |
|--------|--------|
| **Entrée UI** | `BudgetLineIntelligenceDrawer` — `apps/web/src/features/budgets/components/budget-line-drawer/budget-line-intelligence-drawer.tsx` |
| **Onglet Timeline** | `BudgetLineTimelineTab`, `TimelineEventItem`, `TimelineFilters` |
| **Données** | `useBudgetLineTimeline` — 4 `useQuery` parallèles, `isError` si **une** source échoue (stricte) |
| **Normalisation** | `timeline-utils.ts` — type `TimelineEvent`, mappers, dédup (éviter doublon event / PO ou event / facture), filtres type + période |
| **Présentation** | `timeline-display.ts` — libellés FR statuts procurement, montants signés |
| **Query keys** | `budgetQueryKeys.timeline(clientId, budgetLineId)` + sous-clés `events` / `allocations` / `purchase-orders` / `invoices` ; ajouts `budgetLinePurchaseOrders`, `budgetLineInvoices` |
| **API web** | `listInvoicesByBudgetLine` dans `procurement.api.ts` (miroir des PO par ligne) |
| **Invalidation** | Après création PO / facture : invalidation `timeline` + clés lignes (`budget-line-events`, allocations, purchase-orders, invoices) |
| **Tests** | `timeline-utils.spec.ts` (Vitest, `apps/web`) |
| **Autres UX** | Poignée du drawer : toggle hauteur réduite ↔ **plein écran** (`100dvh`, sm+) ; table `BudgetLineEventsTable` (onglets Commandes / Factures) : dates FR, badges, montants cohérents |

**Hypothèse affichage** : les types TS `PurchaseOrder` / `Invoice` n’exposent pas toujours `currency` — la devise des lignes PO/facture en timeline reprend la **devise de la ligne budgétaire**.

---

## 22. Suite possible (hors V1)

* Répliquer ou compléter la timeline sur la **page** `/budget-lines/[id]` lorsque RFC-FE-005 sera livrée.
* Pagination / infinite scroll si volume > première page (ex. `limit` 200 par source aujourd’hui).

