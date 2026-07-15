'use client';

import { LineChart } from 'lucide-react';
import type { CodirDeckKpis, CodirStatusBreakdown } from '../../lib/codir-deck-metrics';

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

type CodirSlidePortfolioProps = {
  kpis: CodirDeckKpis;
  statusBreakdown: CodirStatusBreakdown;
  /** Diaporama : KPIs calculés sur le périmètre filtré (statuts / étiquettes). */
  scoped?: boolean;
  projectCount?: number;
};

export function CodirSlidePortfolio({
  kpis,
  statusBreakdown,
  scoped = false,
  projectCount,
}: CodirSlidePortfolioProps) {
  const totalStatus = Object.values(statusBreakdown).reduce((a, b) => a + b, 0) || 1;
  const projectsFoot = scoped
    ? `${projectCount ?? kpis.activeProjects} dans le périmètre`
    : kpis.activeProjectsDeltaLabel;

  return (
    <div className="flex h-full min-h-0 w-full max-w-5xl flex-col justify-center overflow-hidden">
      <p className="starium-present-eyebrow">
        <LineChart className="size-4 shrink-0" aria-hidden />
        Synthèse du portefeuille
      </p>
      <h2 className="starium-present-title" style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2.25rem)' }}>
        {scoped ? 'Vue consolidée du périmètre' : 'Vue consolidée'}
      </h2>

      <div className="starium-present-synth-grid" role="group" aria-label="Indicateurs consolidés">
        <SynthCell
          label={scoped ? 'Projets sélectionnés' : 'Projets'}
          value={String(kpis.activeProjects)}
          foot={projectsFoot}
          footColor="var(--brand-gold)"
        />
        <SynthCell
          label="Avancement"
          value={kpis.averageProgress != null ? `${kpis.averageProgress} %` : '—'}
        />
        <SynthCell
          label="Budget"
          value={kpis.budgetConsumedPercent != null ? `${kpis.budgetConsumedPercent} %` : '—'}
          foot={kpis.budgetConsumedLabel ?? kpis.targetBudgetLabel}
          footColor="var(--present-fg-subtle)"
        />
        <SynthCell
          label="Risques crit."
          value={String(kpis.criticalRisks)}
          foot={kpis.criticalRisksLabel}
          valueColor="var(--state-danger)"
          footColor="var(--state-danger)"
        />
        <SynthCell
          label="Jalons tenus"
          value={kpis.milestonesOnTimePercent != null ? `${kpis.milestonesOnTimePercent} %` : '—'}
          foot={kpis.milestonesOnTimeLabel}
          valueColor="var(--state-success)"
          footColor="var(--present-fg-subtle)"
        />
      </div>

      <div className="mt-2 min-w-0">
        <div
          className="starium-codir-status-bar h-9"
          role="img"
          aria-label="Répartition par statut"
        >
          {(Object.keys(statusBreakdown) as Array<keyof CodirStatusBreakdown>).map((key) => {
            const count = statusBreakdown[key];
            if (count === 0) return null;
            const width = Math.max(10, (count / totalStatus) * 100);
            return (
              <div
                key={key}
                className="starium-codir-status-seg text-sm"
                style={{ width: `${width}%`, background: STATUS_COLORS[key] }}
              >
                {count}
              </div>
            );
          })}
        </div>
        <div className="starium-codir-status-legend mt-3 starium-present-text-muted">
          {(Object.keys(statusBreakdown) as Array<keyof CodirStatusBreakdown>).map((key) => (
            <span key={key} className="starium-codir-status-legend-item">
              <span
                className="starium-codir-status-dot"
                style={{ background: STATUS_COLORS[key] }}
                aria-hidden
              />
              {STATUS_LABELS[key]}{' '}
              <strong className="starium-present-text">{statusBreakdown[key]}</strong>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function SynthCell({
  label,
  value,
  foot,
  valueColor,
  footColor,
}: {
  label: string;
  value: string;
  foot?: string | null;
  valueColor?: string;
  footColor?: string;
}) {
  return (
    <div className="starium-present-synth-cell">
      <p className="starium-present-synth-label">{label}</p>
      <p className="starium-present-synth-val" style={valueColor ? { color: valueColor } : undefined}>
        {value}
      </p>
      {foot ? (
        <p className="starium-present-synth-foot" style={footColor ? { color: footColor } : undefined}>
          {foot}
        </p>
      ) : null}
    </div>
  );
}
