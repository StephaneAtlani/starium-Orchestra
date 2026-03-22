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

/** POST /projects/:id/milestones/retroplan-macro */
export type RetroplanMacroStepInput = {
  name: string;
  daysBeforeEnd: number;
};

export type CreateRetroplanMacroPayload = {
  anchorEndDate: string;
  steps: RetroplanMacroStepInput[];
};

/** RFC-PROJ-010 — liaisons budget */
export type ProjectBudgetAllocationType = 'FULL' | 'PERCENTAGE' | 'FIXED';

export type ProjectBudgetLinkItem = {
  id: string;
  projectId: string;
  budgetLineId: string;
  allocationType: ProjectBudgetAllocationType;
  percentage: string | null;
  amount: string | null;
  createdAt: string;
  budgetLine: {
    id: string;
    code: string;
    name: string;
    budgetId: string;
    envelopeId: string;
    status: string;
  };
};

export type ProjectBudgetLinksPage = {
  items: ProjectBudgetLinkItem[];
  total: number;
  limit: number;
  offset: number;
};

export type CreateProjectBudgetLinkPayload = {
  budgetLineId: string;
  allocationType: ProjectBudgetAllocationType;
  percentage?: number;
  amount?: number;
};

export type UpdateProjectBudgetLinkPayload = {
  budgetLineId?: string;
  allocationType?: ProjectBudgetAllocationType;
  percentage?: number;
  amount?: number;
};

/** RFC-PROJ-012 — fiche projet décisionnelle */
export type ProjectArbitrationStatus =
  | 'DRAFT'
  | 'TO_REVIEW'
  | 'VALIDATED'
  | 'REJECTED';

/** Statut par niveau d’arbitrage (Métier → Comité → Sponsor/CODIR). */
export type ProjectArbitrationLevelStatus =
  | 'BROUILLON'
  | 'EN_COURS'
  | 'SOUMIS_VALIDATION'
  | 'VALIDE'
  | 'REFUSE';

/** Recommandation saisie par le COPIL / COPRO (RFC-PROJ-012) */
export type ProjectCopilRecommendation =
  | 'NOT_SET'
  | 'POURSUIVRE'
  | 'NE_PAS_ENGAGER'
  | 'SOUS_RESERVE'
  | 'REPORTER'
  | 'AJUSTER_CADRAGE';

export type ProjectTeamRoleSystemKind = 'SPONSOR' | 'OWNER';

export type ProjectTeamRoleApi = {
  id: string;
  clientId: string;
  name: string;
  sortOrder: number;
  systemKind: ProjectTeamRoleSystemKind | null;
};

export type ProjectTeamMemberKind = 'USER' | 'NAMED';

export type ProjectTeamMemberAffiliationApi = 'INTERNAL' | 'EXTERNAL';

export type ProjectTeamMemberApi = {
  id: string;
  projectId: string;
  roleId: string;
  roleName: string;
  systemKind: ProjectTeamRoleSystemKind | null;
  memberKind: ProjectTeamMemberKind;
  userId: string | null;
  displayName: string;
  email: string;
  affiliation: ProjectTeamMemberAffiliationApi | null;
};

export type ProjectSheetRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export type TowsActionsPayload = {
  SO?: string[];
  ST?: string[];
  WO?: string[];
  WT?: string[];
};

export type ProjectSheet = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  cadreLocation: string | null;
  cadreQui: string | null;
  /** Équipes / directions impliquées (texte libre) */
  involvedTeams: string | null;
  startDate: string | null;
  targetEndDate: string | null;
  kind: string;
  type: string;
  status: string;
  priority: string;
  /** Criticité (impact / enjeu) */
  criticality: string;
  targetBudgetAmount: number | null;
  businessValueScore: number | null;
  strategicAlignment: number | null;
  urgencyScore: number | null;
  estimatedCost: number | null;
  estimatedGain: number | null;
  roi: number | null;
  riskLevel: ProjectSheetRiskLevel | null;
  /** Réponse au risque (mitigation, plan d’action) */
  riskResponse: string | null;
  priorityScore: number | null;
  arbitrationStatus: ProjectArbitrationStatus | null;
  arbitrationMetierStatus: ProjectArbitrationLevelStatus;
  arbitrationComiteStatus: ProjectArbitrationLevelStatus | null;
  arbitrationCodirStatus: ProjectArbitrationLevelStatus | null;
  /** Motif si statut « Refusé » — Métier */
  arbitrationMetierRefusalNote: string | null;
  arbitrationComiteRefusalNote: string | null;
  arbitrationCodirRefusalNote: string | null;
  copilRecommendation: ProjectCopilRecommendation;
  /** Commentaire libre lié à la position COPIL */
  copilRecommendationNote: string | null;
  businessProblem: string | null;
  businessBenefits: string | null;
  businessSuccessKpis: string[];
  swotStrengths: string[];
  swotWeaknesses: string[];
  swotOpportunities: string[];
  swotThreats: string[];
  towsActions: {
    SO: string[];
    ST: string[];
    WO: string[];
    WT: string[];
  } | null;
};

export type UpdateProjectSheetPayload = {
  name?: string;
  cadreLocation?: string | null;
  cadreQui?: string | null;
  involvedTeams?: string | null;
  startDate?: string | null;
  targetEndDate?: string | null;
  description?: string;
  businessValueScore?: number;
  strategicAlignment?: number;
  urgencyScore?: number;
  estimatedCost?: number;
  estimatedGain?: number;
  riskLevel?: ProjectSheetRiskLevel;
  riskResponse?: string | null;
  /** Priorité portefeuille (LOW | MEDIUM | HIGH) */
  priority?: string;
  /** Criticité projet */
  criticality?: string;
  /** Typologie (TRANSFORMATION, INFRASTRUCTURE, …) */
  type?: string;
  /** Cycle de vie (DRAFT, IN_PROGRESS, …) */
  status?: string;
  copilRecommendation?: ProjectCopilRecommendation;
  copilRecommendationNote?: string | null;
  arbitrationMetierStatus?: ProjectArbitrationLevelStatus;
  arbitrationComiteStatus?: ProjectArbitrationLevelStatus | null;
  arbitrationCodirStatus?: ProjectArbitrationLevelStatus | null;
  arbitrationMetierRefusalNote?: string | null;
  arbitrationComiteRefusalNote?: string | null;
  arbitrationCodirRefusalNote?: string | null;
  businessProblem?: string;
  businessBenefits?: string;
  businessSuccessKpis?: string[];
  swotStrengths?: string[];
  swotWeaknesses?: string[];
  swotOpportunities?: string[];
  swotThreats?: string[];
  towsActions?: TowsActionsPayload;
  /** Si true et passage d’un niveau d’arbitrage à VALIDE, créer un snapshot par niveau. */
  recordDecisionSnapshot?: boolean;
};

/** Métadonnée liste — historique des décisions (snapshots fiche). */
export type ProjectSheetDecisionSnapshotListItem = {
  id: string;
  projectId: string;
  clientId: string;
  createdAt: string;
  createdByUserId: string | null;
  /** Prénom + nom, ou email (aligné API). */
  createdByDisplayName: string | null;
  decisionLevel: string;
};

export type ProjectSheetDecisionSnapshotListResponse = {
  items: ProjectSheetDecisionSnapshotListItem[];
  total: number;
  limit: number;
  offset: number;
};

export type ProjectSheetDecisionSnapshotDetail = ProjectSheetDecisionSnapshotListItem & {
  sheetPayload: Record<string, unknown>;
};
