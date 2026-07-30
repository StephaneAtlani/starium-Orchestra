'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useActiveClient } from '@/hooks/use-active-client';
import { saveBudgetCockpitSelection } from '@/features/budgets/lib/budget-cockpit-selection-storage';
import { BUDGET_STATUS_OPTIONS } from '../constants/budget-filters';
import { budgetDetail } from '../constants/budget-routes';
import type { BudgetListItemWithKpi, BudgetSummaryKpi } from '../types/budget-reporting.types';
import type { BudgetsListParams } from '../types/budget-list.types';
import {
  PortfolioProgressBar,
  TableToneAmount,
  TableToneBadge,
  rateToPercent,
  toneAmountClass,
  type StatusTone,
} from '@/components/portfolio';
import { BudgetStatusBadge } from './budget-status-badge';
import {
  formatBudgetAmount,
  isBudgetRowAlert,
} from '../lib/budget-portfolio-format';
import {
  budgetExpenseMixLabel,
  budgetExecutionTone,
  budgetPortfolioIcon,
  budgetPortfolioIconPresentation,
  budgetPortfolioSubtitle,
} from '../lib/budget-portfolio-display';
import { BudgetsPortfolioCards } from './budgets-portfolio-cards';

export type BudgetsTableSortKey =
  | 'name'
  | 'type'
  | 'allocated'
  | 'committed'
  | 'consumed'
  | 'remaining'
  | 'execution'
  | 'status';

type SortOrder = 'asc' | 'desc';

function SortHeaderButton({
  label,
  sortKey,
  activeKey,
  order,
  onSort,
  align = 'left',
}: {
  label: string;
  sortKey: BudgetsTableSortKey;
  activeKey: BudgetsTableSortKey;
  order: SortOrder;
  onSort: (key: BudgetsTableSortKey) => void;
  align?: 'left' | 'right';
}) {
  const isActive = activeKey === sortKey;
  const Icon = isActive ? (order === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <button
      type="button"
      className={cn(
        'inline-flex max-w-full items-center gap-1 font-medium hover:text-foreground',
        align === 'right' && 'w-full justify-end',
      )}
      onClick={() => onSort(sortKey)}
      title={`Trier par ${label}`}
    >
      <span className="min-w-0 truncate">{label}</span>
      <Icon
        className={cn(
          'size-3.5 shrink-0',
          isActive ? 'text-primary' : 'text-muted-foreground opacity-60',
        )}
        aria-hidden
      />
    </button>
  );
}

function sortValue(row: BudgetListItemWithKpi, key: BudgetsTableSortKey): string | number {
  switch (key) {
    case 'name':
      return row.budget.name.toLocaleLowerCase('fr');
    case 'type':
      return row.budget.expenseMix ?? '';
    case 'allocated':
      return row.kpi.totalInitialAmount;
    case 'committed':
      return row.kpi.totalCommittedAmount;
    case 'consumed':
      return row.kpi.totalConsumedAmount;
    case 'remaining':
      return row.kpi.totalRemainingAmount;
    case 'execution':
      return row.kpi.consumptionRate ?? 0;
    case 'status':
      return isBudgetRowAlert(row) ? '0-alert' : `1-${row.budget.status}`;
  }
}

function BudgetNameCell({
  row,
  exerciseId,
}: {
  row: BudgetListItemWithKpi;
  exerciseId: string;
}) {
  const { activeClient } = useActiveClient();
  const Icon = budgetPortfolioIcon(row);
  const iconPresentation = budgetPortfolioIconPresentation(row);
  const subtitle = budgetPortfolioSubtitle(row);

  return (
    <div className="flex items-start gap-3">
      <div {...iconPresentation} aria-hidden>
        <Icon className="size-4" strokeWidth={1.75} />
      </div>
      <div className="min-w-0">
        <Link
          href={budgetDetail(row.budget.id)}
          className="starium-proj-name block truncate"
          onClick={() => {
            if (!activeClient?.id) return;
            saveBudgetCockpitSelection(activeClient.id, {
              exerciseId,
              budgetId: row.budget.id,
            });
          }}
        >
          {row.budget.name}
        </Link>
        <div className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</div>
      </div>
    </div>
  );
}

interface BudgetsTableProps {
  data: BudgetListItemWithKpi[];
  exerciseId: string;
  filters: BudgetsListParams;
  setFilters: (updates: Partial<BudgetsListParams>) => void;
  /** Totaux exercice (ligne « Total consolidé ») — KPI summary. */
  consolidation?: BudgetSummaryKpi | null;
  sortKey?: BudgetsTableSortKey;
  sortOrder?: SortOrder;
  onSortChange?: (sortKey: BudgetsTableSortKey, sortOrder: SortOrder) => void;
  dataTestId?: string;
}

/**
 * Table portefeuille budgets — pattern `/projects` (tri, filtres colonnes, icônes).
 */
export function BudgetsTable({
  data,
  exerciseId,
  filters,
  setFilters,
  consolidation,
  sortKey = 'name',
  sortOrder = 'asc',
  onSortChange,
  dataTestId = 'budgets-table',
}: BudgetsTableProps) {
  const statusKey = filters.status && filters.status !== 'ALL' ? filters.status : '__all__';

  const handleSort = (key: BudgetsTableSortKey) => {
    if (!onSortChange) return;
    if (sortKey === key) {
      onSortChange(key, sortOrder === 'asc' ? 'desc' : 'asc');
      return;
    }
    const defaultOrder: SortOrder =
      key === 'name' || key === 'type' || key === 'status' ? 'asc' : 'desc';
    onSortChange(key, defaultOrder);
  };

  const sortedData = useMemo(() => {
    const dir = sortOrder === 'asc' ? 1 : -1;
    return [...data].sort((a, b) => {
      const va = sortValue(a, sortKey);
      const vb = sortValue(b, sortKey);
      if (typeof va === 'number' && typeof vb === 'number') {
        return (va - vb) * dir;
      }
      return String(va).localeCompare(String(vb), 'fr', { sensitivity: 'base' }) * dir;
    });
  }, [data, sortKey, sortOrder]);

  const ariaFor = (key: BudgetsTableSortKey): React.AriaAttributes['aria-sort'] => {
    if (sortKey !== key) return 'none';
    return sortOrder === 'asc' ? 'ascending' : 'descending';
  };

  const currency =
    consolidation?.currency ??
    sortedData[0]?.kpi.currency ??
    sortedData[0]?.budget.currency ??
    'EUR';

  return (
    <>
      <div className="md:hidden p-3" data-testid={`${dataTestId}-mobile`}>
        <BudgetsPortfolioCards items={sortedData} />
      </div>

      <div className="hidden md:block" data-testid={dataTestId}>
        <Table noWrapper className="starium-projects-table min-w-[56rem] text-[12.5px]">
          <TableHeader className="sticky top-0 z-50 [&_tr]:border-b-0">
            <TableRow className="starium-projects-table-label-row border-0 hover:bg-transparent">
              <TableHead
                aria-sort={ariaFor('name')}
                className="sticky left-0 z-[52] min-w-[16rem] bg-card starium-table-sticky-edge pl-4"
              >
                <SortHeaderButton
                  label="Budget"
                  sortKey="name"
                  activeKey={sortKey}
                  order={sortOrder}
                  onSort={handleSort}
                />
              </TableHead>
              <TableHead aria-sort={ariaFor('type')} className="w-[6.5rem]">
                <SortHeaderButton
                  label="Type"
                  sortKey="type"
                  activeKey={sortKey}
                  order={sortOrder}
                  onSort={handleSort}
                />
              </TableHead>
              <TableHead
                aria-sort={ariaFor('allocated')}
                className="min-w-[7rem] text-right"
              >
                <SortHeaderButton
                  label="Alloué"
                  sortKey="allocated"
                  activeKey={sortKey}
                  order={sortOrder}
                  onSort={handleSort}
                  align="right"
                />
              </TableHead>
              <TableHead
                aria-sort={ariaFor('committed')}
                className="min-w-[7rem] text-right"
              >
                <SortHeaderButton
                  label="Engagé"
                  sortKey="committed"
                  activeKey={sortKey}
                  order={sortOrder}
                  onSort={handleSort}
                  align="right"
                />
              </TableHead>
              <TableHead
                aria-sort={ariaFor('consumed')}
                className="min-w-[7rem] text-right"
              >
                <SortHeaderButton
                  label="Consommé"
                  sortKey="consumed"
                  activeKey={sortKey}
                  order={sortOrder}
                  onSort={handleSort}
                  align="right"
                />
              </TableHead>
              <TableHead
                aria-sort={ariaFor('remaining')}
                className="min-w-[7rem] text-right"
              >
                <SortHeaderButton
                  label="Reste"
                  sortKey="remaining"
                  activeKey={sortKey}
                  order={sortOrder}
                  onSort={handleSort}
                  align="right"
                />
              </TableHead>
              <TableHead aria-sort={ariaFor('execution')} className="min-w-[9rem]">
                <SortHeaderButton
                  label="Exécution"
                  sortKey="execution"
                  activeKey={sortKey}
                  order={sortOrder}
                  onSort={handleSort}
                />
              </TableHead>
              <TableHead aria-sort={ariaFor('status')} className="min-w-[7rem] pr-4">
                <SortHeaderButton
                  label="État"
                  sortKey="status"
                  activeKey={sortKey}
                  order={sortOrder}
                  onSort={handleSort}
                />
              </TableHead>
            </TableRow>

            <TableRow className="starium-projects-table-filter-row border-0 border-b border-border bg-card hover:bg-card">
              <TableHead className="sticky left-0 z-[52] h-auto min-h-0 bg-card px-2 !pt-0 pb-2 pl-4 starium-table-sticky-edge">
                <span className="sr-only">Filtre budget</span>
                <span className="block text-center text-muted-foreground" aria-hidden>
                  —
                </span>
              </TableHead>
              <TableHead className="h-auto min-h-0 px-2 !pt-0 pb-2">
                <span className="block text-center text-muted-foreground" aria-hidden>
                  —
                </span>
              </TableHead>
              <TableHead className="h-auto min-h-0 px-2 !pt-0 pb-2" colSpan={4}>
                <span className="block text-center text-muted-foreground" aria-hidden>
                  —
                </span>
              </TableHead>
              <TableHead className="h-auto min-h-0 px-2 !pt-0 pb-2">
                <span className="block text-center text-muted-foreground" aria-hidden>
                  —
                </span>
              </TableHead>
              <TableHead className="h-auto min-h-0 px-2 !pt-0 pb-2 pr-4">
                <Select
                  value={statusKey}
                  onValueChange={(v) =>
                    setFilters({
                      status: !v || v === '__all__' ? 'ALL' : (v as BudgetsListParams['status']),
                      page: 1,
                    })
                  }
                >
                  <SelectTrigger
                    size="sm"
                    className="starium-col-filter h-6 w-full text-[10px]"
                    aria-label="Filtrer par état"
                  >
                    <SelectValue>
                      {statusKey === '__all__'
                        ? 'Tous'
                        : BUDGET_STATUS_OPTIONS.find((o) => o.value === statusKey)?.label ??
                          'État'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {BUDGET_STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value === 'ALL' ? '__all__' : opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {sortedData.map((row) => {
              const alert = isBudgetRowAlert(row);
              const cur = row.kpi.currency ?? row.budget.currency;
              const execPct = rateToPercent(row.kpi.consumptionRate);
              const execTone = budgetExecutionTone(row.kpi.consumptionRate);
              const remainingTone: StatusTone =
                row.kpi.totalRemainingAmount < 0 ? 'danger' : 'muted';
              const mixLabel = budgetExpenseMixLabel(row.budget.expenseMix);

              return (
                <TableRow key={row.budget.id}>
                  <TableCell className="sticky left-0 z-20 align-top bg-card py-3 pl-4 starium-table-sticky-edge min-w-[16rem] max-w-[20rem]">
                    <BudgetNameCell row={row} exerciseId={exerciseId} />
                  </TableCell>
                  <TableCell className="align-middle">
                    {mixLabel ? (
                      <span className="starium-ds-badge starium-ds-badge--neutral w-fit">
                        {mixLabel}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right align-middle tabular-nums text-foreground">
                    {formatBudgetAmount(row.kpi.totalInitialAmount, cur)}
                  </TableCell>
                  <TableCell className="text-right align-middle tabular-nums font-semibold text-foreground">
                    {formatBudgetAmount(row.kpi.totalCommittedAmount, cur)}
                  </TableCell>
                  <TableCell className="text-right align-middle">
                    <TableToneAmount tone="info" className="font-semibold">
                      {formatBudgetAmount(row.kpi.totalConsumedAmount, cur)}
                    </TableToneAmount>
                  </TableCell>
                  <TableCell className="text-right align-middle">
                    <span
                      className={cn(
                        'tabular-nums',
                        remainingTone === 'danger' && toneAmountClass('danger'),
                      )}
                    >
                      {formatBudgetAmount(row.kpi.totalRemainingAmount, cur)}
                    </span>
                  </TableCell>
                  <TableCell className="align-middle">
                    <PortfolioProgressBar
                      value={execPct}
                      tone={execTone}
                      showPercent
                      label={`Exécution ${row.budget.name}`}
                      className="min-w-[7.5rem]"
                    />
                  </TableCell>
                  <TableCell className="align-middle pr-4">
                    {alert ? (
                      <TableToneBadge tone="danger">
                        <span aria-hidden>•</span> Alerte
                      </TableToneBadge>
                    ) : (
                      <BudgetStatusBadge status={row.budget.status} />
                    )}
                  </TableCell>
                </TableRow>
              );
            })}

            {consolidation ? (
              <TableRow className="border-t-2 border-border bg-muted/20 font-semibold hover:bg-muted/20">
                <TableCell className="sticky left-0 z-20 bg-muted/20 py-3 pl-4 starium-table-sticky-edge">
                  Total consolidé
                </TableCell>
                <TableCell />
                <TableCell className="text-right tabular-nums">
                  {formatBudgetAmount(consolidation.totalInitialAmount, currency)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatBudgetAmount(consolidation.totalCommittedAmount, currency)}
                </TableCell>
                <TableCell className="text-right">
                  <TableToneAmount tone="info" className="font-semibold">
                    {formatBudgetAmount(consolidation.totalConsumedAmount, currency)}
                  </TableToneAmount>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatBudgetAmount(consolidation.totalRemainingAmount, currency)}
                </TableCell>
                <TableCell className="tabular-nums">
                  {rateToPercent(consolidation.consumptionRate)} %
                </TableCell>
                <TableCell className="pr-4" />
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
