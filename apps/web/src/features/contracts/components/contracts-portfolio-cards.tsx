'use client';

import { FileText } from 'lucide-react';
import {
  PortfolioEntityCard,
  TableToneBadge,
  type StatusTone,
} from '@/components/portfolio';
import { contractKindLabel, contractStatusLabel } from '../lib/contracts-labels';
import type { Contract, SupplierContractStatus } from '../types/contract.types';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('fr-FR');
  } catch {
    return '—';
  }
}

export function contractStatusTone(status: SupplierContractStatus): StatusTone {
  switch (status) {
    case 'ACTIVE':
      return 'ok';
    case 'DRAFT':
      return 'info';
    case 'NOTICE':
      return 'warn';
    case 'SUSPENDED':
    case 'EXPIRED':
    case 'TERMINATED':
      return 'danger';
    default:
      return 'muted';
  }
}

export function ContractsPortfolioCards({ items }: { items: Contract[] }) {
  return (
    <div
      className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3"
      data-testid="contracts-portfolio-cards"
    >
      {items.map((c) => {
        const tone = contractStatusTone(c.status);
        return (
          <PortfolioEntityCard
            key={c.id}
            href={`/contracts/${c.id}`}
            ariaLabel={`Ouvrir le contrat ${c.reference}`}
            tone={tone}
            icon={<FileText className="size-5" aria-hidden />}
            title={<span className="line-clamp-2">{c.title}</span>}
            badges={
              <>
                <TableToneBadge tone="brand">{contractKindLabel(c.kind, c.kindLabel)}</TableToneBadge>
                <TableToneBadge tone={tone}>{contractStatusLabel(c.status)}</TableToneBadge>
              </>
            }
            subtitle={
              <span>
                {c.reference} · {c.supplier.name}
              </span>
            }
            footer={
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-muted-foreground">
                  Fin effet :{' '}
                  <span className="font-medium text-foreground tabular-nums">
                    {formatDate(c.effectiveEnd)}
                  </span>
                </span>
                <span className="font-semibold text-[color:var(--brand-gold-700)]">Ouvrir</span>
              </div>
            }
          />
        );
      })}
    </div>
  );
}
