'use client';

import type { ReactNode } from 'react';
import type { MilestoneForGanttBody } from '../lib/build-gantt-body-rows';
import type { ProjectTaskApi } from '../types/project.types';
import {
  MILESTONE_STATUS_LABEL,
  TASK_PRIORITY_LABEL,
  TASK_STATUS_LABEL,
} from '../constants/project-enum-labels';

/** Même chrome que le Gantt portefeuille (fond sombre, texte clair). */
export const PROJECT_GANTT_TOOLTIP_CONTENT_CLASS =
  'max-w-[min(34rem,calc(100vw-2rem))] flex-col items-start gap-0 px-3 py-2.5 text-left';

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-background/65">
      {children}
    </p>
  );
}

function fmtDate(iso: string | null | undefined): string {
  if (iso == null || iso === '') return '—';
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

export function ProjectGanttTaskTooltipContent({
  task,
  phaseName,
  predecessorName,
}: {
  task: ProjectTaskApi;
  phaseName: string | null;
  predecessorName: string | null;
}) {
  const statusLabel = TASK_STATUS_LABEL[task.status] ?? task.status;
  const priorityLabel = TASK_PRIORITY_LABEL[task.priority] ?? task.priority;
  const desc = task.description?.trim() ?? '';

  return (
    <div className="flex w-full max-w-[min(34rem,calc(100vw-2rem))] gap-3 text-left">
      <div className="min-w-0 flex-1 space-y-2.5">
        <div>
          <SectionTitle>Tâche</SectionTitle>
          <p className="mt-1 text-[0.8125rem] font-semibold leading-snug text-background/95">
            {task.name}
          </p>
          {task.code?.trim() ? (
            <p className="mt-0.5 text-[0.7rem] text-background/70">{task.code.trim()}</p>
          ) : null}
        </div>
        <ul className="list-none space-y-1 text-[0.8125rem] leading-snug text-background/95">
          <li>
            <span className="text-background/75">Statut · </span>
            {statusLabel}
            {task.isLate ? <span> · En retard</span> : null}
          </li>
          <li>
            <span className="text-background/75">Priorité · </span>
            {priorityLabel}
          </li>
          <li>
            <span className="text-background/75">Avancement · </span>
            {task.progress} %
          </li>
          {phaseName ? (
            <li>
              <span className="text-background/75">Phase · </span>
              {phaseName}
            </li>
          ) : null}
          <li>
            <span className="text-background/75">Planifié · </span>
            {fmtDate(task.plannedStartDate)} → {fmtDate(task.plannedEndDate)}
          </li>
          {(task.actualStartDate || task.actualEndDate) && (
            <li>
              <span className="text-background/75">Réel · </span>
              {fmtDate(task.actualStartDate)} → {fmtDate(task.actualEndDate)}
            </li>
          )}
          {task.dependsOnTaskId ? (
            <li>
              <span className="text-background/75">Prédécesseur · </span>
              {predecessorName ?? '—'}
            </li>
          ) : null}
          {task.responsibleResource?.name ? (
            <li>
              <span className="text-background/75">Responsable · </span>
              {task.responsibleResource.name}
            </li>
          ) : null}
        </ul>
      </div>
      <div className="w-[min(11.5rem,32vw)] shrink-0 border-l border-background/20 pl-3">
        <SectionTitle>Description</SectionTitle>
        <p
          className="mt-1.5 line-clamp-6 break-words text-[0.8125rem] leading-snug text-background/95"
          title={desc || undefined}
        >
          {desc || '—'}
        </p>
      </div>
    </div>
  );
}

export function ProjectGanttMilestoneTooltipContent({
  milestone,
  linkedTaskName,
  phaseName,
  projectBusinessProblem,
}: {
  milestone: MilestoneForGanttBody;
  linkedTaskName: string | null;
  phaseName: string | null;
  projectBusinessProblem: string | null;
}) {
  const statusLabel = MILESTONE_STATUS_LABEL[milestone.status] ?? milestone.status;
  const objectif = projectBusinessProblem?.trim() ?? '';

  return (
    <div className="flex w-full max-w-[min(34rem,calc(100vw-2rem))] gap-3 text-left">
      <div className="min-w-0 flex-1 space-y-2.5">
        <div>
          <SectionTitle>Jalon</SectionTitle>
          <p className="mt-1 text-[0.8125rem] font-semibold leading-snug text-background/95">
            {milestone.name}
          </p>
        </div>
        <ul className="list-none space-y-1 text-[0.8125rem] leading-snug text-background/95">
          <li>
            <span className="text-background/75">Statut · </span>
            {statusLabel}
            {milestone.isLate ? <span> · En retard</span> : null}
          </li>
          <li>
            <span className="text-background/75">Date cible · </span>
            {fmtDate(milestone.targetDate)}
          </li>
          {phaseName ? (
            <li>
              <span className="text-background/75">Phase · </span>
              {phaseName}
            </li>
          ) : null}
          {milestone.linkedTaskId ? (
            <li>
              <span className="text-background/75">Tâche liée · </span>
              {linkedTaskName ?? '—'}
            </li>
          ) : null}
        </ul>
      </div>
      <div className="w-[min(11.5rem,32vw)] shrink-0 border-l border-background/20 pl-3">
        <SectionTitle>Objectif métier</SectionTitle>
        <p
          className="mt-1.5 line-clamp-6 break-words text-[0.8125rem] leading-snug text-background/95"
          title={objectif || undefined}
        >
          {objectif || '—'}
        </p>
      </div>
    </div>
  );
}
