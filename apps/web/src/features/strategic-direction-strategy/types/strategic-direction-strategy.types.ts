export type StrategyOwnAxis = { id: string; name: string; tone: string };
export type StrategyMilestone = { monthOffset: number; label: string };
export type StrategyInitiative = {
  id: string;
  title: string;
  description: string;
  ownerLabel: string;
  budgetCents: number;
  progressPct: number;
  lane: number;
  startMonthOffset: number;
  endMonthOffset: number;
  strategicAxisIds: string[];
  milestones: StrategyMilestone[];
  linkedProjectNames: string[];
};
export type StrategyOutcome = {
  title: string;
  ownerLabel: string;
  target: string;
  current: string;
  unit: string;
  progressPct: number;
};
export type StrategyKpi = { label: string; value: string; detail: string };
export type StrategyRisk = {
  name: string;
  probability: string;
  impact: string;
  ownerLabel: string;
  level: 'danger' | 'warning' | 'info';
  mitigation: string;
};
export type StrategyContentBlock = {
  kind: 'text' | 'image';
  title: string;
  body: string;
  documentId: string | null;
};
export type StrategySchemaNormalized = {
  ownAxes: StrategyOwnAxis[];
  majorInitiatives: StrategyInitiative[];
  expectedOutcomes: StrategyOutcome[];
  kpis: StrategyKpi[];
  risks: StrategyRisk[];
  contentBlocks: StrategyContentBlock[];
  strategicPriorities: Array<{ title: string; description: string }>;
  budgetsByYear: Record<string, number>;
  axisContributions: Record<string, number>;
  horizonStartYear: number;
  horizonYearCount: number;
};

export type StrategicDirectionStrategyStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'ARCHIVED';

export type StrategicDirectionStrategyLinkedAxisDto = {
  id: string;
  name: string;
  orderIndex: number | null;
};

export type StrategicDirectionStrategyLinkedObjectiveDto = {
  id: string;
  title: string;
  status: string;
  axis: { id: string; name: string };
};

export type StrategicDirectionStrategyLinksDto = {
  /** Axes déjà rattachés à la stratégie (liens persistés). */
  axes: StrategicDirectionStrategyLinkedAxisDto[];
  objectives: StrategicDirectionStrategyLinkedObjectiveDto[];
  /** Axes de la vision alignée — catalogue pour sélection chantier / alignement. */
  visionAxes?: StrategicDirectionStrategyLinkedAxisDto[];
};

export type StrategicDirectionStrategyVersionSummaryDto = {
  id: string;
  versionNumber: number;
  versionLabel: string;
  status: StrategicDirectionStrategyStatus;
  title: string | null;
  archivedAt: string | null;
  archivedReason: string | null;
  approvedAt: string | null;
  updatedAt: string;
  isCurrent: boolean;
  reviewNote?: string | null;
  reviewInstanceLabel?: string | null;
  rejectionReason?: string | null;
};

export type StrategicDirectionStrategyVersionsDto = {
  direction: { id: string; code: string; name: string };
  alignedVision: { id: string; title: string; horizonLabel: string; isActive: boolean };
  currentStrategyId: string;
  versions: StrategicDirectionStrategyVersionSummaryDto[];
};

export type StrategicDirectionStrategyFieldDiffDto = {
  field: string;
  label: string;
  left: string;
  right: string;
  changed: boolean;
};

export type StrategicDirectionStrategyCollectionDiffDto = {
  label: string;
  added: string[];
  removed: string[];
  unchanged: string[];
};

export type StrategicDirectionStrategyCompareDto = {
  left: { id: string; versionLabel: string };
  right: { id: string; versionLabel: string };
  fields: StrategicDirectionStrategyFieldDiffDto[];
  collections: StrategicDirectionStrategyCollectionDiffDto[];
  axes: { added: string[]; removed: string[]; unchanged: string[] };
  objectives: { added: string[]; removed: string[]; unchanged: string[] };
  hasChanges: boolean;
};

export type StrategicDirectionStrategyUserSummaryDto = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string;
};

export type StrategicDirectionStrategyWorkflowSettingsResponse = {
  stored: {
    allowSubmitterToSelectValidator: boolean;
    allowSelfValidation: boolean;
    authorizedValidatorUserIds: string[];
    authorizedValidatorRoleIds: string[];
    defaultValidatorUserId: string | null;
  };
  resolved: {
    allowSubmitterToSelectValidator: boolean;
    allowSelfValidation: boolean;
    authorizedValidatorUserIds: string[];
    authorizedValidatorRoleIds: string[];
    defaultValidatorUserId: string | null;
  };
  options: {
    eligibleValidators: StrategicDirectionStrategyUserSummaryDto[];
    potentialValidators: StrategicDirectionStrategyUserSummaryDto[];
  };
};

export type StrategicDirectionStrategyDto = {
  id: string;
  clientId: string;
  directionId: string;
  alignedVisionId: string;
  title: string | null;
  ambition: string | null;
  context: string | null;
  statement: string;
  strategicPriorities: Array<Record<string, unknown>> | null;
  expectedOutcomes: Array<Record<string, unknown>> | null;
  kpis: Array<Record<string, unknown>> | null;
  majorInitiatives: Array<Record<string, unknown>> | null;
  risks: Array<Record<string, unknown>> | null;
  ownAxes?: Array<Record<string, unknown>> | null;
  horizonStartYear?: number | null;
  horizonYearCount?: number | null;
  budgetsByYear?: Record<string, number> | null;
  axisContributions?: Record<string, number> | null;
  contentBlocks?: Array<Record<string, unknown>> | null;
  schema?: StrategySchemaNormalized;
  horizonLabel: string;
  ownerLabel: string | null;
  status: StrategicDirectionStrategyStatus;
  submittedAt: string | null;
  submittedByUserId: string | null;
  validatorUserId: string | null;
  validatorSummary: StrategicDirectionStrategyUserSummaryDto | null;
  approvedAt: string | null;
  approvedByUserId: string | null;
  rejectionReason: string | null;
  reviewNote?: string | null;
  reviewInstanceLabel?: string | null;
  archivedReason?: string | null;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  direction?: {
    id: string;
    code: string;
    name: string;
    description?: string | null;
    accentTone?: string | null;
    parentLabel?: string | null;
    sponsorResourceId?: string | null;
    fteCount?: number | null;
    operatingBudgetCents?: number | null;
    sponsorLabel?: string | null;
  };
  alignedVision?: {
    id: string;
    title: string;
    horizonLabel: string;
    isActive: boolean;
  };
  isSponsor?: boolean;
  canCreateStrategy?: boolean;
  canUpdateStrategy?: boolean;
  canEditContent?: boolean;
  canSubmit?: boolean;
  canAdaptVersion?: boolean;
  canArchive?: boolean;
};

export type StrategicDirectionPortfolioCardDto = {
  directionId: string;
  code: string;
  name: string;
  description: string | null;
  accentTone: string | null;
  parentLabel: string | null;
  sponsorLabel: string | null;
  fteCount: number | null;
  operatingBudgetCents: number | null;
  strategyId: string | null;
  needsStrategy: boolean;
  status: StrategicDirectionStrategyStatus | null;
  versionLabel: string | null;
  horizonLabel: string | null;
  ambition: string | null;
  context: string | null;
  score: number | null;
  initiativesCount: number;
  initiativesDone: number;
  lastReviewAt: string | null;
  sponsorResourceId?: string | null;
  isSponsor?: boolean;
  canCreateStrategy?: boolean;
  canUpdateStrategy?: boolean;
  canEditContent?: boolean;
  canSubmit?: boolean;
  canAdaptVersion?: boolean;
  canArchive?: boolean;
};

export type SchemaMetricsDto = {
  score: number;
  maturity: {
    Ambition: number;
    Objectifs: number;
    Chantiers: number;
    Budget: number;
    Risques: number;
    Revue: number;
  };
  alerts: Array<{ level: 'danger' | 'warning' | 'info'; title: string; detail: string }>;
};

export type ConsolidationDto = {
  alignedVisionId: string | null;
  horizonStartYear: number;
  horizonYearCount: number;
  nowMonthOffset: number;
  visionAxes: Array<{ id: string; name: string }>;
  kpis: {
    directionsCount: number;
    approvedCount: number;
    initiativesCount: number;
    initiativesInProgress: number;
    budgetHorizonCents: number;
    budgetHorizonLabel: string;
    averageAlignmentScore: number | null;
    overlapsCount: number;
  };
  matrix: Array<{
    directionId: string;
    strategyId: string;
    directionCode: string;
    directionName: string;
    accentTone: string | null;
    sponsorLabel: string | null;
    score: number;
    status: StrategicDirectionStrategyStatus;
    ambition: string | null;
    horizonLabel: string | null;
    fteCount: number | null;
    operatingBudgetCents: number | null;
    budgetSchemaCents: number;
    ownAxesCount: number;
    outcomesCount: number;
    risksCount: number;
    initiativesCount: number;
    initiativesProgressAvg: number;
    lastReviewAt: string | null;
    cells: Array<{
      axisId: string;
      axisName: string;
      contributionPct: number;
      initiativesCount: number;
    }>;
  }>;
  maturity: Array<{
    directionId: string;
    strategyId: string;
    directionCode: string;
    directionName: string;
    accentTone: string | null;
    maturity: SchemaMetricsDto['maturity'];
  }>;
  timeline: Array<{
    directionId: string;
    strategyId: string;
    directionCode: string;
    directionName: string;
    accentTone: string | null;
    initiatives: StrategyInitiative[];
  }>;
  portfolioInitiatives: Array<{
    directionId: string;
    strategyId: string | null;
    directionCode: string;
    directionName: string;
    accentTone: string | null;
    initiative: StrategyInitiative;
    axisNames: string[];
  }>;
  overlaps: Array<{
    severity: 'high' | 'mid' | 'low';
    shared: string[];
    overlapMonths: number;
    a: {
      directionId: string;
      directionCode: string;
      strategyId: string | null;
      initiative: StrategyInitiative;
    };
    b: {
      directionId: string;
      directionCode: string;
      strategyId: string | null;
      initiative: StrategyInitiative;
    };
  }>;
};
