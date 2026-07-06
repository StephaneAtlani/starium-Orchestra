'use client';

import { useMemo } from 'react';
import {
  AlertTriangle,
  Check,
  ListTodo,
  Zap,
} from 'lucide-react';
import { useProjectTasksQuery } from '../hooks/use-project-tasks-query';
import { computeTaskStats } from '../lib/project-task-display';

export function ProjectTasksStatStrip({ projectId }: { projectId: string }) {
  const tasksQuery = useProjectTasksQuery(projectId);
  const stats = useMemo(
    () => computeTaskStats(tasksQuery.data?.items ?? []),
    [tasksQuery.data?.items],
  );

  return (
    <div className="starium-stat-cards" aria-label="Synthèse des tâches du projet">
      <div className="starium-stat-card">
        <div
          className="starium-stat-card__ico"
          style={{
            background: 'var(--neutral-100)',
            color: 'var(--neutral-600)',
          }}
          aria-hidden
        >
          <ListTodo strokeWidth={1.75} />
        </div>
        <div className="starium-stat-card__num">{stats.total}</div>
        <div className="starium-stat-card__lbl">tâches</div>
        <div className="starium-stat-card__pct text-muted-foreground">Total</div>
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
          {stats.done}
        </div>
        <div className="starium-stat-card__lbl">terminées</div>
        <div className="starium-stat-card__pct text-[color:var(--state-success)]">
          {stats.donePct}%
        </div>
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
          <Zap strokeWidth={2} />
        </div>
        <div className="starium-stat-card__num text-[color:var(--state-info)]">
          {stats.inProgress}
        </div>
        <div className="starium-stat-card__lbl">en cours</div>
        <div className="starium-stat-card__pct text-[color:var(--state-info)]">
          {stats.inProgressPct}%
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
          {stats.blocked}
        </div>
        <div className="starium-stat-card__lbl">bloquées</div>
        <div className="starium-stat-card__pct text-[color:var(--state-danger)]">
          {stats.blockedPct}%
        </div>
      </div>
    </div>
  );
}
