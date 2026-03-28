import { Injectable } from '@nestjs/common';
import type {
  Project,
  ProjectCriticality,
  ProjectMilestone,
  ProjectMilestoneStatus,
  ProjectRisk,
  ProjectStatus,
  ProjectTask,
  ProjectTaskStatus,
} from '@prisma/client';
import {
  ComputedHealth,
  ProjectSignalsDto,
  ProjectWarningCode,
} from './projects.types';

/** Statuts « actifs » pilotage (RFC plan). */
export const ACTIVE_PROJECT_STATUSES: ProjectStatus[] = [
  'PLANNED',
  'IN_PROGRESS',
  'ON_HOLD',
];

export function isActiveProjectStatus(status: ProjectStatus): boolean {
  return ACTIVE_PROJECT_STATUSES.includes(status);
}

/** Agrège les 4 niveaux persistés vers 3 buckets pilotage (signaux / santé). */
export function riskCriticalityForRisk(r: ProjectRisk): 'LOW' | 'MEDIUM' | 'HIGH' {
  switch (r.criticalityLevel) {
    case 'CRITICAL':
    case 'HIGH':
      return 'HIGH';
    case 'MEDIUM':
      return 'MEDIUM';
    default:
      return 'LOW';
  }
}

/** Score brut P×I (1–25) — exposé pour reporting ; pilotage utilise `criticalityLevel`. */
export function riskScoreFromRisk(r: ProjectRisk): number {
  return r.criticalityScore;
}

/** RFC-PROJ-011 — moyenne des `progress` (0–100) sur les tâches non annulées */
export function derivedProgressPercentFromTasks(tasks: ProjectTask[]): number | null {
  const relevant = tasks.filter((t) => t.status !== 'CANCELLED');
  if (relevant.length === 0) return null;
  const sum = relevant.reduce((acc, t) => acc + t.progress, 0);
  return Math.round(sum / relevant.length);
}

function startOfTodayUtc(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function addDaysUtc(d: Date, days: number): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

/** Projet encore pertinent pour retard / échéance (hors terminés archivés). */
function isNonTerminalForLate(status: ProjectStatus): boolean {
  return (
    status !== 'COMPLETED' &&
    status !== 'CANCELLED' &&
    status !== 'ARCHIVED'
  );
}

@Injectable()
export class ProjectsPilotageService {
  isLate(project: Project): boolean {
    if (!project.targetEndDate) return false;
    if (!isNonTerminalForLate(project.status)) return false;
    const end = new Date(project.targetEndDate);
    const today = startOfTodayUtc();
    return end < today;
  }

  hasOpenHighRisk(risks: ProjectRisk[]): boolean {
    return risks.some(
      (r) =>
        r.status === 'OPEN' && riskCriticalityForRisk(r) === 'HIGH',
    );
  }

  hasOpenMediumRisk(risks: ProjectRisk[]): boolean {
    return risks.some(
      (r) =>
        r.status === 'OPEN' && riskCriticalityForRisk(r) === 'MEDIUM',
    );
  }

  hasDelayedMilestone(milestones: ProjectMilestone[]): boolean {
    return milestones.some((m) => m.status === 'DELAYED');
  }

  isBlocked(project: Project, risks: ProjectRisk[]): boolean {
    if (project.status === 'ON_HOLD') return true;
    return risks.some(
      (r) =>
        r.status === 'OPEN' && riskCriticalityForRisk(r) === 'HIGH',
    );
  }

  computedHealth(
    project: Project,
    tasks: ProjectTask[],
    risks: ProjectRisk[],
    milestones: ProjectMilestone[],
  ): ComputedHealth {
    const derived = derivedProgressPercentFromTasks(tasks);
    const manual = project.progressPercent;

    // RED
    if (project.status === 'ON_HOLD') return 'RED';

    if (project.targetEndDate && isNonTerminalForLate(project.status)) {
      const end = new Date(project.targetEndDate);
      if (end < startOfTodayUtc()) return 'RED';
    }

    if (this.hasOpenHighRisk(risks)) return 'RED';

    if (this.hasDelayedMilestone(milestones)) return 'RED';

    // ORANGE (aucun RED)
    const today = startOfTodayUtc();
    const in14 = addDaysUtc(today, 14);
    if (project.targetEndDate && isNonTerminalForLate(project.status)) {
      const end = new Date(project.targetEndDate);
      if (end >= today && end <= in14) return 'ORANGE';
    }

    if (this.hasOpenMediumRisk(risks)) return 'ORANGE';

    if (
      isActiveProjectStatus(project.status) &&
      milestones.length === 0
    ) {
      return 'ORANGE';
    }

    if (
      derived !== null &&
      manual !== null &&
      manual !== undefined &&
      Math.abs(manual - derived) > 30
    ) {
      return 'ORANGE';
    }

    return 'GREEN';
  }

  buildSignals(
    project: Project,
    tasks: ProjectTask[],
    risks: ProjectRisk[],
    milestones: ProjectMilestone[],
    health: ComputedHealth,
  ): ProjectSignalsDto {
    const active = isActiveProjectStatus(project.status);
    const isLate = this.isLate(project);
    const blocked = this.isBlocked(project, risks);

    const hasNoTasks = active && tasks.length === 0;
    const hasNoRisks = active && risks.length === 0;
    const hasNoMilestones = active && milestones.length === 0;

    const hasPlanningDrift =
      this.hasDelayedMilestone(milestones) || isLate;

    const isCritical =
      project.criticality === 'HIGH' || health === 'RED';

    return {
      isLate,
      isBlocked: blocked,
      hasNoOwner:
        project.ownerUserId === null && !project.ownerFreeLabel?.trim(),
      hasNoTasks,
      hasNoRisks,
      hasNoMilestones,
      hasPlanningDrift,
      isCritical,
    };
  }

  buildWarnings(signals: ProjectSignalsDto): ProjectWarningCode[] {
    const w: ProjectWarningCode[] = [];
    if (signals.hasNoOwner) w.push('NO_OWNER');
    if (signals.hasNoTasks) w.push('NO_TASKS');
    if (signals.hasNoRisks) w.push('NO_RISKS');
    if (signals.hasNoMilestones) w.push('NO_MILESTONES');
    if (signals.hasPlanningDrift) w.push('PLANNING_DRIFT');
    if (signals.isBlocked) w.push('BLOCKED');
    return w;
  }

  openTasksCount(tasks: ProjectTask[]): number {
    return tasks.filter(
      (t) => t.status === 'TODO' || t.status === 'IN_PROGRESS' || t.status === 'BLOCKED',
    ).length;
  }

  openRisksCount(risks: ProjectRisk[]): number {
    return risks.filter((r) => r.status === 'OPEN').length;
  }

  delayedMilestonesCount(milestones: ProjectMilestone[]): number {
    return milestones.filter((m) => m.status === 'DELAYED').length;
  }
}
