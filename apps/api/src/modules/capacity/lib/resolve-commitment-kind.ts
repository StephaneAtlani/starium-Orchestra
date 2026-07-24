import {
  ActionPlanStatus,
  CapacityAllocationSourceType,
  ProjectRiskStatus,
  ProjectStatus,
} from '@prisma/client';
import { assertNever } from './assert-never';

export type CapacityCommitmentKind = 'FORECAST' | 'COMMITTED' | 'EXCLUDED';

function resolveProjectStatus(status: ProjectStatus): CapacityCommitmentKind {
  switch (status) {
    case ProjectStatus.DRAFT:
    case ProjectStatus.PLANNED:
    case ProjectStatus.ON_HOLD:
      return 'FORECAST';
    case ProjectStatus.IN_PROGRESS:
      return 'COMMITTED';
    case ProjectStatus.COMPLETED:
    case ProjectStatus.CANCELLED:
    case ProjectStatus.ARCHIVED:
      return 'EXCLUDED';
    default:
      return assertNever(status);
  }
}

function resolveProjectRiskStatus(
  status: ProjectRiskStatus,
): CapacityCommitmentKind {
  switch (status) {
    case ProjectRiskStatus.OPEN:
    case ProjectRiskStatus.MONITORED:
      return 'COMMITTED';
    case ProjectRiskStatus.MITIGATED:
    case ProjectRiskStatus.CLOSED:
      return 'EXCLUDED';
    default:
      return assertNever(status);
  }
}

function resolveActionPlanStatus(
  status: ActionPlanStatus,
): CapacityCommitmentKind {
  switch (status) {
    case ActionPlanStatus.DRAFT:
    case ActionPlanStatus.ON_HOLD:
      return 'FORECAST';
    case ActionPlanStatus.ACTIVE:
      return 'COMMITTED';
    case ActionPlanStatus.COMPLETED:
    case ActionPlanStatus.CANCELLED:
      return 'EXCLUDED';
    default:
      return assertNever(status);
  }
}

/**
 * Dérivation pure (non persistée) — RFC-CAPA-001.
 * `sourceStatus` requis pour sources métier ; ignoré pour MANUAL.
 */
export function resolveCommitmentKind(
  sourceType: CapacityAllocationSourceType,
  sourceStatus:
    | ProjectStatus
    | ProjectRiskStatus
    | ActionPlanStatus
    | null,
): CapacityCommitmentKind {
  switch (sourceType) {
    case CapacityAllocationSourceType.MANUAL:
      return 'FORECAST';
    case CapacityAllocationSourceType.PROJECT:
      if (sourceStatus == null) {
        throw new Error('PROJECT status required');
      }
      return resolveProjectStatus(sourceStatus as ProjectStatus);
    case CapacityAllocationSourceType.PROJECT_RISK:
      if (sourceStatus == null) {
        throw new Error('PROJECT_RISK status required');
      }
      return resolveProjectRiskStatus(sourceStatus as ProjectRiskStatus);
    case CapacityAllocationSourceType.ACTION_PLAN:
      if (sourceStatus == null) {
        throw new Error('ACTION_PLAN status required');
      }
      return resolveActionPlanStatus(sourceStatus as ActionPlanStatus);
    default:
      return assertNever(sourceType);
  }
}
