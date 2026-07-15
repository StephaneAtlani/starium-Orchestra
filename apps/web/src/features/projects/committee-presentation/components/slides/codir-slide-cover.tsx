'use client';

import { Monitor } from 'lucide-react';
import { useActiveClient } from '@/hooks/use-active-client';
import type { CodirDeckKpis } from '../../lib/codir-deck-metrics';

type CodirSlideCoverProps = {
  kpis: CodirDeckKpis;
  projectCount: number;
};

export function CodirSlideCover({ kpis, projectCount }: CodirSlideCoverProps) {
  const { activeClient } = useActiveClient();
  const sessionDate = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const budgetLabel = kpis.targetBudgetLabel;

  return (
    <div className="max-w-4xl">
      <p className="starium-present-eyebrow">
        <Monitor className="size-4 shrink-0" aria-hidden />
        Comité de direction
      </p>
      <h2 className="starium-present-title">
        Revue de portefeuille
        <br />
        DSI — {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
      </h2>
      <p className="starium-present-sub">
        {activeClient?.name ?? 'Client actif'}
        {' · '}
        {projectCount} projet{projectCount > 1 ? 's' : ''} dans le périmètre
        {budgetLabel && budgetLabel !== '—' ? ` · ${budgetLabel} engagés` : ''}
        {' · '}
        Séance du {sessionDate}
      </p>

      <div className="starium-present-kpi-row" role="group" aria-label="Indicateurs clés">
        <div>
          <p className="starium-present-kpi-hero-label">Avancement moyen</p>
          <p className="starium-present-kpi-hero-value">
            {kpis.averageProgress != null ? `${kpis.averageProgress} %` : '—'}
          </p>
        </div>
        <div>
          <p className="starium-present-kpi-hero-label">Jalons tenus</p>
          <p
            className="starium-present-kpi-hero-value"
            style={{ color: 'var(--brand-gold)' }}
          >
            {kpis.milestonesOnTimePercent != null ? `${kpis.milestonesOnTimePercent} %` : '—'}
          </p>
        </div>
        <div>
          <p className="starium-present-kpi-hero-label">Risques critiques</p>
          <p
            className="starium-present-kpi-hero-value"
            style={{ color: 'var(--state-danger)' }}
          >
            {kpis.criticalRisks}
          </p>
        </div>
      </div>
    </div>
  );
}
