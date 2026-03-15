# Budget Dashboard — Scénarios de test

La page `/budgets/dashboard` expose les `data-testid` suivants pour les tests (e2e ou unitaires).

## États

- **Loading** : `data-testid="budget-dashboard-loading"` — affichage du skeleton pendant l’appel API.
- **Error** : `data-testid="budget-dashboard-error"` — message d’erreur + bouton Réessayer.
- **Empty** : `data-testid="budget-dashboard-empty"` — message « Aucun budget ou exercice trouvé ».
- **Content** : `data-testid="budget-dashboard-content"` — cockpit avec exercice, budget, KPI, tableaux.

## KPI (quand données présentes)

- `kpi-total-budget`, `kpi-committed`, `kpi-consumed`, `kpi-forecast`, `kpi-remaining`, `kpi-consumption-rate`.

## Rendu conditionnel

- **Top enveloppes** : section affichée seulement si `topEnvelopes` est présent dans la réponse.
- **Enveloppes à risque** : section affichée seulement si `riskEnvelopes` est présent.
- **Top lignes** : section affichée seulement si `topBudgetLines` est présent.

## Checklist plan RFC-022

- [ ] Loading state affiché pendant l’appel API.
- [ ] Error state affiché avec message et possibilité de réessayer.
- [ ] Empty state affiché en cas de 404 ou réponse sans budget.
- [ ] Les 6 KPI affichés lorsque les données sont présentes.
- [ ] Sections enveloppes / lignes affichées uniquement si les tableaux correspondants sont présents.
