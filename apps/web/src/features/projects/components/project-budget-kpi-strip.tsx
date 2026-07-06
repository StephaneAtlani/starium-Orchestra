'use client';

import {
  Activity,
  CheckCircle2,
  CircleDollarSign,
  FileText,
  TrendingUp,
} from 'lucide-react';
import {
  formatBudgetCompact,
  type ProjectBudgetMetrics,
} from '../lib/project-budget-display';
import { SynthesisListKpi, SynthesisListKpis } from './synthesis-ds-kpi';

export function ProjectBudgetKpiStrip({
  metrics,
  className,
}: {
  metrics: ProjectBudgetMetrics;
  className?: string;
}) {
  return (
    <SynthesisListKpis
      columns={5}
      className={className}
      aria-label="Indicateurs budgétaires du projet"
    >
      <SynthesisListKpi
        icon={<CircleDollarSign strokeWidth={1.75} />}
        iconClassName="starium-list-kpi__ico--gold"
        label="Budget cible"
        value={formatBudgetCompact(metrics.total)}
        sub={metrics.capexOpexLabel}
        subClassName="text-[color:var(--brand-gold-700)]"
      />
      <SynthesisListKpi
        icon={<FileText strokeWidth={1.75} />}
        iconClassName="starium-list-kpi__ico--gold"
        label="Engagé"
        value={formatBudgetCompact(metrics.engaged)}
        valueClassName="text-[color:var(--brand-gold-700)]"
        sub={
          metrics.total != null && metrics.total > 0
            ? `${metrics.engagedPct} % du budget`
            : 'Périmètre projet'
        }
        subClassName="text-[color:var(--brand-gold-700)]"
      />
      <SynthesisListKpi
        icon={<Activity strokeWidth={1.75} />}
        iconClassName="starium-list-kpi__ico--info"
        label="Réalisé"
        value={formatBudgetCompact(metrics.realized)}
        valueClassName="text-[color:var(--state-info)]"
        sub={
          metrics.total != null && metrics.total > 0
            ? `${metrics.realizedPct} % du budget`
            : 'Périmètre projet'
        }
        subClassName="text-[color:var(--state-info)]"
      />
      <SynthesisListKpi
        icon={<CheckCircle2 strokeWidth={1.75} />}
        iconClassName="starium-list-kpi__ico--success"
        label="Reste à engager"
        value={formatBudgetCompact(metrics.restToEngage)}
        valueClassName="text-[color:var(--state-success)]"
        sub={
          metrics.total != null && metrics.restToEngage != null
            ? `${metrics.restToEngagePct} % disponible`
            : '—'
        }
        subClassName="text-[color:var(--state-success)]"
      />
      <SynthesisListKpi
        icon={<TrendingUp strokeWidth={1.75} />}
        iconClassName="starium-list-kpi__ico--neutral"
        label="Prévision fin de projet"
        value={formatBudgetCompact(metrics.forecast)}
        sub={
          metrics.forecastDelta != null
            ? `Écart ${metrics.forecastDelta >= 0 ? '+' : ''}${formatBudgetCompact(metrics.forecastDelta)}`
            : 'Fiche projet'
        }
        subClassName={
          metrics.forecastDelta != null && metrics.forecastDelta >= 0
            ? 'text-[color:var(--state-success)]'
            : 'text-[color:var(--state-warning)]'
        }
      />
    </SynthesisListKpis>
  );
}
