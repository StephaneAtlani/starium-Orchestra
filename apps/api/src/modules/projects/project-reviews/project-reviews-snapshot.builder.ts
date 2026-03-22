import type {
  Prisma,
  Project,
  ProjectBudgetLink,
  ProjectMilestone,
  ProjectRisk,
  ProjectTask,
} from '@prisma/client';
import { Prisma as PrismaNS } from '@prisma/client';
import type { ComputedHealth } from '../projects.types';
import {
  ProjectsPilotageService,
  derivedProgressPercentFromTasks,
  riskCriticalityForRisk,
  riskScore,
} from '../projects-pilotage.service';

function startOfTodayUtc(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function isTaskLate(t: ProjectTask): boolean {
  if (t.status === 'DONE' || t.status === 'CANCELLED') return false;
  if (!t.plannedEndDate) return false;
  return new Date(t.plannedEndDate) < startOfTodayUtc();
}

export type ProjectReviewSnapshotBudgetLine = {
  budgetLineId: string;
  /** Libellé lisible (code + nom ligne). */
  label: string;
  allocationType: string;
  percentage: string | null;
  amount: string | null;
};

export type ProjectReviewSnapshotPayload = {
  project: {
    id: string;
    name: string;
    status: string;
    health: ComputedHealth;
    priority: string;
  };
  progress: { globalProgress: number | null };
  arbitration: {
    arbitrationMetierStatus: string | null;
    arbitrationComiteStatus: string | null;
    arbitrationCodirStatus: string | null;
    arbitrationStatus: string | null;
  };
  tasks: {
    open: number;
    inProgress: number;
    done: number;
    late: number;
  };
  risks: {
    open: number;
    mitigated: number;
    closed: number;
    accepted: number;
    topRisks: Array<{
      id: string;
      title: string;
      criticality: 'LOW' | 'MEDIUM' | 'HIGH';
      status: string;
    }>;
  };
  milestones: Array<{
    id: string;
    name: string;
    targetDate: string;
    status: string;
  }>;
  budget: { links: ProjectReviewSnapshotBudgetLine[] } | null;
  generatedAt: string;
};

const TOP_RISKS_MAX = 5;
const MILESTONES_MAX = 5;

export function buildProjectReviewSnapshotPayload(input: {
  project: Project;
  tasks: ProjectTask[];
  risks: ProjectRisk[];
  milestones: ProjectMilestone[];
  budgetLinks: Array<
    ProjectBudgetLink & {
      budgetLine: { id: string; code: string; name: string };
    }
  >;
  pilotage: ProjectsPilotageService;
}): Prisma.InputJsonValue {
  const { project, tasks, risks, milestones, budgetLinks, pilotage } = input;

  const health = pilotage.computedHealth(project, tasks, risks, milestones);
  const globalProgress =
    project.progressPercent ?? derivedProgressPercentFromTasks(tasks);

  const open = tasks.filter(
    (t) =>
      t.status === 'TODO' ||
      t.status === 'IN_PROGRESS' ||
      t.status === 'BLOCKED',
  ).length;
  const inProgress = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const done = tasks.filter((t) => t.status === 'DONE').length;
  const late = tasks.filter((t) => isTaskLate(t)).length;

  const openRisks = risks.filter((r) => r.status === 'OPEN');
  const sortedForTop = [...openRisks].sort(
    (a, b) => riskScore(b.probability, b.impact) - riskScore(a.probability, a.impact),
  );
  const topRisks = sortedForTop.slice(0, TOP_RISKS_MAX).map((r) => ({
    id: r.id,
    title: r.title,
    criticality: riskCriticalityForRisk(r),
    status: r.status,
  }));

  const today = startOfTodayUtc();
  const upcoming = [...milestones]
    .filter((m) => m.status !== 'CANCELLED')
    .filter((m) => new Date(m.targetDate) >= today || m.status === 'DELAYED')
    .sort(
      (a, b) =>
        new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime(),
    )
    .slice(0, MILESTONES_MAX)
    .map((m) => ({
      id: m.id,
      name: m.name,
      targetDate: m.targetDate.toISOString(),
      status: m.status,
    }));

  const budget =
    budgetLinks.length > 0
      ? {
          links: budgetLinks.map((l) => ({
            budgetLineId: l.budgetLineId,
            label: `${l.budgetLine.code} — ${l.budgetLine.name}`,
            allocationType: l.allocationType,
            percentage:
              l.percentage != null
                ? (l.percentage as PrismaNS.Decimal).toString()
                : null,
            amount:
              l.amount != null ? (l.amount as PrismaNS.Decimal).toString() : null,
          })),
        }
      : null;

  const payload: ProjectReviewSnapshotPayload = {
    project: {
      id: project.id,
      name: project.name,
      status: project.status,
      health,
      priority: project.priority,
    },
    progress: { globalProgress },
    arbitration: {
      arbitrationMetierStatus: project.arbitrationMetierStatus ?? null,
      arbitrationComiteStatus: project.arbitrationComiteStatus ?? null,
      arbitrationCodirStatus: project.arbitrationCodirStatus ?? null,
      arbitrationStatus: project.arbitrationStatus ?? null,
    },
    tasks: { open, inProgress, done, late },
    risks: {
      open: risks.filter((r) => r.status === 'OPEN').length,
      mitigated: risks.filter((r) => r.status === 'MITIGATED').length,
      closed: risks.filter((r) => r.status === 'CLOSED').length,
      accepted: risks.filter((r) => r.status === 'ACCEPTED').length,
      topRisks,
    },
    milestones: upcoming,
    budget,
    generatedAt: new Date().toISOString(),
  };

  return JSON.parse(JSON.stringify(payload)) as Prisma.InputJsonValue;
}
