'use client';

import { AlertTriangle } from 'lucide-react';
import {
  PortfolioEntityCard,
  TableToneBadge,
  type StatusTone,
} from '@/components/portfolio';
import {
  riskCriticalityLabel,
  riskCriticalityTone,
  riskStatusLabel,
} from '../../lib/project-risk-display';
import type { ProjectRiskRegistryRow } from '../hooks/use-project-risks-registry-query';

function statusTone(status: string): StatusTone {
  switch (status) {
    case 'OPEN':
      return 'danger';
    case 'MONITORED':
      return 'info';
    case 'MITIGATED':
      return 'ok';
    case 'CLOSED':
      return 'muted';
    default:
      return 'muted';
  }
}

export function RisksRegistryCards({
  items,
  onOpen,
}: {
  items: ProjectRiskRegistryRow[];
  onOpen?: (row: ProjectRiskRegistryRow) => void;
}) {
  return (
    <div
      className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3"
      data-testid="risks-portfolio-cards"
    >
      {items.map((row) => {
        const critTone = riskCriticalityTone(row.criticalityLevel);
        return (
          <PortfolioEntityCard
            key={row.id}
            tone={critTone}
            icon={<AlertTriangle className="size-5" aria-hidden />}
            title={<span className="line-clamp-2">{row.title}</span>}
            badges={
              <>
                <TableToneBadge tone={critTone}>
                  {riskCriticalityLabel(row.criticalityLevel)}
                </TableToneBadge>
                <TableToneBadge tone={statusTone(row.status)}>
                  {riskStatusLabel(row.status)}
                </TableToneBadge>
              </>
            }
            subtitle={[row.code, row.projectName || 'Hors projet'].filter(Boolean).join(' · ')}
            footer={
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="tabular-nums text-muted-foreground">
                  Score {row.criticalityScore}
                </span>
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center font-semibold text-[color:var(--brand-gold-700)]"
                  onClick={() => onOpen?.(row)}
                >
                  Ouvrir
                </button>
              </div>
            }
            onClick={() => onOpen?.(row)}
            className={onOpen ? 'cursor-pointer' : undefined}
          />
        );
      })}
    </div>
  );
}
