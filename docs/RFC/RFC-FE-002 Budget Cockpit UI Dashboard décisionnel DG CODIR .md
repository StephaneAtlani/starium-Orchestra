# RFC-FE-002 — Budget Cockpit UI (shadcn/ui)

## Statut

Draft

## Titre

**RFC-FE-002 | Budget Cockpit UI | Dashboard décisionnel DG / CODIR (shadcn/ui)**

---

# 1. Objectif

Transformer `/budgets/dashboard` en un **cockpit budgétaire premium**, orienté décision, permettant en <10 secondes de :

* comprendre la situation budgétaire globale
* identifier les risques
* prioriser les actions
* accéder au détail (drill-down)

⚠️ Ce n’est pas une page de data → c’est une **interface de pilotage**.

---

# 2. Principes UX (NON NÉGOCIABLES)

## 2.1 Lecture en Z (executive reading)

1. KPI (haut)
2. alertes (impact)
3. répartition (analyse)
4. tableaux (action)

## 2.2 Signal > Data

* couleurs → statut
* icônes → compréhension rapide
* chiffres → contextualisés

## 2.3 1 écran = 1 décision

L’utilisateur doit savoir :

👉 *où agir immédiatement*

---

# 3. Stack UI

* **shadcn/ui**
* Tailwind CSS
* lucide-react (icons)
* TanStack Query

---

# 4. Layout global

```txt
Container (max-w-7xl mx-auto p-6 space-y-6)

├── Header
├── KPI Grid
├── Alerts Panel
├── Analytics Grid
├── Tables Section
```

---

# 5. Design system (Starium)

## Couleurs

```ts
primary: #DB9801 (Or)
background: #0F0F0F
card: #1B1B1B
text: #FFFFFF
muted: #A1A1AA
danger: #EF4444
warning: #F59E0B
success: #10B981
```

## Règles

* fond sombre premium
* contrastes forts
* pas de gris fades
* bordures subtiles (`border-white/10`)
* radius large (`rounded-2xl`)

---

# 6. Header

## Composants shadcn

* `Select`
* `Button`
* `Separator`

## Structure

```tsx
<div className="flex items-center justify-between">
  <div>
    <h1 className="text-2xl font-semibold">Dashboard budgétaire</h1>
    <p className="text-sm text-muted-foreground">
      Vision globale du budget
    </p>
  </div>

  <div className="flex items-center gap-2">
    <Select /> // exercice
    <Select /> // budget
    <Button variant="outline">Actualiser</Button>
  </div>
</div>
```

---

# 7. KPI Grid (CRITIQUE)

## Layout

```tsx
grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4
```

## Composant

👉 `Card` (shadcn)

## KPI Card Design

```tsx
<Card className="bg-[#1B1B1B] border border-white/10 rounded-2xl">
  <CardContent className="p-4 space-y-2">
    
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">
        Budget révisé
      </span>
      <Euro className="w-4 h-4 text-muted-foreground" />
    </div>

    <div className="text-2xl font-semibold text-white">
      1 250 000 €
    </div>

    <div className="text-xs text-muted-foreground">
      +5% vs initial
    </div>

  </CardContent>
</Card>
```

## KPI obligatoires

* Budget révisé
* Engagé
* Consommé
* Disponible
* Forecast
* Écart forecast

---

# 8. Alerts Panel (ZONE DÉCISION)

## Composants

* `Card`
* `Badge`
* `Alert`

## Design

```tsx
<Card className="bg-[#1B1B1B] border border-red-500/20">
  <CardHeader>
    <CardTitle className="text-red-400">
      Alertes critiques
    </CardTitle>
  </CardHeader>

  <CardContent className="space-y-3">

    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <AlertTriangle className="text-red-400 w-4 h-4" />
        <span>12 lignes en dépassement</span>
      </div>

      <Button size="sm" variant="ghost">
        Voir
      </Button>
    </div>

  </CardContent>
</Card>
```

## Types d’alertes

* dépassement
* reste négatif
* sur-engagement
* forecast > budget

---

# 9. Analytics Grid

## Layout

```tsx
grid md:grid-cols-2 gap-4
```

## Widgets

### 9.1 Répartition RUN / BUILD

* `Card`
* `Progress` ou bar chart

### 9.2 Top enveloppes

* list UI
* ranking visuel

---

# 10. Tables (ACTION)

## Composants

* `Table`
* `Badge`
* `Button`

## Table 1 — Enveloppes

```tsx
<Table>
  <TableHeader>...</TableHeader>
  <TableBody>
    <TableRow className="hover:bg-white/5 cursor-pointer">
      <TableCell>Infrastructure</TableCell>
      <TableCell>500k€</TableCell>
      <TableCell>
        <Badge variant="destructive">Risque</Badge>
      </TableCell>
    </TableRow>
  </TableBody>
</Table>
```

## Table 2 — Lignes critiques

* tri par risque
* highlight couleur
* **Implémentation** : `BudgetLinesCritiqueTable` — clic ligne → `BudgetLineIntelligenceDrawer` ; lien « Ouvrir le budget » avec isolation du clic (`stopPropagation`) pour naviguer vers le détail budget sans ouvrir le drawer.

## Table 3 — Top lignes

* classement par consommation (ordre API)
* colonne **#** (rang), `table-fixed` + `colgroup`, libellés Ligne / Enveloppe tronqués avec `title` pour le texte complet
* **Implémentation** : `BudgetTopBudgetLinesCard` — même ouverture du drawer au clic ligne que pour les lignes critiques.

**Référence technique** : [docs/modules/budget-cockpit.md](../modules/budget-cockpit.md) (§6.1, §6.2).

---

# 11. Codes couleur (ULTRA IMPORTANT)

| Statut    | Couleur |
| --------- | ------- |
| OK        | vert    |
| attention | orange  |
| critique  | rouge   |

```tsx
text-green-400
text-orange-400
text-red-400
```

---

# 12. Drill-down UX

## Règles

* click KPI → filtre
* click table enveloppes / lignes → **contexte** (voir ci-dessous)
* click alerte → focus (scroll vers section lignes critiques)

## Interactions (implémenté sur `/budgets/dashboard`)

* **Lignes critiques / Top lignes** : clic sur la ligne → ouverture de **`BudgetLineIntelligenceDrawer`** avec `budgetLineId` (même composant que sur `/budgets/[budgetId]`, voir RFC-FE-ADD-006).
* **Lien « Ouvrir le budget »** (tableau lignes critiques uniquement) : navigation vers `/budgets/[budgetId]` sans ouvrir le drawer.

```tsx
onClick={() => router.push(`/budgets/${budgetId}`)}
```

ou (cockpit & page budget)

```tsx
openBudgetLineDrawer(lineId)
```

---

# 13. États UI

## Loading

* skeleton shadcn

## Empty

```tsx
<Card>
  <CardContent className="text-center text-muted-foreground">
    Aucun budget disponible
  </CardContent>
</Card>
```

## Error

* message + retry

---

# 14. Architecture frontend

## Structure

```
features/budgets/dashboard/

├── components/
│   ├── kpi-card.tsx
│   ├── alerts-panel.tsx
│   ├── analytics.tsx
│   ├── envelopes-table.tsx
│   └── lines-table.tsx

├── hooks/
│   └── use-budget-dashboard.ts

├── api/
│   └── dashboard.api.ts

└── page.tsx
```

---

# 15. Hooks React Query

```ts
useBudgetDashboard({
  exerciseId,
  budgetId,
})
```

* tenant-aware
* dépend du client actif
* fallback RFC-016 si pas d’API dédiée

---

# 16. Critères d’acceptation

La RFC est validée si :

* UI lisible en <10 sec
* KPI visibles sans scroll
* alertes visibles immédiatement
* navigation fluide
* aucun calcul métier frontend
* cohérence design Starium
* responsive OK

---

# 17. Ce qui fait un rendu 10/10

👉 Ce point est clé

* densité d’info maîtrisée
* contrastes forts
* zéro bruit visuel
* hiérarchie claire
* interactions rapides

