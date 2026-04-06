# Vérification conformité RFC-022 — Budget Dashboard API

Références : plan `.cursor/plans/budget_dashboard_api_rfc-022_a67dc6b8.plan.md` et `docs/RFC/RFC-022 — Budget Dashboard API.md`.

---

## 1. Backend — Structure et endpoint

| Exigence | Statut |
|----------|--------|
| Module `apps/api/src/modules/budget-dashboard/` avec module, controller, service, dto, types | Conforme |
| GET /api/budget-dashboard | Conforme |
| Guards : JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard | Conforme |
| Permission `budgets.read` | Conforme |
| BudgetDashboardModule enregistré dans app.module.ts | Conforme |

---

## 2. Résolution budget / exercice

| Cas | Exigence | Statut |
|-----|----------|--------|
| budgetId fourni | Charger budget (clientId + id), 404 si absent ; déduire exercice | Conforme |
| exerciseId fourni | Charger exercice ; budget versionné actif → sinon premier budget hors LOCKED/ARCHIVED (`updatedAt` desc) → sinon plus récent (tous statuts) ; 404 si aucun budget | Conforme |
| Aucun paramètre | Exercice courant (ACTIVE + endDate >= now) ou plus récent par endDate desc ; même logique budget | Conforme |
| Filtrage | Tout filtré par clientId | Conforme |

---

## 3. Sources de calcul (plan §3)

| Bloc | Source attendue | Implémentation |
|------|-----------------|----------------|
| totalBudget | BudgetLine.revisedAmount (SUM) | `linesForAggregation.reduce(..., revisedAmount)` |
| committed / consumed / forecast | FinancialAllocation (allocationType) | `getAllocationSums()` |
| remaining | BudgetLine.remainingAmount (SUM) | `linesForAggregation.reduce(..., remainingAmount)` — pas de recalcul totalBudget - committed - consumed |
| consumptionRate | consumed / totalBudget | Conforme |
| capexOpexDistribution | BudgetLine.expenseType + revisedAmount | Filtre CAPEX/OPEX + reduce |
| monthlyTrend | FinancialEvent (eventDate puis createdAt) | `buildMonthlyTrend` avec `e.eventDate ?? e.createdAt`, COMMITMENT_REGISTERED / CONSUMPTION_REGISTERED |
| topEnvelopes | BudgetLine par enveloppe (revised, consumed, remaining) | buildTopEnvelopes |
| riskEnvelopes | BudgetLine (forecastAmount, revisedAmount → budgetAmount) | buildRiskEnvelopes avec budgetAmount, riskRatio, riskLevel |
| topBudgetLines | BudgetLine (consumed, forecast, remaining par ligne) | buildTopBudgetLines |

---

## 4. Règles détaillées

| Règle | Statut |
|-------|--------|
| remaining = SUM(BudgetLine.remainingAmount), pas totalBudget - committed - consumed | Conforme |
| monthlyTrend : month YYYY-MM, eventDate fallback createdAt | Conforme |
| topEnvelopes tri par consumed décroissant, limite 10 | Conforme (.sort consumed desc, slice TOP_LIMIT) |
| topBudgetLines tri par consumedAmount décroissant, limite 10 | Conforme |
| riskEnvelopes : budgetAmount, riskRatio, riskLevel ; seuils &lt;0.7 LOW, 0.7–0.9 MEDIUM, &gt;0.9 HIGH | Conforme |

---

## 5. Query params et réponse

| Exigence | Statut |
|----------|--------|
| includeEnvelopes/includeLines : @Transform puis @IsBoolean (chaîne → booléen) | Conforme (toBoolean + Transform) |
| includeEnvelopes=false → topEnvelopes et riskEnvelopes absents | Conforme (if (includeEnvelopes) { ... }) |
| includeLines=false → topBudgetLines absent | Conforme |
| exercise.code et budget.code en string \| null | Conforme (types + exercise.code ?? null) |
| Structure BudgetDashboardResponse (plan §6) | Conforme |

---

## 6. Frontend

| Exigence | Statut |
|----------|--------|
| Route /budgets/dashboard | Conforme |
| Navigation : section Finance, Dashboard Budgets, requiredPermissions budgets.read | Conforme |
| Page protégée (RequireActiveClient), GET /api/budget-dashboard | Conforme |
| Affichage exercice et budget résolus (noms, codes, devise) | Conforme |
| États loading / error / empty | Conforme |
| KPI cards (6 indicateurs) | Conforme |
| Répartition CAPEX/OPEX, trend mensuel | Conforme |
| Top enveloppes, enveloppes à risque, top lignes (rendu conditionnel si présents) | Conforme |

---

## 7. Écart volontaire par rapport au RFC brut

- **remaining** : le RFC §7 indique `remaining = totalBudget - committed - consumed`. Le **plan** impose `remaining = SUM(BudgetLine.remainingAmount)` pour rester aligné avec le moteur financier. L’implémentation suit le plan.
- **Monthly trend** : le RFC §10 mentionne `FinancialEvent.createdAt`. Le **plan** impose `eventDate` avec fallback `createdAt`. L’implémentation suit le plan.
- **Réponse** : le RFC §5 montre `exerciseId` / `budgetId` en racine ; le plan impose les objets `exercise` et `budget` enrichis. L’implémentation suit le plan.

---

## 8. Correction effectuée

- **Service** : regroupement des imports en tête de fichier (type `DecimalLike` déplacé après tous les `import`).

---

**Conclusion** : le code est conforme au plan d’implémentation RFC-022 et aux choix normatifs qui détaillent/ajustent le RFC (remaining, date de tendance, structure de réponse).
