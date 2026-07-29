'use client';

import {
  CircleDollarSign,
  PiggyBank,
  Scale,
  TrendingDown,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { KpiCard, type KpiCardFooterTone } from '@/components/ui/kpi-card';
import { Skeleton } from '@/components/ui/skeleton';
import type { BudgetSummaryKpi } from '../types/budget-reporting.types';

type BudgetPortfolioKpiDef = {
  id: string;
  label: string;
  Icon: LucideIcon;
  iconWrapperClassName: string;
  footerTone: KpiCardFooterTone;
  value: (kpi: BudgetSummaryKpi | undefined, isLoading: boolean) => string;
  footer: (kpi: BudgetSummaryKpi | undefined) => string | null;
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
    label: 'Budget alloué',
    Icon: CircleDollarSign,
    iconWrapperClassName: 'bg-[color:var(--brand-gold)]/12 text-[color:var(--brand-gold-700)]',
    footerTone: 'brand',
    value: (kpi, isLoading) =>
      isLoading ? '—' : formatCompactAmount(kpi?.totalInitialAmount, kpi?.currency ?? 'EUR'),
    footer: () => 'Base exercice sélectionné',
  },
  {
    id: 'committed',
    label: 'Engagé',
    Icon: Scale,
    iconWrapperClassName: 'bg-sky-500/12 text-sky-700 dark:text-sky-400',
    footerTone: 'info',
    value: (kpi, isLoading) =>
      isLoading ? '—' : formatCompactAmount(kpi?.totalCommittedAmount, kpi?.currency ?? 'EUR'),
    footer: (kpi) => formatPercent(kpi?.commitmentRate),
  },
  {
    id: 'consumed',
    label: 'Consommé',
    Icon: TrendingDown,
    iconWrapperClassName: 'bg-violet-500/12 text-violet-700 dark:text-violet-400',
    footerTone: 'violet',
    value: (kpi, isLoading) =>
      isLoading ? '—' : formatCompactAmount(kpi?.totalConsumedAmount, kpi?.currency ?? 'EUR'),
    footer: (kpi) => formatPercent(kpi?.consumptionRate),
  },
  {
    id: 'remaining',
    label: 'Reste disponible',
    Icon: Wallet,
    iconWrapperClassName: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400',
    footerTone: 'success',
    value: (kpi, isLoading) =>
      isLoading ? '—' : formatCompactAmount(kpi?.totalRemainingAmount, kpi?.currency ?? 'EUR'),
    footer: (kpi) =>
      kpi != null && kpi.totalRemainingAmount < 0 ? 'Budget dépassé' : 'Marge restante',
  },
  {
    id: 'forecast',
    label: 'Prévision fin',
    Icon: PiggyBank,
    iconWrapperClassName: 'bg-amber-500/12 text-amber-700 dark:text-amber-400',
    footerTone: 'warning',
    value: (kpi, isLoading) =>
      isLoading ? '—' : formatCompactAmount(kpi?.totalForecastAmount, kpi?.currency ?? 'EUR'),
    footer: (kpi) => {
      if (!kpi) return null;
      const delta = kpi.totalForecastAmount - kpi.totalInitialAmount;
      if (!Number.isFinite(delta)) return null;
      if (delta > 0) return 'Atterrissage au-dessus du budget';
      if (delta < 0) return 'Atterrissage sous le budget';
      return 'Atterrissage sur cible';
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
}: {
  kpi: BudgetSummaryKpi | undefined;
  isLoading: boolean;
}) {
  if (isLoading && !kpi) {
    return (
      <section className="starium-module" data-testid="budgets-portfolio-kpi">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5 sm:gap-3">
          {KPI_CARDS.map((card) => (
            <KpiCardSkeleton key={card.id} />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="starium-module" data-testid="budgets-portfolio-kpi">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5 sm:gap-3">
        {KPI_CARDS.map((card) => (
          <KpiCard
            key={card.id}
            variant="dense"
            iconShape="circle"
            title={card.label}
            value={card.value(kpi, isLoading)}
            footer={card.footer(kpi) ?? undefined}
            footerTone={card.footerTone}
            iconWrapperClassName={card.iconWrapperClassName}
            icon={<card.Icon aria-hidden />}
          />
        ))}
      </div>
    </section>
  );
}
