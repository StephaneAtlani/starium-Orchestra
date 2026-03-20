# Budget Cockpit — UI & intégration

Documentation d’implémentation de la **vue cockpit budgétaire** (pilotage DG / CODIR) : route `/budgets/dashboard`, API `budget-dashboard`, affichage HT/TTC et composants UI dédiés.

**Références produit / API**

| Document | Rôle |
|----------|------|
| [RFC-FE-002 — Budget Cockpit UI](../RFC/RFC-FE-002%20Budget%20Cockpit%20UI%20Dashboard%20décisionnel%20DG%20CODIR%20.md) | Vision fonctionnelle, périmètre widgets |
| [RFC-022 — Budget Dashboard API](../RFC/RFC-022%20—%20Budget%20Dashboard%20API.md) | Contrat API backend (agrégats, sécurité) |
| [RFC-006 — TVA & toggle d’affichage](../RFC/RFC-006-TVA%20—%20Gestion%20HT%20-%20TTC%20-%20TVA%20%26%20Toggle%20d’affichage.md) | Règles HT/TTC côté produit |
| [FRONTEND_VISION.md](../FRONTEND_VISION.md) | Fond clair, lisibilité contenu |
| [Module Budget Frontend](budget-frontend.md) | Fondation `features/budgets`, query keys, conventions |

---

## 1. Objectif

Offrir un **écran unique** de synthèse pour l’exercice et le budget sélectionnés :

- indicateurs financiers (KPI) avec taux de consommation ;
- alertes ligne (compteurs) ;
- répartition RUN/BUILD/TRANSVERSE, CAPEX/OPEX, tendance mensuelle ;
- tableaux top enveloppes, enveloppes à risque, lignes critiques, top lignes.

Toute la **logique et les agrégats** viennent du backend (`budget-dashboard`). Le frontend n’applique des **projections TTC** qu’en **affichage** lorsque l’API ne fournit pas d’agrégat TTC (voir §5).

---

## 2. Route & accès

| Élément | Valeur |
|---------|--------|
| URL | `/budgets/dashboard` |
| Page Next.js | `apps/web/src/app/(protected)/budgets/dashboard/page.tsx` |
| Conteneur | `BudgetDashboardPage` (`features/budgets/dashboard/budget-dashboard-page.tsx`) |
| Permission navigation | `budgets.read` (voir `config/navigation.ts`) |

Le périmètre **client actif** est imposé comme pour le reste du module : requêtes API via `authenticated-fetch` avec `X-Client-Id`.

---

## 3. Backend

- **Module NestJS** : `apps/api/src/modules/budget-dashboard/`
- **Endpoint** : `GET /api/budget-dashboard`
- **Query** : `exerciseId`, `budgetId`, `includeEnvelopes`, `includeLines` (voir RFC-022)

Les **KPI** peuvent inclure des champs optionnels `*Ttc` (totaux TTC par ligne lorsque les taux sont connus). Sinon, le frontend peut projeter un TTC approximatif à partir de la **TVA par défaut du client** (voir §5).

---

## 4. Frontend — structure des fichiers

```
apps/web/src/features/budgets/
├── api/budget-dashboard.api.ts          # getDashboard(authFetch, params)
├── types/budget-dashboard.types.ts       # BudgetDashboardResponse (aligné API)
├── hooks/use-budget-dashboard.ts         # useBudgetDashboardQuery / alias useBudgetDashboard
├── lib/budget-dashboard-format.ts        # HT/TTC affichage (KPI parts, forecast gap)
└── dashboard/
    ├── budget-dashboard-page.tsx         # Page : header, périmètre, sections
    ├── hooks/use-budget-dashboard-page.ts  # Exercice/budget sélection, labels selects, query
    └── components/
        ├── budget-dashboard-shell.tsx    # espacement vertical + réexport primitives
        ├── budget-cockpit-primitives.tsx # CockpitSection, CockpitSurfaceCard, cockpitCardClass
        ├── budget-cockpit-table-classes.ts  # classes alignement tableaux
        ├── budget-cockpit-status-labels.tsx # EnvelopeRiskLabel, LineSeverityLabel
        ├── budget-dashboard-header.tsx
        ├── budget-kpi-grid.tsx / budget-kpi-card.tsx
        ├── budget-alerts-panel.tsx
        ├── budget-analytics-grid.tsx
        ├── budget-run-build-card.tsx
        ├── budget-top-envelopes-card.tsx
        ├── budget-envelopes-table.tsx
        ├── budget-lines-critique-table.tsx
        ├── budget-top-budget-lines-card.tsx
        ├── budget-dashboard-skeleton.tsx
        ├── budget-dashboard-empty-state.tsx
        └── budget-dashboard-error-state.tsx
```

**Hook page** : `useBudgetDashboardPage` résout les listes exercices/budgets, l’URL ou la sélection par défaut, et appelle `useBudgetDashboardQuery` avec `exerciseId` / `budgetId` pertinents.

---

## 5. Affichage HT / TTC

- **Toggle** : `TaxDisplayModeToggle` + `useTaxDisplayMode()` (`apps/web/src/hooks/use-tax-display-mode.ts`) — même pattern que l’explorateur budget ; persistance par client (localStorage + préférences serveur si disponibles).
- **Helpers** :
  - `formatDashboardAmount` / `formatTaxAwareAmount` (`lib/format-tax-aware-amount.ts`) pour les chaînes complètes ;
  - `formatKpiAmountParts` / `formatForecastGapParts` (`lib/budget-dashboard-format.ts`) pour les **cartes KPI** (montant + devise + badge HT/TTC).
- **Règle** : si l’API expose `totalBudgetTtc`, `committedTtc`, etc., ils sont utilisés en mode TTC ; sinon **TTC ≈** via `defaultTaxRate` du client (`HT × (1 + TVA/100)`), avec préfixe `≈` lorsque c’est une approximation.

Les zones **sans** agrégat TTC backend (RUN/BUILD, CAPEX/OPEX, tendance mensuelle, tableaux) utilisent la même approximation à partir du taux par défaut lorsque le mode TTC est actif.

---

## 6. Composants UI notables

| Zone | Rôle |
|------|------|
| `CockpitSection` | Titre de section + description optionnelle |
| `CockpitSurfaceCard` | Carte avec bandeau (icône, titre, description), corps, footer optionnel |
| `BudgetKpiCard` | KPI avec variantes visuelles (primary, committed, etc.) et pastilles montant |
| `BudgetAlertsPanel` | Carte **Alertes & décisions** (style carte simple, pas le même gabarit que les `CockpitSurfaceCard` larges) |
| `EnvelopeRiskLabel` / `LineSeverityLabel` | Pastilles de risque (`<span>`, pas le `Badge` shadcn pill) |
| Classes `cockpitTh*` / `cockpitTd*` | Alignement homogène des en-têtes et cellules des tableaux |

---

## 7. États UI

| État | Composant |
|------|-----------|
| Chargement | `BudgetDashboardSkeleton` |
| Erreur API | `BudgetDashboardErrorState` (retry) |
| Aucune donnée cockpit | `BudgetDashboardEmptyState` |
| Pas d’alerte ligne | Message dans `BudgetAlertsPanel` |

---

## 8. Points de vigilance

- **Isolation client** : ne jamais afficher ou requêter hors `clientId` actif ; les query keys dashboard incluent `clientId` (`budgetQueryKeys.dashboard`).
- **Cohérence HT/TTC** : les montants « mixtes » (ligne à ligne TVA différente) ne sont pas tous reconstitués en TTC exact côté UI ; l’API agrégée reste la référence quand elle fournit les `*Ttc`.
- **Accessibilité** : titres de section avec `aria-labelledby` où défini ; tableaux scrollables horizontalement sur petits écrans.

---

## 9. Évolution

- Évolutions fonctionnelles : mettre à jour **RFC-FE-002** et **RFC-022**.
- Régression UI : vérifier `data-testid` sur `budget-dashboard-content`, `budget-dashboard-kpis`, `budget-dashboard-alerts`, `budget-dashboard-run-build`, `budget-dashboard-critical-lines`.
