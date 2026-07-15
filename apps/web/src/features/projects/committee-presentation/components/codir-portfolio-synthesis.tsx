'use client';

import { AlertTriangle, Clock3, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { CodirAttentionPoint, CodirDeckKpis, CodirStatusBreakdown } from '../lib/codir-deck-metrics';
import { CodirPanelCard, CodirSectionHeader } from './codir-section-header';

const STATUS_COLORS: Record<keyof CodirStatusBreakdown, string> = {
  inProgress: 'var(--state-success)',
  late: 'var(--state-danger)',
  planned: 'var(--state-info)',
  completed: 'var(--neutral-400)',
};

const STATUS_LABELS: Record<keyof CodirStatusBreakdown, string> = {
  inProgress: 'En cours',
  late: 'En retard',
  planned: 'Planifiés',
  completed: 'Terminés',
};

const ATTENTION_BADGE: Record<CodirAttentionPoint['badge'], { label: string; className: string }> = {
  decision: {
    label: 'Décision',
    className: 'border-0 bg-[color:var(--state-danger)]/10 text-[color:var(--state-danger)]',
  },
  risk: {
    label: 'À risque',
    className: 'border-0 bg-[color:var(--state-warning)]/12 text-[color:var(--state-warning)]',
  },
  capacity: {
    label: 'Capacité',
    className: 'border-0 bg-[color:var(--state-warning)]/12 text-[color:var(--state-warning)]',
  },
};

type CodirPortfolioSynthesisProps = {
  kpis: CodirDeckKpis;
  statusBreakdown: CodirStatusBreakdown;
  attentionPoints: CodirAttentionPoint[];
  isLoading?: boolean;
  consolidatedAt?: string;
};

function KpiCell({
  label,
  value,
  foot,
  valueClassName,
  footClassName,
}: {
  label: string;
  value: string;
  foot?: string | null;
  valueClassName?: string;
  footClassName?: string;
}) {
  return (
    <div className="starium-codir-kpi-cell">
      <p className="starium-codir-kpi-label">{label}</p>
      <p className={cn('starium-codir-kpi-value', valueClassName)}>{value}</p>
      {foot ? <p className={cn('starium-codir-kpi-foot', footClassName)}>{foot}</p> : null}
    </div>
  );
}

export function CodirPortfolioSynthesis({
  kpis,
  statusBreakdown,
  attentionPoints,
  isLoading,
  consolidatedAt,
}: CodirPortfolioSynthesisProps) {
  const totalStatus = Object.values(statusBreakdown).reduce((a, b) => a + b, 0) || 1;
  const dateLabel =
    consolidatedAt ??
    new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  if (isLoading) {
    return (
      <section aria-labelledby="codir-synthesis-heading">
        <CodirSectionHeader
          number={1}
          title="Synthèse du portefeuille"
          subtitle={`Vue consolidée au ${dateLabel}`}
        />
        <Skeleton className="h-28 w-full rounded-xl" />
      </section>
    );
  }

  return (
    <section aria-labelledby="codir-synthesis-heading">
      <CodirSectionHeader
        number={1}
        title="Synthèse du portefeuille"
        subtitle={`Vue consolidée au ${dateLabel}`}
      />

      <div className="starium-codir-kpi-strip" role="group" aria-label="Indicateurs portefeuille">
        <KpiCell
          label="Projets actifs"
          value={String(kpis.activeProjects)}
          foot={kpis.activeProjectsDeltaLabel}
          footClassName="text-[color:var(--brand-gold-700)]"
        />
        <KpiCell
          label="Avancement moyen"
          value={kpis.averageProgress != null ? `${kpis.averageProgress} %` : '—'}
          foot={kpis.averageProgressLabel}
          valueClassName="text-[color:var(--state-info)]"
          footClassName="text-[color:var(--state-info)]"
        />
        <KpiCell
          label="Budget consommé"
          value={kpis.budgetConsumedPercent != null ? `${kpis.budgetConsumedPercent} %` : '—'}
          foot={kpis.budgetConsumedLabel}
        />
        <KpiCell
          label="Risques critiques"
          value={String(kpis.criticalRisks)}
          foot={kpis.criticalRisksLabel}
          valueClassName="text-[color:var(--state-danger)]"
          footClassName="text-[color:var(--state-danger)]"
        />
        <KpiCell
          label="Jalons tenus"
          value={kpis.milestonesOnTimePercent != null ? `${kpis.milestonesOnTimePercent} %` : '—'}
          foot={kpis.milestonesOnTimeLabel}
          valueClassName="text-[color:var(--state-success)]"
          footClassName="text-[color:var(--state-success)]"
        />
      </div>

      <div className="starium-codir-synth-2col">
        <CodirPanelCard title="Répartition par statut">
          <div className="starium-codir-status-bar" role="img" aria-label="Répartition par statut">
            {(Object.keys(statusBreakdown) as Array<keyof CodirStatusBreakdown>).map((key) => {
              const count = statusBreakdown[key];
              if (count === 0) return null;
              const width = Math.max(8, (count / totalStatus) * 100);
              return (
                <div
                  key={key}
                  className="starium-codir-status-seg"
                  style={{ width: `${width}%`, background: STATUS_COLORS[key] }}
                >
                  {count}
                </div>
              );
            })}
          </div>
          <div className="starium-codir-status-legend">
            {(Object.keys(statusBreakdown) as Array<keyof CodirStatusBreakdown>).map((key) => (
              <span key={key} className="starium-codir-status-legend-item">
                <span
                  className="starium-codir-status-dot"
                  style={{ background: STATUS_COLORS[key] }}
                  aria-hidden
                />
                {STATUS_LABELS[key]} <strong>{statusBreakdown[key]}</strong>
              </span>
            ))}
          </div>
        </CodirPanelCard>

        <CodirPanelCard title="Points d'attention pour le CODIR">
          {attentionPoints.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun point d'attention prioritaire.</p>
          ) : (
            <ul className="list-none p-0">
              {attentionPoints.map((point) => {
                const badge = ATTENTION_BADGE[point.badge];
                const Icon =
                  point.badge === 'decision'
                    ? DollarSign
                    : point.badge === 'risk'
                      ? Clock3
                      : AlertTriangle;
                return (
                  <li key={point.projectId} className="starium-codir-attention-row">
                    <div
                      className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground"
                      aria-hidden
                    >
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold leading-snug">{point.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{point.meta}</p>
                    </div>
                    <Badge className={cn('shrink-0', badge.className)}>{badge.label}</Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </CodirPanelCard>
      </div>
    </section>
  );
}
