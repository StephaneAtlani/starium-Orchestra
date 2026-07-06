'use client';

import { useMemo, type ReactNode } from 'react';
import {
  AlertCircle,
  CalendarClock,
  ClipboardList,
  ShieldAlert,
  UserX,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProjectRiskApi } from '../types/project.types';
import {
  buildRiskPilotageSummary,
  computeRiskActionStats,
  getRiskAttentionReasons,
  riskAttentionReasonLabel,
  riskCriticalityDsBadgeClass,
  riskCriticalityLabel,
  sortAttentionRisks,
  type RiskQuickFilter,
} from '../lib/project-risk-display';
import { formatProjectDateLong } from '../lib/projects-list-display';
import { SynthesisListKpi, SynthesisListKpis } from './synthesis-ds-kpi';

function ActionKpiButton({
  active,
  onClick,
  children,
  label,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      className={cn(
        'starium-list-kpi-btn',
        active && 'starium-list-kpi-btn--active',
      )}
      aria-pressed={active}
      aria-label={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function ProjectRisksActionOverview({
  risks,
  quickFilter,
  onQuickFilter,
  onSelectRisk,
}: {
  risks: ProjectRiskApi[];
  quickFilter: RiskQuickFilter;
  onQuickFilter: (filter: RiskQuickFilter) => void;
  onSelectRisk?: (risk: ProjectRiskApi) => void;
}) {
  const stats = useMemo(() => computeRiskActionStats(risks), [risks]);
  const summary = useMemo(() => buildRiskPilotageSummary(stats), [stats]);
  const attentionRisks = useMemo(() => sortAttentionRisks(risks).slice(0, 5), [risks]);

  const toggleFilter = (filter: RiskQuickFilter) => {
    onQuickFilter(quickFilter === filter ? 'all' : filter);
  };

  return (
    <section className="starium-proj-risks-pilotage" aria-labelledby="project-risks-pilotage-heading">
      <div className="starium-proj-risks-pilotage-head">
        <h2 id="project-risks-pilotage-heading" className="starium-sec-title">
          Pilotage des risques
        </h2>
        <p className="starium-proj-risks-pilotage-summary">{summary}</p>
      </div>

      <SynthesisListKpis columns={4} aria-label="Écarts de pilotage à traiter">
        <ActionKpiButton
          active={quickFilter === 'overdue'}
          onClick={() => toggleFilter('overdue')}
          label="Filtrer les risques en échéance dépassée"
        >
          <SynthesisListKpi
            icon={<CalendarClock strokeWidth={1.75} />}
            iconClassName="starium-list-kpi__ico--danger"
            label="Échéances dépassées"
            value={stats.overdue}
            valueClassName={stats.overdue > 0 ? 'text-[color:var(--state-danger)]' : undefined}
            sub={stats.overdue > 0 ? 'À replanifier' : 'Aucun retard'}
            subClassName={
              stats.overdue > 0 ? 'text-[color:var(--state-danger)]' : 'text-muted-foreground'
            }
          />
        </ActionKpiButton>
        <ActionKpiButton
          active={quickFilter === 'unowned'}
          onClick={() => toggleFilter('unowned')}
          label="Filtrer les risques sans propriétaire"
        >
          <SynthesisListKpi
            icon={<UserX strokeWidth={1.75} />}
            iconClassName="starium-list-kpi__ico--gold"
            label="Sans propriétaire"
            value={stats.unowned}
            valueClassName={stats.unowned > 0 ? 'text-[color:var(--brand-gold-700)]' : undefined}
            sub={stats.unowned > 0 ? 'Responsable à désigner' : 'Tous assignés'}
            subClassName={
              stats.unowned > 0 ? 'text-[color:var(--brand-gold-700)]' : 'text-muted-foreground'
            }
          />
        </ActionKpiButton>
        <ActionKpiButton
          active={quickFilter === 'untreated'}
          onClick={() => toggleFilter('untreated')}
          label="Filtrer les risques sans plan de traitement"
        >
          <SynthesisListKpi
            icon={<ClipboardList strokeWidth={1.75} />}
            iconClassName="starium-list-kpi__ico--info"
            label="Sans plan de traitement"
            value={stats.untreated}
            valueClassName={stats.untreated > 0 ? 'text-[color:var(--state-info)]' : undefined}
            sub={stats.untreated > 0 ? 'Mesures à documenter' : 'Plans renseignés'}
            subClassName={
              stats.untreated > 0 ? 'text-[color:var(--state-info)]' : 'text-muted-foreground'
            }
          />
        </ActionKpiButton>
        <ActionKpiButton
          active={quickFilter === 'priority'}
          onClick={() => toggleFilter('priority')}
          label="Filtrer les risques prioritaires ouverts"
        >
          <SynthesisListKpi
            icon={<ShieldAlert strokeWidth={1.75} />}
            iconClassName="starium-list-kpi__ico--danger"
            label="Prioritaires ouverts"
            value={stats.priorityOpen}
            valueClassName={stats.priorityOpen > 0 ? 'text-[color:var(--state-danger)]' : undefined}
            sub={stats.priorityOpen > 0 ? 'Décision attendue' : 'Sous contrôle'}
            subClassName={
              stats.priorityOpen > 0 ? 'text-[color:var(--state-danger)]' : 'text-muted-foreground'
            }
          />
        </ActionKpiButton>
      </SynthesisListKpis>

      {attentionRisks.length > 0 ? (
        <div className="starium-card starium-risk-attention">
          <div className="starium-sp-head">
            <span className="starium-sp-title">Écarts à corriger en priorité</span>
            <span className="starium-sp-head-ico text-[color:var(--state-danger)]" aria-hidden>
              <AlertCircle strokeWidth={2} width={18} height={18} />
            </span>
          </div>
          <ul className="starium-risk-attention-list">
            {attentionRisks.map((risk) => {
              const reasons = getRiskAttentionReasons(risk);
              const primaryReason = reasons[0];
              return (
                <li key={risk.id} className="starium-risk-attention-item">
                  <div className="min-w-0 flex-1">
                    {onSelectRisk ? (
                      <button
                        type="button"
                        className="starium-risk-attention-title"
                        onClick={() => onSelectRisk(risk)}
                      >
                        {risk.title}
                      </button>
                    ) : (
                      <div className="starium-risk-attention-title">{risk.title}</div>
                    )}
                    <p className="starium-risk-attention-meta">
                      {primaryReason ? riskAttentionReasonLabel(primaryReason) : '—'}
                      {risk.dueDate ? ` · ${formatProjectDateLong(risk.dueDate)}` : ''}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'starium-ds-badge shrink-0',
                      riskCriticalityDsBadgeClass(risk.criticalityLevel),
                    )}
                  >
                    {riskCriticalityLabel(risk.criticalityLevel)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : stats.active > 0 ? (
        <div className="starium-card starium-risk-attention starium-risk-attention--ok">
          <p className="text-sm text-muted-foreground">
            Tous les risques actifs ont un propriétaire, un plan de traitement et une échéance à jour.
          </p>
        </div>
      ) : null}
    </section>
  );
}
