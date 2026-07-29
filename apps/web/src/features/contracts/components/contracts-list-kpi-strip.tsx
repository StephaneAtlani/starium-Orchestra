'use client';

import { CalendarClock, FileText, RefreshCw, Wallet } from 'lucide-react';
import { PortfolioKpiRow, type PortfolioKpiItem } from '@/components/portfolio';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrencyAmountFr } from '@/lib/currency-format';
import type { ContractsSummary } from '../types/contract.types';

function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return count > 1 ? plural : singular;
}

function committedValueDisplay(summary: ContractsSummary): {
  value: string;
  footer: string;
} {
  if (summary.currencyMixed || summary.committedValue == null) {
    return {
      value: '—',
      footer: 'Portefeuille multi-devises',
    };
  }
  return {
    value: formatCurrencyAmountFr(summary.committedValue, summary.currency ?? 'EUR'),
    footer:
      summary.annualValue != null && summary.annualValue > 0
        ? `${formatCurrencyAmountFr(summary.annualValue, summary.currency ?? 'EUR')} / an`
        : 'Engagement total',
  };
}

export function ContractsListKpiStrip({
  summary,
  isLoading,
}: {
  summary: ContractsSummary | undefined;
  isLoading: boolean;
}) {
  if (isLoading || !summary) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" data-testid="contracts-portfolio-kpi">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[5.5rem] rounded-xl" />
        ))}
      </div>
    );
  }

  const committed = committedValueDisplay(summary);

  const items: PortfolioKpiItem[] = [
    {
      id: 'active',
      title: 'Contrats en vigueur',
      value: String(summary.activeCount),
      footer:
        summary.activeSupplierCount > 0
          ? `sur ${summary.activeSupplierCount} ${pluralize(summary.activeSupplierCount, 'fournisseur')}`
          : undefined,
      footerTone: 'brand',
      icon: <FileText aria-hidden />,
      iconWrapperClassName: 'bg-[color:var(--brand-gold-050)] text-[color:var(--brand-gold-700)]',
    },
    {
      id: 'committed',
      title: 'Valeur engagée',
      value: committed.value,
      footer: committed.footer,
      footerTone: 'info',
      icon: <Wallet aria-hidden />,
      iconWrapperClassName: 'bg-[color:var(--state-info-bg)] text-[color:var(--state-info)]',
    },
    {
      id: 'expiring',
      title: `Échéances (${summary.expiringSoonHorizonDays} j)`,
      value: String(summary.expiringSoonCount),
      footer: summary.expiringSoonCount > 0 ? 'à anticiper' : 'aucune à court terme',
      footerTone: summary.expiringSoonCount > 0 ? 'warning' : 'muted',
      icon: <CalendarClock aria-hidden />,
      iconWrapperClassName: 'bg-[color:var(--state-warning)]/12 text-[color:var(--state-warning)]',
    },
    {
      id: 'renewal',
      title: 'En préavis',
      value: String(summary.inRenewalCount),
      footer: summary.inRenewalCount > 0 ? 'renégociation à instruire' : 'aucun en cours',
      footerTone: summary.inRenewalCount > 0 ? 'danger' : 'muted',
      icon: <RefreshCw aria-hidden />,
      iconWrapperClassName: 'bg-destructive/10 text-destructive',
    },
  ];

  return (
    <PortfolioKpiRow
      title="Synthèse du portefeuille"
      description="Tous les contrats du client, indépendamment des filtres ci-dessous."
      items={items}
      data-testid="contracts-portfolio-kpi"
    />
  );
}
