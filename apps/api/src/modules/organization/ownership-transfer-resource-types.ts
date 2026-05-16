import {
  BudgetLineStatus,
  BudgetStatus,
  ProjectStatus,
  StrategicObjectiveLifecycleStatus,
  StrategicObjectiveStatus,
  SupplierContractStatus,
  SupplierStatus,
} from '@prisma/client';
/** Codes API canoniques (alignés diagnostics ACL). */
export const OWNERSHIP_TRANSFER_RESOURCE_TYPES = [
  'PROJECT',
  'BUDGET',
  'BUDGET_LINE',
  'SUPPLIER',
  'CONTRACT',
  'STRATEGIC_OBJECTIVE',
] as const;

export type OwnershipTransferResourceType =
  (typeof OWNERSHIP_TRANSFER_RESOURCE_TYPES)[number];

const PROJECT_TERMINAL: ProjectStatus[] = [ProjectStatus.ARCHIVED, ProjectStatus.CANCELLED];
const BUDGET_LINE_TERMINAL: BudgetLineStatus[] = [BudgetLineStatus.ARCHIVED, BudgetLineStatus.CLOSED];
const CONTRACT_TERMINAL: SupplierContractStatus[] = [
  SupplierContractStatus.TERMINATED,
  SupplierContractStatus.EXPIRED,
];

export function buildOwnershipTransferWhere(
  type: OwnershipTransferResourceType,
  clientId: string,
  fromOrgUnitId: string,
): Record<string, unknown> {
  const base = { clientId, ownerOrgUnitId: fromOrgUnitId };

  switch (type) {
    case 'PROJECT':
      return {
        ...base,
        status: { notIn: PROJECT_TERMINAL },
      };
    case 'BUDGET':
      return {
        ...base,
        status: { not: BudgetStatus.ARCHIVED },
      };
    case 'BUDGET_LINE':
      return {
        ...base,
        status: { notIn: BUDGET_LINE_TERMINAL },
      };
    case 'SUPPLIER':
      return {
        ...base,
        status: { not: SupplierStatus.ARCHIVED },
      };
    case 'CONTRACT':
      return {
        ...base,
        status: { notIn: CONTRACT_TERMINAL },
      };
    case 'STRATEGIC_OBJECTIVE':
      return {
        ...base,
        lifecycleStatus: { not: StrategicObjectiveLifecycleStatus.ARCHIVED },
        status: { not: StrategicObjectiveStatus.ARCHIVED },
      };
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}
