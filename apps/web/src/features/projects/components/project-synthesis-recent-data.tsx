'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  Check,
  Flag,
  LayoutGrid,
  ListTodo,
  Zap,
} from 'lucide-react';
import { LoadingState } from '@/components/feedback/loading-state';
import { StariumTableWrap } from '@/components/ui/starium-table-wrap';
import { UserInitialsAvatar } from '@/components/ui/user-initials-avatar';
import { cn } from '@/lib/utils';
import { TASK_PRIORITY_LABEL } from '../constants/project-enum-labels';
import {
  SynthesisListKpi,
  SynthesisListKpis,
} from './synthesis-ds-kpi';
import { projectTasks } from '../constants/project-routes';
import { useProjectTasksQuery } from '../hooks/use-project-tasks-query';
import {
  computeTaskStats,
  sortTasksForList,
  TASK_ICON_TONES,
  taskAssigneeDisplayName,
  taskAssigneeShortLabel,
  taskPriorityFlagClass,
  taskProgressFillClass,
  taskStatusBadgeClass,
  taskStatusBadgeLabel,
} from '../lib/project-task-display';
import { formatProjectDateLong } from '../lib/projects-list-display';
import type { ProjectDetail, ProjectTaskApi } from '../types/project.types';
import { ProjectTasksPagination } from './project-tasks-pagination';

const TASK_PAGE_SIZE_OPTIONS = [5, 10, 25] as const;

function RecentTaskRow({ task, index }: { task: ProjectTaskApi; index: number }) {
  const assignee = taskAssigneeShortLabel(task);
  const assigneeName = taskAssigneeDisplayName(task);
  const isLate = task.isLate ?? false;
  const progress = Math.min(100, Math.max(0, Math.round(task.progress ?? 0)));
  const iconTone = TASK_ICON_TONES[index % TASK_ICON_TONES.length];

  return (
    <tr>
      <td>
        <div className="starium-dt-tname">
          <div className={cn('starium-dt-tname-ico', iconTone)} aria-hidden>
            <LayoutGrid strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <div className="starium-dt-cell-strong truncate">{task.name}</div>
            {task.code ? (
              <div className="starium-dt-cell-sub truncate">{task.code}</div>
            ) : task.description ? (
              <div className="starium-dt-cell-sub truncate">{task.description}</div>
            ) : null}
          </div>
        </div>
      </td>
      <td>
        <span className={cn('starium-ds-badge', taskStatusBadgeClass(task.status, isLate))}>
          {taskStatusBadgeLabel(task.status, isLate)}
        </span>
      </td>
      <td>
        <span className={cn('starium-dt-flag', taskPriorityFlagClass(task.priority))}>
          <Flag strokeWidth={2} aria-hidden />
          {TASK_PRIORITY_LABEL[task.priority] ?? task.priority}
        </span>
      </td>
      <td>
        <div
          className={cn(
            'starium-dt-date',
            isLate && task.status !== 'DONE' && 'starium-dt-date--late',
          )}
        >
          <Calendar strokeWidth={1.75} aria-hidden />
          {formatProjectDateLong(task.plannedEndDate)}
        </div>
      </td>
      <td>
        {assignee !== '—' ? (
          <div className="starium-dt-assignee">
            <UserInitialsAvatar
              displayName={assigneeName}
              seed={task.responsibleResourceId ?? task.id}
              themeIndex={index}
              size="sm"
            />
            <span className="starium-dt-assignee-name" title={assigneeName}>
              {assignee}
            </span>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </td>
      <td>
        <div className="starium-dt-prog">
          <span className="starium-dt-prog-pct">{progress}%</span>
          <div className="starium-dt-prog-track" aria-hidden>
            <div
              className={cn('starium-dt-prog-fill', taskProgressFillClass(progress, isLate))}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </td>
    </tr>
  );
}

export function ProjectSynthesisRecentData({
  projectId,
  project,
}: {
  projectId: string;
  project: ProjectDetail;
}) {
  const tasksQuery = useProjectTasksQuery(projectId);
  const tasks = useMemo(
    () => tasksQuery.data?.items ?? [],
    [tasksQuery.data?.items],
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(TASK_PAGE_SIZE_OPTIONS[0]);

  const stats = useMemo(() => computeTaskStats(tasks), [tasks]);
  const sortedTasks = useMemo(() => sortTasksForList(tasks), [tasks]);
  const totalPages = Math.max(1, Math.ceil(sortedTasks.length / pageSize));
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paginatedTasks = useMemo(() => {
    const offset = (safePage - 1) * pageSize;
    return sortedTasks.slice(offset, offset + pageSize);
  }, [sortedTasks, safePage, pageSize]);

  const tasksHref = projectTasks(projectId, 'tasks');

  return (
    <section className="starium-proj-recent" aria-labelledby="project-recent-data-heading">
      <h2 id="project-recent-data-heading" className="starium-sec-title">
        Données récentes
      </h2>

      <SynthesisListKpis columns={4} aria-label="Synthèse des tâches">
        <SynthesisListKpi
          icon={<ListTodo strokeWidth={1.75} />}
          iconClassName="starium-list-kpi__ico--neutral"
          label="Tâches"
          value={stats.total}
          sub="Total planifié"
          subClassName="text-muted-foreground"
        />
        <SynthesisListKpi
          icon={<Check strokeWidth={2} />}
          iconClassName="starium-list-kpi__ico--success"
          label="Terminées"
          value={stats.done}
          valueClassName="text-[color:var(--state-success)]"
          sub={`${stats.donePct}%`}
          subClassName="text-[color:var(--state-success)]"
        />
        <SynthesisListKpi
          icon={<Zap strokeWidth={2} />}
          iconClassName="starium-list-kpi__ico--info"
          label="En cours"
          value={stats.inProgress}
          valueClassName="text-[color:var(--state-info)]"
          sub={`${stats.inProgressPct}%`}
          subClassName="text-[color:var(--state-info)]"
        />
        <SynthesisListKpi
          icon={<AlertTriangle strokeWidth={1.75} />}
          iconClassName="starium-list-kpi__ico--danger"
          label="Bloquées / retard"
          value={stats.blocked}
          valueClassName="text-[color:var(--state-danger)]"
          sub={`${stats.blockedPct}%`}
          subClassName="text-[color:var(--state-danger)]"
        />
      </SynthesisListKpis>

      <div className="starium-tablecard">
        {tasksQuery.isLoading ? (
          <div className="p-6">
            <LoadingState rows={4} />
          </div>
        ) : (
          <>
            <StariumTableWrap scrollLabel="Tâches récentes — glisser pour faire défiler">
              <table className="starium-dt">
                <caption className="sr-only">
                  Tâches récentes du projet {project.name}
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Tâche</th>
                    <th scope="col">Statut</th>
                    <th scope="col">Priorité</th>
                    <th scope="col">Échéance</th>
                    <th scope="col">Assigné à</th>
                    <th scope="col">Avancement</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTasks.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                        Aucune tâche planifiée. Créez-en depuis l&apos;onglet Tâches.
                      </td>
                    </tr>
                  ) : (
                    paginatedTasks.map((task, index) => (
                      <RecentTaskRow
                        key={task.id}
                        task={task}
                        index={(safePage - 1) * pageSize + index}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </StariumTableWrap>
            <ProjectTasksPagination
              total={stats.total}
              page={safePage}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
              footerLink={{ href: tasksHref, label: 'Voir toutes les tâches' }}
            />
          </>
        )}
      </div>
    </section>
  );
}
