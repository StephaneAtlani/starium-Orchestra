'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Flag,
  LayoutGrid,
  ListTodo,
  Zap,
} from 'lucide-react';
import { LoadingState } from '@/components/feedback/loading-state';
import { UserInitialsAvatar } from '@/components/ui/user-initials-avatar';
import { cn } from '@/lib/utils';
import {
  TASK_PRIORITY_LABEL,
  TASK_STATUS_LABEL,
} from '../constants/project-enum-labels';
import {
  SynthesisListKpi,
  SynthesisListKpis,
} from './synthesis-ds-kpi';
import { projectPlanning } from '../constants/project-routes';
import { useProjectTasksQuery } from '../hooks/use-project-tasks-query';
import { formatProjectDateLong } from '../lib/projects-list-display';
import type { ProjectDetail, ProjectTaskApi } from '../types/project.types';

const TASK_ICON_TONES = [
  'starium-dt-ti-neutral',
  'starium-dt-ti-blue',
  'starium-dt-ti-purple',
  'starium-dt-ti-gold',
  'starium-dt-ti-green',
] as const;

const TASK_PAGE_SIZE_OPTIONS = [5, 10, 25] as const;
const DEFAULT_TASK_PAGE_SIZE = TASK_PAGE_SIZE_OPTIONS[0];

function getVisiblePageNumbers(currentPage: number, totalPages: number): number[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }
  if (currentPage <= 3) {
    return [1, 2, 3, 4, 5];
  }
  if (currentPage >= totalPages - 2) {
    return [
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }
  return [currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2];
}

function RecentTasksPagination({
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  planningHref,
}: {
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  planningHref: string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = total === 0 ? 0 : Math.min(safePage * pageSize, total);
  const pageNumbers = getVisiblePageNumbers(safePage, totalPages);
  const rangeLabel =
    total === 0
      ? 'Aucune tâche à afficher'
      : total === 1
        ? '1 tâche'
        : `${start} à ${end} sur ${total} tâches`;

  return (
    <div className="starium-dt-pagination" aria-label="Pagination des tâches récentes">
      <div className="starium-dt-pagination__start">
        <span className="starium-dt-pg-info" aria-live="polite">
          {rangeLabel}
        </span>
        <Link href={planningHref} className="starium-dt-footer-link">
          Voir toutes les tâches
        </Link>
      </div>

      <div className="starium-dt-pg-nums" role="navigation" aria-label="Pages">
        <button
          type="button"
          className="starium-dt-pg-btn"
          disabled={safePage <= 1 || total === 0}
          onClick={() => onPageChange(safePage - 1)}
          aria-label="Page précédente"
        >
          <ChevronLeft strokeWidth={2.5} aria-hidden />
        </button>
        {pageNumbers.map((pageNumber) => (
          <button
            key={pageNumber}
            type="button"
            className={cn(
              'starium-dt-pg-btn',
              pageNumber === safePage && 'starium-dt-pg-btn--active',
            )}
            onClick={() => onPageChange(pageNumber)}
            aria-label={`Page ${pageNumber}`}
            aria-current={pageNumber === safePage ? 'page' : undefined}
          >
            {pageNumber}
          </button>
        ))}
        <button
          type="button"
          className="starium-dt-pg-btn"
          disabled={safePage >= totalPages || total === 0}
          onClick={() => onPageChange(safePage + 1)}
          aria-label="Page suivante"
        >
          <ChevronRight strokeWidth={2.5} aria-hidden />
        </button>
      </div>

      <label className="flex items-center gap-2">
        <span className="sr-only">Nombre de tâches par page</span>
        <select
          className="starium-dt-pg-select"
          value={pageSize}
          onChange={(event) => {
            onPageChange(1);
            onPageSizeChange(Number(event.target.value));
          }}
          disabled={total === 0}
        >
          {TASK_PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size} par page
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function taskAssigneeLabel(task: ProjectTaskApi): string {
  const resource = task.responsibleResource;
  if (resource?.firstName && resource?.name) {
    return `${resource.firstName} ${resource.name.charAt(0)}.`;
  }
  if (resource?.name) return resource.name;
  return '—';
}

function taskAssigneeDisplayName(task: ProjectTaskApi): string {
  const resource = task.responsibleResource;
  if (resource?.firstName && resource?.name) {
    return `${resource.firstName} ${resource.name}`;
  }
  return resource?.name ?? 'Non assignée';
}

function statusBadgeClass(status: string, isLate: boolean | undefined): string {
  if (isLate && status !== 'DONE' && status !== 'CANCELLED') {
    return 'starium-ds-badge--danger';
  }
  switch (status) {
    case 'IN_PROGRESS':
      return 'starium-ds-badge--success';
    case 'BLOCKED':
      return 'starium-ds-badge--danger';
    case 'DONE':
      return 'starium-ds-badge--success';
    case 'TODO':
    case 'DRAFT':
      return 'starium-ds-badge--info';
    default:
      return 'starium-ds-badge--neutral';
  }
}

function statusBadgeLabel(status: string, isLate: boolean | undefined): string {
  if (isLate && status !== 'DONE' && status !== 'CANCELLED') {
    return 'En retard';
  }
  return TASK_STATUS_LABEL[status] ?? status;
}

function priorityFlagClass(priority: string): string {
  if (priority === 'HIGH' || priority === 'CRITICAL') return 'starium-dt-flag--haute';
  if (priority === 'LOW') return 'starium-dt-flag--basse';
  return 'starium-dt-flag--moyenne';
}

function progressFillClass(progress: number, isLate: boolean | undefined): string {
  if (isLate) return 'starium-dt-prog-fill--bad';
  if (progress >= 80) return 'starium-dt-prog-fill--ok';
  if (progress >= 40) return 'starium-dt-prog-fill--warn';
  return 'starium-dt-prog-fill--blue';
}

function sortTasksRecentFirst(tasks: ProjectTaskApi[]): ProjectTaskApi[] {
  return [...tasks].sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (bTime !== aTime) return bTime - aTime;
    return b.sortOrder - a.sortOrder;
  });
}

function computeTaskStats(tasks: ProjectTaskApi[]) {
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === 'DONE').length;
  const inProgress = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const blocked = tasks.filter((t) => t.status === 'BLOCKED' || t.isLate).length;
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
  return { total, done, inProgress, blocked, donePct: pct(done), inProgressPct: pct(inProgress), blockedPct: pct(blocked) };
}

function RecentTaskRow({ task, index }: { task: ProjectTaskApi; index: number }) {
  const assignee = taskAssigneeLabel(task);
  const assigneeName = taskAssigneeDisplayName(task);
  const dueDate = task.plannedEndDate;
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
        <span className={cn('starium-ds-badge', statusBadgeClass(task.status, isLate))}>
          {statusBadgeLabel(task.status, isLate)}
        </span>
      </td>
      <td>
        <span className={cn('starium-dt-flag', priorityFlagClass(task.priority))}>
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
          {formatProjectDateLong(dueDate)}
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
            <span className="starium-dt-assignee-name">{assignee}</span>
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
              className={cn('starium-dt-prog-fill', progressFillClass(progress, isLate))}
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
  const tasks = tasksQuery.data?.items ?? [];
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_TASK_PAGE_SIZE);

  const stats = useMemo(() => computeTaskStats(tasks), [tasks]);
  const sortedTasks = useMemo(() => sortTasksRecentFirst(tasks), [tasks]);
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

  const planningHref = projectPlanning(projectId, 'tasks');

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
            <div className="starium-table-wrap">
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
                        Aucune tâche planifiée. Créez-en depuis le planning.
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
            </div>
            <RecentTasksPagination
              total={stats.total}
              page={safePage}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              planningHref={planningHref}
            />
          </>
        )}
      </div>
    </section>
  );
}
