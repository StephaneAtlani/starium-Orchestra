'use client';

import { Building2, FileText, Star, Wallet } from 'lucide-react';
import { PortfolioKpiRow, type PortfolioKpiItem } from '@/components/portfolio';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrencyAmountFr, formatNumberFr } from '@/lib/currency-format';
import type { SuppliersSummary } from '../../types/supplier.types';

function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return count > 1 ? plural : singular;
}

function annualSpendDisplay(summary: SuppliersSummary): { value: string; footer: string } {
  if (summary.currencyMixed || summary.annualSpend == null) {
    return { value: '—', footer: 'Contrats multi-devises' };
  }
  return {
    value: formatCurrencyAmountFr(summary.annualSpend, summary.currency ?? 'EUR'),
    footer:
      summary.activeContractCount > 0
        ? `sur ${summary.activeContractCount} ${pluralize(summary.activeContractCount, 'contrat')} en vigueur`
        : 'aucun contrat en vigueur',
  };
}

export function SuppliersListKpiStrip({
  summary,
  isLoading,
}: {
  summary: SuppliersSummary | undefined;
  isLoading: boolean;
}) {
  if (isLoading || !summary) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" data-testid="suppliers-portfolio-kpi">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[5.5rem] rounded-xl" />
        ))}
      </div>
    );
  }

  const spend = annualSpendDisplay(summary);

  const items: PortfolioKpiItem[] = [
    {
      id: 'active',
      title: 'Fournisseurs actifs',
      value: String(summary.activeCount),
      footer:
        summary.addedThisYear > 0
          ? `+${summary.addedThisYear} cette année`
          : summary.archivedCount > 0
            ? `${summary.archivedCount} ${pluralize(summary.archivedCount, 'archivé')}`
            : undefined,
      footerTone: 'brand',
      icon: <Building2 aria-hidden />,
      iconWrapperClassName: 'bg-[color:var(--brand-gold-050)] text-[color:var(--brand-gold-700)]',
    },
    {
      id: 'spend',
      title: 'Dépense annuelle',
      value: spend.value,
      footer: spend.footer,
      footerTone: 'info',
      icon: <Wallet aria-hidden />,
      iconWrapperClassName: 'bg-[color:var(--state-info-bg)] text-[color:var(--state-info)]',
    },
    {
      id: 'contracts',
      title: 'Contrats en vigueur',
      value: String(summary.activeContractCount),
      footer:
        summary.inRenewalCount > 0
          ? `${summary.inRenewalCount} en préavis`
          : 'aucun en préavis',
      footerTone: summary.inRenewalCount > 0 ? 'warning' : 'muted',
      icon: <FileText aria-hidden />,
      iconWrapperClassName: 'bg-violet-500/12 text-violet-700 dark:text-violet-400',
    },
    {
      id: 'rating',
      title: 'Note moyenne',
      value:
        summary.averageRating == null
          ? '—'
          : formatNumberFr(summary.averageRating, { minFraction: 1, maxFraction: 1 }),
      footer:
        summary.ratedCount === 0
          ? 'aucun fournisseur évalué'
          : `sur ${summary.ratedCount} ${pluralize(summary.ratedCount, 'fournisseur évalué', 'fournisseurs évalués')}`,
      footerTone: summary.ratedCount === 0 ? 'muted' : 'success',
      icon: <Star aria-hidden />,
      iconWrapperClassName: 'bg-[color:var(--state-success-bg)] text-[color:var(--state-success)]',
    },
  ];

  return (
    <PortfolioKpiRow
      title="Synthèse du panel"
      description="Tous les fournisseurs du client, indépendamment des filtres ci-dessous."
      items={items}
      data-testid="suppliers-portfolio-kpi"
    />
  );
}
