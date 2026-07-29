import type { BudgetListItemWithKpi } from '../types/budget-reporting.types';
import { formatBudgetAmount, formatRate, budgetStatusLabel } from './budget-portfolio-format';

const CSV_HEADERS = [
  'Budget',
  'Code',
  'Alloué',
  'Engagé',
  'Consommé',
  'Reste',
  'Exécution',
  'État',
];

function escapeCsv(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

export function buildBudgetsPortfolioCsvContent(
  items: BudgetListItemWithKpi[],
): string {
  const lines = [
    CSV_HEADERS.join(';'),
    ...items.map((row) => {
      const currency = row.kpi.currency ?? row.budget.currency;
      return [
        row.budget.name,
        row.budget.code ?? '',
        formatBudgetAmount(row.kpi.totalInitialAmount, currency),
        formatBudgetAmount(row.kpi.totalCommittedAmount, currency),
        formatBudgetAmount(row.kpi.totalConsumedAmount, currency),
        formatBudgetAmount(row.kpi.totalRemainingAmount, currency),
        formatRate(row.kpi.consumptionRate),
        budgetStatusLabel(row.budget.status),
      ]
        .map(escapeCsv)
        .join(';');
    }),
  ];
  return lines.join('\n');
}

export function downloadBudgetsPortfolioCsv(
  items: BudgetListItemWithKpi[],
  filenameHint: string,
): void {
  const csv = buildBudgetsPortfolioCsvContent(items);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `budgets-${filenameHint}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
