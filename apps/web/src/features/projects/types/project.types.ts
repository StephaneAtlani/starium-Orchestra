/** Réponse GET /api/projects/assignable-users */
export type ProjectAssignableUser = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  status: string;
};

export type ComputedHealth = 'GREEN' | 'ORANGE' | 'RED';

export type ProjectSignals = {
  isLate: boolean;
  isBlocked: boolean;
  hasNoOwner: boolean;
  hasNoTasks: boolean;
  hasNoRisks: boolean;
  hasNoMilestones: boolean;
  hasPlanningDrift: boolean;
  isCritical: boolean;
};

export type ProjectListItem = {
  id: string;
  code: string;
  name: string;
  /** `PROJECT` | `ACTIVITY` */
  kind: string;
  type: string;
  status: string;
  priority: string;
  criticality: string;
  progressPercent: number | null;
  derivedProgressPercent: number | null;
  computedHealth: ComputedHealth;
  targetEndDate: string | null;
  ownerUserId: string | null;
  ownerDisplayName: string | null;
  openTasksCount: number;
  openRisksCount: number;
  delayedMilestonesCount: number;
  signals: ProjectSignals;
  warnings: string[];
};

export type ProjectsListResponse = {
  items: ProjectListItem[];
  total: number;
  page: number;
  limit: number;
};

export type ProjectsPortfolioSummary = {
  totalProjects: number;
  inProgressProjects: number;
  completedProjects: number;
  lateProjects: number;
  criticalProjects: number;
  blockedProjects: number;
  noRiskProjects: number;
  noOwnerProjects: number;
  noMilestoneProjects: number;
};

export type ProjectDetail = ProjectListItem & {
  description: string | null;
  sponsorUserId: string | null;
  startDate: string | null;
  actualEndDate: string | null;
  targetBudgetAmount: string | null;
  pilotNotes: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Réponses API Prisma (dates ISO). */
export type ProjectTaskApi = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  completedAt: string | null;
  sortOrder: number;
  assigneeUserId: string | null;
};

export type ProjectRiskApi = {
  id: string;
  title: string;
  description: string | null;
  probability: string;
  impact: string;
  status: string;
  reviewDate: string | null;
  actionPlan: string | null;
  ownerUserId: string | null;
};

export type ProjectMilestoneApi = {
  id: string;
  name: string;
  targetDate: string;
  actualDate: string | null;
  status: string;
};
