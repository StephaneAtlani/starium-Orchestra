/**
 * Réponses API versioning (alignées backend budget-versioning.types).
 */

import type { BudgetVersionSummaryDto } from './budget-version-history.types';

export interface VersionSetListItemDto {
  id: string;
  clientId: string;
  exerciseId: string;
  code: string;
  name: string;
  description: string | null;
  baselineBudgetId: string | null;
  activeBudgetId: string | null;
  createdAt: string;
}

export interface VersionSetDetailDto extends VersionSetListItemDto {
  baseline: BudgetVersionSummaryDto | null;
  active: BudgetVersionSummaryDto | null;
  versions: BudgetVersionSummaryDto[];
}

export interface CreateBaselineResponseDto {
  versionSetId: string;
  budgetId: string;
  versionNumber: number;
  versionLabel: string;
  versionKind: string;
  versionStatus: string;
}

export interface CreateRevisionResponseDto {
  versionSetId: string;
  budgetId: string;
  versionNumber: number;
  versionLabel: string;
  versionKind: string;
  versionStatus: string;
  parentBudgetId: string;
}

export interface ActivateVersionResponseDto {
  budgetId: string;
  versionStatus: string;
}

/** Phases pour POST …/versioning/cycle-revision (T1/T2 uniquement). */
export type CycleRevisionPhase = 'T1' | 'T2';

export interface CreateCycleRevisionResponseDto extends CreateRevisionResponseDto {}

export interface CloseCycleRequestDto {
  createSnapshot?: boolean;
  snapshotName?: string;
}

export interface CloseCycleResponseDto {
  versionSetId: string;
  budgetId: string;
  snapshotId?: string;
  versionNumber: number;
  versionLabel: string;
}
