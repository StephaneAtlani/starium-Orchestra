'use client';

import { useMemo } from 'react';
import { AlertTriangle, Calendar, Check, Flag } from 'lucide-react';
import { useProjectMilestonesQuery } from '../hooks/use-project-milestones-query';
import { computeMilestoneStats } from '../lib/project-milestone-display';

export function ProjectMilestonesStatStrip({ projectId }: { projectId: string }) {
  const milestonesQuery = useProjectMilestonesQuery(projectId);
  const milestones = milestonesQuery.data?.items ?? [];
  const stats = useMemo(() => computeMilestoneStats(milestones), [milestones]);

  return (
    <div className="starium-stat-cards" aria-label="Synthèse des jalons du projet">
      <div className="starium-stat-card">
        <div
          className="starium-stat-card__ico"
          style={{
            background: 'var(--neutral-100)',
            color: 'var(--neutral-600)',
          }}
          aria-hidden
        >
          <Flag strokeWidth={1.75} />
        </div>
        <div className="starium-stat-card__num">{stats.total}</div>
        <div className="starium-stat-card__lbl">jalons</div>
        <div className="starium-stat-card__pct text-muted-foreground">Total</div>
      </div>
      <div className="starium-stat-card">
        <div
          className="starium-stat-card__ico"
          style={{
            background: 'var(--state-info-bg)',
            color: 'var(--state-info)',
          }}
          aria-hidden
        >
          <Calendar strokeWidth={1.75} />
        </div>
        <div className="starium-stat-card__num text-[color:var(--state-info)]">
          {stats.planned}
        </div>
        <div className="starium-stat-card__lbl">planifiés</div>
        <div className="starium-stat-card__pct text-[color:var(--state-info)]">
          {stats.plannedPct}%
        </div>
      </div>
      <div className="starium-stat-card">
        <div
          className="starium-stat-card__ico"
          style={{
            background: 'var(--state-success-bg)',
            color: 'var(--state-success)',
          }}
          aria-hidden
        >
          <Check strokeWidth={2} />
        </div>
        <div className="starium-stat-card__num text-[color:var(--state-success)]">
          {stats.achieved}
        </div>
        <div className="starium-stat-card__lbl">atteints</div>
        <div className="starium-stat-card__pct text-[color:var(--state-success)]">
          {stats.achievedPct}%
        </div>
      </div>
      <div className="starium-stat-card">
        <div
          className="starium-stat-card__ico"
          style={{
            background: 'var(--state-danger-bg)',
            color: 'var(--state-danger)',
          }}
          aria-hidden
        >
          <AlertTriangle strokeWidth={1.75} />
        </div>
        <div className="starium-stat-card__num text-[color:var(--state-danger)]">
          {stats.delayed}
        </div>
        <div className="starium-stat-card__lbl">en retard</div>
        <div className="starium-stat-card__pct text-[color:var(--state-danger)]">
          {stats.delayedPct}%
        </div>
      </div>
    </div>
  );
}
