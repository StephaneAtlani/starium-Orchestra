import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  BudgetLineStatus,
  BudgetStatus,
  OrgUnitStatus,
  OrgUnitType,
  ProjectStatus,
  StrategicObjectiveLifecycleStatus,
  StrategicObjectiveStatus,
  SupplierContractStatus,
  SupplierStatus,
} from '@prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import type { OwnerOrgUnitSummaryDto, OwnerOrgUnitSource } from './org-unit-ownership.types';

const PROJECT_TERMINAL: ProjectStatus[] = [ProjectStatus.ARCHIVED, ProjectStatus.CANCELLED];
const BUDGET_LINE_TERMINAL: BudgetLineStatus[] = [BudgetLineStatus.ARCHIVED, BudgetLineStatus.CLOSED];
const CONTRACT_TERMINAL: SupplierContractStatus[] = [
  SupplierContractStatus.TERMINATED,
  SupplierContractStatus.EXPIRED,
];

export async function assertOrgUnitInClient(
  prisma: PrismaService,
  clientId: string,
  orgUnitId: string,
): Promise<{ id: string; name: string; type: OrgUnitType; code: string | null }> {
  const u = await prisma.orgUnit.findFirst({
    where: { id: orgUnitId, clientId },
    select: { id: true, name: true, type: true, code: true, status: true, clientId: true },
  });
  if (!u) {
    throw new NotFoundException('Unité organisationnelle introuvable pour ce client');
  }
  if (u.status === OrgUnitStatus.ARCHIVED) {
    throw new BadRequestException('Impossible d’assigner une unité organisationnelle archivée');
  }
  return u;
}

/** Ownership effectif pour une ligne budgétaire (RFC-ORG-003). */
export function resolveEffectiveOwnerOrgUnitId(
  lineOwnerOrgUnitId: string | null | undefined,
  budgetOwnerOrgUnitId: string | null | undefined,
): string | null {
  if (lineOwnerOrgUnitId) return lineOwnerOrgUnitId;
  if (budgetOwnerOrgUnitId) return budgetOwnerOrgUnitId;
  return null;
}

export function resolveOwnerOrgUnitSource(
  lineOwnerOrgUnitId: string | null | undefined,
  budgetOwnerOrgUnitId: string | null | undefined,
): OwnerOrgUnitSource {
  if (lineOwnerOrgUnitId) return 'line';
  if (budgetOwnerOrgUnitId) return 'budget';
  return null;
}

export function toOwnerOrgUnitSummary(
  row: { id: string; name: string; type: OrgUnitType; code: string | null } | null | undefined,
): OwnerOrgUnitSummaryDto {
  if (!row) return null;
  return { id: row.id, name: row.name, type: row.type, code: row.code };
}

/**
 * Types métier qui bloquent l’archivage d’une OrgUnit (ressources actives avec ownerOrgUnitId = unitId).
 * Retour vide = archivage autorisé côté ownership.
 */
export async function listOrgUnitOwnershipArchiveBlockers(
  prisma: PrismaService,
  clientId: string,
  orgUnitId: string,
): Promise<string[]> {
  const blockers: string[] = [];

  const [projects, budgets, budgetLines, suppliers, contracts, objectives] = await Promise.all([
    prisma.project.count({
      where: {
        clientId,
        ownerOrgUnitId: orgUnitId,
        status: { notIn: PROJECT_TERMINAL },
      },
    }),
    prisma.budget.count({
      where: {
        clientId,
        ownerOrgUnitId: orgUnitId,
        status: { not: BudgetStatus.ARCHIVED },
      },
    }),
    prisma.budgetLine.count({
      where: {
        clientId,
        ownerOrgUnitId: orgUnitId,
        status: { notIn: BUDGET_LINE_TERMINAL },
      },
    }),
    prisma.supplier.count({
      where: {
        clientId,
        ownerOrgUnitId: orgUnitId,
        status: { not: SupplierStatus.ARCHIVED },
      },
    }),
    prisma.supplierContract.count({
      where: {
        clientId,
        ownerOrgUnitId: orgUnitId,
        status: { notIn: CONTRACT_TERMINAL },
      },
    }),
    prisma.strategicObjective.count({
      where: {
        clientId,
        ownerOrgUnitId: orgUnitId,
        lifecycleStatus: { not: StrategicObjectiveLifecycleStatus.ARCHIVED },
        status: { not: StrategicObjectiveStatus.ARCHIVED },
      },
    }),
  ]);

  if (projects > 0) blockers.push('Project');
  if (budgets > 0) blockers.push('Budget');
  if (budgetLines > 0) blockers.push('BudgetLine');
  if (suppliers > 0) blockers.push('Supplier');
  if (contracts > 0) blockers.push('SupplierContract');
  if (objectives > 0) blockers.push('StrategicObjective');

  return blockers;
}

/** Référence unité pour journal d’audit (id + libellé lisible). */
export async function orgUnitAuditRef(
  prisma: PrismaService,
  clientId: string,
  orgUnitId: string | null | undefined,
): Promise<{ id: string | null; name: string | null; code: string | null }> {
  if (!orgUnitId) return { id: null, name: null, code: null };
  const u = await prisma.orgUnit.findFirst({
    where: { id: orgUnitId, clientId },
    select: { id: true, name: true, code: true },
  });
  if (!u) return { id: orgUnitId, name: null, code: null };
  return { id: u.id, name: u.name, code: u.code };
}
