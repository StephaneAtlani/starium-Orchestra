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
  /** Statut métier objectif (enum Prisma côté API). */
  status: string;
  axis: { id: string; name: string };
};

export type StrategicDirectionStrategyLinksDto = {
  axes: StrategicDirectionStrategyLinkedAxisDto[];
  objectives: StrategicDirectionStrategyLinkedObjectiveDto[];
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
    authorizedValidatorUserIds: string[];
    authorizedValidatorRoleIds: string[];
    defaultValidatorUserId: string | null;
  };
  resolved: {
    allowSubmitterToSelectValidator: boolean;
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
  archivedReason?: string | null;
  /** Présent après archivage (`status === 'ARCHIVED'`). */
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  /** Présent quand l’API inclut la relation ; sinon résoudre via `directionId` + options directions. */
  direction?: {
    id: string;
    code: string;
    name: string;
  };
  /** Présent quand l’API inclut la relation ; sinon résoudre via `alignedVisionId` + options visions. */
  alignedVision?: {
    id: string;
    title: string;
    horizonLabel: string;
    isActive: boolean;
  };
};
