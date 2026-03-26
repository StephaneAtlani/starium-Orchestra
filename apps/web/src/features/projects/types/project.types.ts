/** Réponse GET /api/projects/assignable-users */
export type ProjectAssignableUser = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  status: string;
};

/** Personnes nom libre déjà vues en équipe projet (GET /api/projects/assignable-users → freePersons). */
export type ProjectFreePerson = {
  label: string;
  affiliation: 'INTERNAL' | 'EXTERNAL';
  identityKey: string;
};

/** Réponse GET /api/projects/assignable-users (objet ; rétrocompat tableau = users seuls). */
export type AssignableUsersResponse = {
  users: ProjectAssignableUser[];
  freePersons: ProjectFreePerson[];
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
  myRole?: string | null;
  myRoles?: string[];
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
  tags: ProjectTag[];
  portfolioCategory: ProjectPortfolioCategoryAssignment | null;
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

export type ProjectTag = {
  id: string;
  name: string;
  color: string | null;
};

export type ProjectPortfolioCategoryNode = {
  id: string;
  clientId: string;
  parentId: string | null;
  name: string;
  slug: string | null;
  color: string | null;
  icon: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  children?: ProjectPortfolioCategoryNode[];
  parent?: { id: string; name: string } | null;
};

export type ProjectPortfolioCategoryAssignment = {
  id: string;
  name: string;
  parentId: string | null;
  parentName: string | null;
};

/** Liste paginée RFC-PROJ-011 */
export type PaginatedList<T> = {
  items: T[];
  total: number;
  limit: number;
  offset: number;
};

/** Élément de liste de contrôle (sync Microsoft Planner checklist). */
export type ProjectTaskChecklistItemApi = {
  id: string;
  title: string;
  isChecked: boolean;
  sortOrder: number;
};

export type ProjectTaskLabelApi = {
  id: string;
  name: string;
  color: string | null;
  plannerCategoryId: string | null;
};

export type ProjectTaskPhaseApi = {
  id: string;
  clientId: string;
  projectId: string;
  name: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

/** Option UI formulaire tâche (étiquettes). */
export type TaskLabelOption = {
  id: string;
  label: string;
  color?: string | null;
  plannerCategoryId?: string | null;
};

export type ProjectMilestoneLabelApi = {
  id: string;
  name: string;
  color: string | null;
};

/** Réponses API Prisma (dates ISO). RFC-PROJ-011 */
export type ProjectTaskApi = {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  status: string;
  priority: string;
  progress: number;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  actualStartDate: string | null;
  actualEndDate: string | null;
  sortOrder: number;
  phaseId: string | null;
  dependsOnTaskId: string | null;
  dependencyType: string | null;
  ownerUserId: string | null;
  budgetLineId: string | null;
  bucketId?: string | null;
  checklistItems?: ProjectTaskChecklistItemApi[];
  taskLabelIds?: string[];
  /** Présent sur les réponses API liste ; utilisé pour tri client (RFC-PROJ-012). */
  createdAt?: string;
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
  code: string | null;
  description: string | null;
  targetDate: string;
  achievedDate: string | null;
  status: string;
  linkedTaskId: string | null;
  ownerUserId: string | null;
  sortOrder: number;
  milestoneLabelIds?: string[];
};

export type ProjectDocumentStorageType = 'STARIUM' | 'EXTERNAL' | 'MICROSOFT';
export type ProjectDocumentStatus = 'ACTIVE' | 'ARCHIVED' | 'DELETED';
export type ProjectDocumentCategory =
  | 'GENERAL'
  | 'CONTRACT'
  | 'SPECIFICATION'
  | 'DELIVERABLE'
  | 'REPORT'
  | 'FINANCIAL'
  | 'COMPLIANCE'
  | 'OTHER';

export type ProjectDocumentApi = {
  id: string;
  clientId: string;
  projectId: string;
  name: string;
  originalFilename: string | null;
  mimeType: string | null;
  extension: string | null;
  sizeBytes: number | null;
  category: ProjectDocumentCategory;
  status: ProjectDocumentStatus;
  storageType: ProjectDocumentStorageType;
  storageKey: string | null;
  externalUrl: string | null;
  description: string | null;
  tags: string[] | null;
  uploadedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  deletedAt: string | null;
};

/** RFC-PROJ-011 — activité (hors Gantt) */
export type ProjectActivityApi = {
  id: string;
  clientId: string;
  projectId: string;
  sourceTaskId: string;
  name: string;
  description: string | null;
  status: string;
  frequency: string;
  customRrule: string | null;
  nextExecutionDate: string | null;
  lastExecutionDate: string | null;
  ownerUserId: string | null;
  budgetLineId: string | null;
  createdAt: string;
  updatedAt: string;
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
    /** Agrégats ligne (Financial Core) — montants sur toute la ligne budgétaire. */
    committedAmount?: number;
    consumedAmount?: number;
    expenseType?: string;
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

/** RFC-PROJ-013 — points projet */
export type ProjectReviewType =
  | 'COPIL'
  | 'COPRO'
  | 'CODIR_REVIEW'
  | 'RISK_REVIEW'
  | 'MILESTONE_REVIEW'
  | 'AD_HOC';

export type ProjectReviewStatus = 'DRAFT' | 'FINALIZED' | 'CANCELLED';

export type ProjectReviewListItem = {
  id: string;
  clientId: string;
  projectId: string;
  reviewDate: string;
  reviewType: ProjectReviewType;
  status: ProjectReviewStatus;
  title: string | null;
  executiveSummary: string | null;
  facilitatorUserId: string | null;
  nextReviewDate: string | null;
  finalizedAt: string | null;
  finalizedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  participantsCount: number;
  decisionsCount: number;
  actionItemsCount: number;
};

export type ProjectReviewListResponse = {
  items: ProjectReviewListItem[];
};

export type ProjectReviewParticipantApi = {
  id: string;
  userId: string | null;
  displayName: string | null;
  attended: boolean;
  isRequired: boolean;
};

export type ProjectReviewDecisionApi = {
  id: string;
  title: string;
  description: string | null;
  createdAt: string;
};

export type ProjectReviewActionItemApi = {
  id: string;
  title: string;
  status: string;
  dueDate: string | null;
  linkedTaskId: string | null;
};

export type ProjectReviewDetail = {
  id: string;
  clientId: string;
  projectId: string;
  reviewDate: string;
  reviewType: ProjectReviewType;
  status: ProjectReviewStatus;
  title: string | null;
  executiveSummary: string | null;
  contentPayload: unknown;
  facilitatorUserId: string | null;
  nextReviewDate: string | null;
  finalizedAt: string | null;
  finalizedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  participants: ProjectReviewParticipantApi[];
  decisions: ProjectReviewDecisionApi[];
  actionItems: ProjectReviewActionItemApi[];
  /** Toujours présent ; `null` si status !== FINALIZED */
  snapshotPayload: Record<string, unknown> | null;
};
