'use client';

import {
  CircleDollarSign,
  Scale,
  TrendingDown,
  Wallet,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import { PortfolioKpiRow, type PortfolioKpiItem } from '@/components/portfolio';
import { Skeleton } from '@/components/ui/skeleton';
import type { BudgetSummaryKpi } from '../types/budget-reporting.types';
import type { KpiCardFooterTone } from '@/components/ui/kpi-card';

type BudgetPortfolioKpiDef = {
  id: string;
  label: string;
  Icon: LucideIcon;
  iconWrapperClassName: string;
  footerTone: KpiCardFooterTone;
  value: (
    kpi: BudgetSummaryKpi | undefined,
    isLoading: boolean,
    meta: { totalBudgets: number },
  ) => string;
  footer: (
    kpi: BudgetSummaryKpi | undefined,
    meta: { totalBudgets: number },
  ) => string | null;
};

function formatCompactAmount(value: number | null | undefined, currency = 'EUR'): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('fr-FR', {
    notation: 'compact',
    maximumFractionDigits: 1,
    style: 'currency',
    currency,
  }).format(value);
}

function formatPercent(rate: number | undefined): string | null {
  if (rate == null || !Number.isFinite(rate)) return null;
  return `${Math.round(rate * 100)} % du budget`;
}

const KPI_CARDS: BudgetPortfolioKpiDef[] = [
  {
    id: 'allocated',
    label: 'Alloué',
    Icon: CircleDollarSign,
    iconWrapperClassName: 'bg-[color:var(--brand-gold)]/12 text-[color:var(--brand-gold-700)]',
    footerTone: 'brand',
    value: (kpi, isLoading) =>
      isLoading ? '—' : formatCompactAmount(kpi?.totalInitialAmount, kpi?.currency ?? 'EUR'),
    footer: (kpi, meta) => {
      const pct = formatPercent(kpi?.consumptionRate);
      const count = meta.totalBudgets > 0 ? `${meta.totalBudgets} budget${meta.totalBudgets > 1 ? 's' : ''}` : 'Base exercice';
      return pct ? `${count} · ${pct}` : count;
    },
  },
  {
    id: 'committed',
    label: 'Engagé',
    Icon: Scale,
    iconWrapperClassName: 'bg-[color:var(--brand-gold)]/12 text-[color:var(--brand-gold-700)]',
    footerTone: 'brand',
    value: (kpi, isLoading) =>
      isLoading ? '—' : formatCompactAmount(kpi?.totalCommittedAmount, kpi?.currency ?? 'EUR'),
    footer: (kpi) => formatPercent(kpi?.commitmentRate),
  },
  {
    id: 'consumed',
    label: 'Consommé',
    Icon: TrendingDown,
    iconWrapperClassName: 'bg-[color:var(--state-info)]/12 text-[color:var(--state-info)]',
    footerTone: 'info',
    value: (kpi, isLoading) =>
      isLoading ? '—' : formatCompactAmount(kpi?.totalConsumedAmount, kpi?.currency ?? 'EUR'),
    footer: (kpi) => formatPercent(kpi?.consumptionRate),
  },
  {
    id: 'remaining',
    label: 'Reste',
    Icon: Wallet,
    iconWrapperClassName: 'bg-[color:var(--state-success)]/12 text-[color:var(--state-success)]',
    footerTone: 'success',
    value: (kpi, isLoading) => {
      if (isLoading) return '—';
      return formatCompactAmount(kpi?.totalRemainingAmount, kpi?.currency ?? 'EUR');
    },
    footer: (kpi) => {
      if (!kpi) return null;
      return kpi.totalRemainingAmount < 0 ? 'Dépassement budgétaire' : 'Budget disponible';
    },
  },
  {
    id: 'forecast',
    label: 'Prévision',
    Icon: TrendingUp,
    iconWrapperClassName: 'bg-[color:var(--state-warning)]/12 text-[color:var(--state-warning)]',
    footerTone: 'warning',
    value: (kpi, isLoading) => {
      if (isLoading) return '—';
      return formatCompactAmount(kpi?.totalForecastAmount, kpi?.currency ?? 'EUR');
    },
    footer: (kpi) => {
      if (!kpi) return null;
      const gap = kpi.forecastGapAmount;
      if (gap != null && Number.isFinite(gap) && gap > 0) {
        return `Écart +${formatCompactAmount(gap, kpi.currency ?? 'EUR')}`;
      }
      return 'Prévision dans le budget';
    },
  },
];

function KpiCardSkeleton() {
  return (
    <div className="starium-kpi-card !p-4">
      <div className="flex items-center gap-3.5">
        <Skeleton className="size-10 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <Skeleton className="h-3 w-full max-w-[6rem]" />
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>
    </div>
  );
}

export function BudgetsPortfolioKpi({
  kpi,
  isLoading,
  totalBudgets = 0,
}: {
  kpi: BudgetSummaryKpi | undefined;
  isLoading: boolean;
  totalBudgets?: number;
}) {
  const meta = { totalBudgets };

  if (isLoading && !kpi) {
    return (
      <section className="starium-module" aria-live="polite" data-testid="budgets-portfolio-kpi">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 sm:gap-3">
          {KPI_CARDS.map((card) => (
            <KpiCardSkeleton key={card.id} />
          ))}
        </div>
      </section>
    );
  }

  const items: PortfolioKpiItem[] = KPI_CARDS.map((card) => ({
    id: card.id,
    title: card.label,
    value: card.value(kpi, isLoading, meta),
    footer: card.footer(kpi, meta) ?? undefined,
    footerTone: card.footerTone === 'success' && kpi && kpi.totalRemainingAmount < 0
      ? 'danger' as KpiCardFooterTone
      : card.footerTone === 'warning' && kpi?.forecastGapAmount != null && kpi.forecastGapAmount > 0
        ? 'danger' as KpiCardFooterTone
        : card.footerTone,
    iconWrapperClassName: card.id === 'remaining' && kpi && kpi.totalRemainingAmount < 0
      ? 'bg-destructive/12 text-destructive'
      : card.id === 'forecast' && kpi?.forecastGapAmount != null && kpi.forecastGapAmount > 0
        ? 'bg-destructive/12 text-destructive'
        : card.iconWrapperClassName,
    icon: <card.Icon aria-hidden />,
  }));

  return <PortfolioKpiRow items={items} aria-live="polite" data-testid="budgets-portfolio-kpi" />;
}
