import type {
  Project,
  ProjectMilestone,
  ProjectRisk,
  ProjectTask,
} from '@prisma/client';
import { computeIsLateTask } from './lib/project-gantt-is-late.util';
import { riskCriticalityForRisk } from './projects-pilotage.service';
import type { ProjectSignalsDto } from './projects.types';

const MAX_NAMES = 5;

export type ProjectListPilotageItemDto = {
  name: string;
  targetDate?: string;
  status?: string;
};

export type ProjectListPilotageSnapshotDto = {
  delayedMilestones: ProjectListPilotageItemDto[];
  nextMilestone: ProjectListPilotageItemDto | null;
  openTasks: ProjectListPilotageItemDto[];
  openRisks: Array<{ title: string }>;
  /** Points factuels positifs (noms, dates, compteurs). */
  ok: string[];
  /** Points factuels à traiter (noms, dates, lacunes). */
  issues: string[];
  /** Libellés tronqués (+N autres) si listes longues. */
  moreOpenTasks: number;
  moreOpenRisks: number;
  moreDelayedMilestones: number;
};

function isOpenTask(task: ProjectTask): boolean {
  return (
    task.status === 'TODO' ||
    task.status === 'IN_PROGRESS' ||
    task.status === 'BLOCKED'
  );
}

function isOpenRisk(risk: ProjectRisk): boolean {
  return risk.status === 'OPEN';
}

function isElevatedOpenRisk(risk: ProjectRisk): boolean {
  if (risk.status !== 'OPEN') return false;
  return riskCriticalityForRisk(risk) === 'HIGH';
}

function riskIssueLabel(risk: ProjectRisk): string {
  if (risk.criticalityLevel === 'CRITICAL') {
    return `Risque critique : ${risk.title}`;
  }
  return `Risque élevé : ${risk.title}`;
}

function isProblemTask(task: ProjectTask): boolean {
  if (task.status === 'BLOCKED') return true;
  return computeIsLateTask(task);
}

function sortTasksForDisplay(tasks: ProjectTask[]): ProjectTask[] {
  return [...tasks].sort((a, b) => {
    const aEnd = a.plannedEndDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const bEnd = b.plannedEndDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
    return aEnd - bEnd;
  });
}

function sortRisksForDisplay(risks: ProjectRisk[]): ProjectRisk[] {
  return [...risks].sort((a, b) => b.criticalityScore - a.criticalityScore);
}

function findNextMilestone(
  milestones: ProjectMilestone[],
): ProjectMilestone | null {
  const open = milestones.filter(
    (m) => m.status !== 'ACHIEVED' && m.status !== 'CANCELLED',
  );
  if (open.length === 0) return null;
  const sorted = [...open].sort(
    (a, b) => a.targetDate.getTime() - b.targetDate.getTime(),
  );
  const now = Date.now();
  const upcoming = sorted.find((m) => m.targetDate.getTime() >= now);
  return upcoming ?? sorted[sorted.length - 1] ?? null;
}

function formatFrDate(d: Date): string {
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatIsoDate(d: Date): string {
  return d.toISOString();
}

export function buildProjectListPilotageSnapshot(params: {
  project: Pick<Project, 'targetEndDate' | 'status'>;
  tasks: ProjectTask[];
  risks: ProjectRisk[];
  milestones: ProjectMilestone[];
  signals: ProjectSignalsDto;
  ownerDisplayName: string | null;
  openTasksCount: number;
  openRisksCount: number;
}): ProjectListPilotageSnapshotDto {
  const {
    project,
    tasks,
    risks,
    milestones,
    signals,
    ownerDisplayName,
    openTasksCount,
    openRisksCount,
  } = params;

  const openTasksSorted = sortTasksForDisplay(tasks.filter(isOpenTask));
  const openRisksSorted = sortRisksForDisplay(risks.filter(isOpenRisk));
  const delayed = milestones
    .filter((m) => m.status === 'DELAYED')
    .sort((a, b) => a.targetDate.getTime() - b.targetDate.getTime());
  const next = findNextMilestone(milestones);

  const openTasks = openTasksSorted.slice(0, MAX_NAMES).map((t) => ({
    name: t.name,
    status: t.status,
  }));
  const openRisks = openRisksSorted.slice(0, MAX_NAMES).map((r) => ({
    title: r.title,
  }));
  const delayedMilestones = delayed.slice(0, MAX_NAMES).map((m) => ({
    name: m.name,
    targetDate: formatIsoDate(m.targetDate),
  }));

  const issues: string[] = [];

  if (signals.isLate && project.targetEndDate) {
    issues.push(
      `Échéance projet dépassée (${formatFrDate(project.targetEndDate)})`,
    );
  }
  if (signals.isBlocked) {
    issues.push('Projet en pause');
  }
  for (const m of delayed) {
    issues.push(`Jalon en retard : ${m.name} (${formatFrDate(m.targetDate)})`);
  }
  for (const r of openRisksSorted.filter(isElevatedOpenRisk)) {
    issues.push(riskIssueLabel(r));
  }
  for (const t of openTasksSorted.filter(isProblemTask)) {
    if (t.status === 'BLOCKED') {
      issues.push(`Tâche bloquée : ${t.name}`);
    } else if (t.plannedEndDate) {
      issues.push(
        `Tâche en retard : ${t.name} (${formatFrDate(t.plannedEndDate)})`,
      );
    } else {
      issues.push(`Tâche en retard : ${t.name}`);
    }
  }
  if (signals.hasNoOwner) {
    issues.push('Aucun responsable désigné');
  }
  if (signals.hasNoRisks) {
    issues.push('Aucun risque enregistré');
  }
  if (signals.hasNoTasks) {
    issues.push('Aucune tâche planifiée');
  }
  if (signals.hasNoMilestones) {
    issues.push('Aucun jalon défini');
  }

  const ok: string[] = [];

  if (ownerDisplayName) {
    ok.push(`Responsable : ${ownerDisplayName}`);
  }
  if (next) {
    ok.push(`Prochain jalon : ${next.name} (${formatFrDate(next.targetDate)})`);
  }
  if (delayed.length === 0 && milestones.length > 0) {
    ok.push('Aucun jalon en retard');
  }
  if (!signals.hasNoRisks && risks.length > 0) {
    ok.push('Registre des risques alimenté');
  }
  if (openRisksCount === 0 && risks.length > 0) {
    ok.push('Aucun risque ouvert');
  }
  if (openTasksCount === 0 && tasks.some((t) => t.status !== 'CANCELLED')) {
    ok.push('Toutes les tâches sont terminées');
  }
  if (!signals.isLate && project.targetEndDate) {
    ok.push(`Échéance projet : ${formatFrDate(project.targetEndDate)}`);
  }
  if (issues.length === 0 && ok.length === 0) {
    ok.push('Rien à signaler sur ce projet');
  }

  return {
    delayedMilestones,
    nextMilestone: next
      ? { name: next.name, targetDate: formatIsoDate(next.targetDate) }
      : null,
    openTasks,
    openRisks,
    ok,
    issues,
    moreOpenTasks: Math.max(0, openTasksSorted.length - MAX_NAMES),
    moreOpenRisks: Math.max(0, openRisksSorted.length - MAX_NAMES),
    moreDelayedMilestones: Math.max(0, delayed.length - MAX_NAMES),
  };
}
