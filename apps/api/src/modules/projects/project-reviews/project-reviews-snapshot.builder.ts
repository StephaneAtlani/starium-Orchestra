import type {
  Prisma,
  Project,
  ProjectBudgetLink,
  ProjectMilestone,
  ProjectReview,
  ProjectReviewAgendaItemStatus,
  ProjectReviewAttachment,
  ProjectReviewAttachmentType,
  ProjectReviewDecision,
  ProjectReviewDecisionStatus,
  ProjectReviewDecisionType,
  ProjectReviewMeetingMode,
  ProjectReviewParticipantAttendanceStatus,
  ProjectReviewType,
  ProjectRisk,
  ProjectTask,
  ProjectTaskPriority,
} from '@prisma/client';
import { Prisma as PrismaNS } from '@prisma/client';
import type { ComputedHealth } from '../projects.types';
import {
  ProjectsPilotageService,
  derivedProgressPercentFromTasks,
  riskCriticalityForRisk,
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

export type ProjectReviewSnapshotParticipant = {
  userId: string | null;
  displayName: string | null;
  roleLabel: string | null;
  attendanceStatus: ProjectReviewParticipantAttendanceStatus;
};

export type ProjectReviewSnapshotAgendaAction = {
  id: string;
  title: string;
  status: string;
  dueDate: string | null;
  priority: ProjectTaskPriority | null;
  responsibleUserId: string | null;
  responsibleDisplayName: string | null;
  contributors: Array<{
    userId: string | null;
    displayName: string | null;
    roleLabel: string | null;
  }>;
};

export type ProjectReviewSnapshotAgendaDecision = {
  id: string;
  title: string;
  description: string | null;
  decisionType: ProjectReviewDecisionType;
  status: ProjectReviewDecisionStatus;
  impact: string | null;
};

export type ProjectReviewSnapshotAgendaItem = {
  id: string;
  title: string;
  orderIndex: number;
  status: ProjectReviewAgendaItemStatus;
  notes: string | null;
  decisionSummary: string | null;
  decisions: ProjectReviewSnapshotAgendaDecision[];
  actionItems: ProjectReviewSnapshotAgendaAction[];
};

export type ProjectReviewSnapshotAttachment = {
  title: string;
  attachmentType: ProjectReviewAttachmentType;
  agendaItemTitle: string | null;
};

export type ProjectReviewSnapshotBudgetLine = {
  budgetLineId: string;
  label: string;
  allocationType: string;
  percentage: string | null;
  amount: string | null;
};

export type ProjectReviewSnapshotPayload = {
  schemaVersion: 2;
  review: {
    type: ProjectReviewType;
    title: string | null;
    objective: string | null;
    periodStart: string | null;
    periodEnd: string | null;
    reviewDate: string | null;
    durationMinutes: number | null;
    facilitatorDisplayName: string | null;
    /** Météo du comité (contentPayload.committeeMood), figée à la finalisation. */
    committeeMood: ComputedHealth | null;
  };
  project: {
    id: string;
    name: string;
    status: string;
    health: ComputedHealth;
    priority: string;
  };
  meeting: {
    meetingMode: ProjectReviewMeetingMode | null;
    location: string | null;
  };
  participants: ProjectReviewSnapshotParticipant[];
  agenda: ProjectReviewSnapshotAgendaItem[];
  attachments: ProjectReviewSnapshotAttachment[];
  decisions: Array<{
    id: string;
    title: string;
    decisionType: ProjectReviewDecisionType;
    status: ProjectReviewDecisionStatus;
    impact: string | null;
    agendaItemTitle: string | null;
  }>;
  actions: Array<{
    id: string;
    title: string;
    responsibleDisplayName: string | null;
    contributors: Array<{ displayName: string | null; roleLabel: string | null }>;
    dueDate: string | null;
    priority: ProjectTaskPriority | null;
  }>;
  untreatedAgendaItems: Array<{ id: string; title: string; status: string }>;
  nextSteps: string | null;
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
    monitored: number;
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

export function parseCommitteeMood(
  contentPayload: unknown,
): ComputedHealth | null {
  if (!contentPayload || typeof contentPayload !== 'object' || Array.isArray(contentPayload)) {
    return null;
  }
  const value = (contentPayload as Record<string, unknown>).committeeMood;
  if (value === 'GREEN' || value === 'ORANGE' || value === 'RED') {
    return value;
  }
  return null;
}

export function buildProjectReviewSnapshotPayload(input: {
  review: Pick<
    ProjectReview,
    | 'reviewType'
    | 'title'
    | 'objective'
    | 'executiveSummary'
    | 'periodStart'
    | 'periodEnd'
    | 'reviewDate'
    | 'durationMinutes'
    | 'nextReviewDate'
    | 'contentPayload'
  >;
  facilitatorDisplayName: string | null;
  attachments: ProjectReviewAttachment[];
  standaloneDecisions: ProjectReviewDecision[];
  standaloneActions: Array<{
    id: string;
    title: string;
    dueDate: Date | null;
    priority: ProjectTaskPriority | null;
    responsibleDisplayName: string | null;
    contributors: Array<{ displayName: string | null; roleLabel: string | null }>;
  }>;
  agendaTitleById: Map<string, string>;
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
  meeting: {
    meetingMode: ProjectReviewMeetingMode | null;
    location: string | null;
  };
  participants: ProjectReviewSnapshotParticipant[];
  agenda: ProjectReviewSnapshotAgendaItem[];
}): Prisma.InputJsonValue {
  const {
    review,
    facilitatorDisplayName,
    attachments,
    standaloneDecisions,
    standaloneActions,
    agendaTitleById,
    project,
    tasks,
    risks,
    milestones,
    budgetLinks,
    pilotage,
    meeting,
    participants,
    agenda,
  } = input;

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
    (a, b) => b.criticalityScore - a.criticalityScore,
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

  const untreatedAgendaItems = agenda
    .filter((item) => item.status === 'SKIPPED' || item.status === 'TODO')
    .map((item) => ({
      id: item.id,
      title: item.title,
      status: item.status,
    }));

  const snapshotAttachments: ProjectReviewSnapshotAttachment[] = (
    attachments ?? []
  ).map(
    (a) => ({
      title: a.title,
      attachmentType: a.attachmentType,
      agendaItemTitle: a.agendaItemId
        ? (agendaTitleById.get(a.agendaItemId) ?? null)
        : null,
    }),
  );

  const snapshotDecisions = standaloneDecisions.map((d) => ({
    id: d.id,
    title: d.title,
    decisionType: d.decisionType,
    status: d.status,
    impact: d.impact,
    agendaItemTitle: d.agendaItemId
      ? (agendaTitleById.get(d.agendaItemId) ?? null)
      : null,
  }));

  const snapshotActions = standaloneActions.map((a) => ({
    id: a.id,
    title: a.title,
    responsibleDisplayName: a.responsibleDisplayName,
    contributors: a.contributors,
    dueDate: a.dueDate?.toISOString() ?? null,
    priority: a.priority,
  }));

  const payload: ProjectReviewSnapshotPayload = {
    schemaVersion: 2,
    review: {
      type: review.reviewType,
      title: review.title,
      objective: review.objective ?? review.executiveSummary ?? null,
      periodStart: review.periodStart?.toISOString() ?? null,
      periodEnd: review.periodEnd?.toISOString() ?? null,
      reviewDate: review.reviewDate?.toISOString() ?? null,
      durationMinutes: review.durationMinutes ?? null,
      facilitatorDisplayName,
      committeeMood: parseCommitteeMood(review.contentPayload),
    },
    project: {
      id: project.id,
      name: project.name,
      status: project.status,
      health,
      priority: project.priority,
    },
    meeting: {
      meetingMode: meeting.meetingMode,
      location: meeting.location,
    },
    participants,
    agenda,
    attachments: snapshotAttachments,
    decisions: snapshotDecisions,
    actions: snapshotActions,
    untreatedAgendaItems,
    nextSteps: review.nextReviewDate?.toISOString() ?? null,
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
      monitored: risks.filter((r) => r.status === 'MONITORED').length,
      topRisks,
    },
    milestones: upcoming,
    budget,
    generatedAt: new Date().toISOString(),
  };

  return JSON.parse(JSON.stringify(payload)) as Prisma.InputJsonValue;
}

/** Assert snapshot v2 contains no sensitive URLs (for tests). */
export function snapshotContainsSensitiveUrls(payload: unknown): boolean {
  const json = JSON.stringify(payload);
  return (
    json.includes('meetingUrl') ||
    json.includes('externalEmail') ||
    json.includes('"url"')
  );
}
