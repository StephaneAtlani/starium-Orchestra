import { BadRequestException } from '@nestjs/common';
import {
  BudgetLineStatus,
  BudgetStatus,
  OrgOwnershipPolicyMode,
  ProjectStatus,
  StrategicObjectiveLifecycleStatus,
  SupplierContractStatus,
  SupplierStatus,
} from '@prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import { assertOrgUnitInClient, resolveEffectiveOwnerOrgUnitId } from './org-unit-ownership.helpers';

export type OwnershipObligationPhase = 'create' | 'activate';

const PROJECT_ACTIVE_STATUSES: ProjectStatus[] = [
  ProjectStatus.PLANNED,
  ProjectStatus.IN_PROGRESS,
  ProjectStatus.ON_HOLD,
  ProjectStatus.COMPLETED,
];

export function isProjectActivationStatus(status: ProjectStatus): boolean {
  return PROJECT_ACTIVE_STATUSES.includes(status);
}

export function isBudgetActivationStatus(status: BudgetStatus): boolean {
  return status !== BudgetStatus.DRAFT;
}

export function isBudgetLineActivationStatus(status: BudgetLineStatus): boolean {
  return status !== BudgetLineStatus.DRAFT;
}

export function isSupplierActivationStatus(status: SupplierStatus): boolean {
  return status === SupplierStatus.ACTIVE;
}

export function isContractActivationStatus(status: SupplierContractStatus): boolean {
  return (
    status !== SupplierContractStatus.TERMINATED &&
    status !== SupplierContractStatus.EXPIRED
  );
}

export function isStrategicObjectiveActivationLifecycle(
  lifecycleStatus: StrategicObjectiveLifecycleStatus,
): boolean {
  return lifecycleStatus === StrategicObjectiveLifecycleStatus.ACTIVE;
}

export function requiresOwnerOnCreate(mode: OrgOwnershipPolicyMode): boolean {
  return mode === OrgOwnershipPolicyMode.REQUIRED_ON_CREATE;
}

export function requiresOwnerOnActivate(mode: OrgOwnershipPolicyMode): boolean {
  return mode === OrgOwnershipPolicyMode.REQUIRED_ON_ACTIVATE;
}

export async function assertOwnerOrgUnitIfRequired(
  prisma: PrismaService,
  params: {
    clientId: string;
    enforcementEnabled: boolean;
    phase: OwnershipObligationPhase;
    mode: OrgOwnershipPolicyMode;
    effectiveOwnerOrgUnitId: string | null | undefined;
  },
): Promise<void> {
  if (!params.enforcementEnabled) return;

  const mustCheck =
    params.phase === 'create'
      ? requiresOwnerOnCreate(params.mode)
      : requiresOwnerOnActivate(params.mode);

  if (!mustCheck) return;

  const effective = params.effectiveOwnerOrgUnitId?.trim() || null;
  if (!effective) {
    throw new BadRequestException(
      'Une Direction propriétaire est obligatoire pour ce client (politique ownership).',
    );
  }

  await assertOrgUnitInClient(prisma, params.clientId, effective);
}

/** Owner effectif BudgetLine pour obligation (override ou budget parent). */
export function resolveBudgetLineEffectiveOwnerForObligation(
  lineOwnerOrgUnitId: string | null | undefined,
  budgetOwnerOrgUnitId: string | null | undefined,
): string | null {
  return resolveEffectiveOwnerOrgUnitId(lineOwnerOrgUnitId, budgetOwnerOrgUnitId);
}
