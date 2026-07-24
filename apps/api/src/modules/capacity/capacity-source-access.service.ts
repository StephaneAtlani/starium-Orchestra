import { Injectable } from '@nestjs/common';
import {
  ActionPlanStatus,
  CapacityAllocationSourceType,
  ProjectRiskStatus,
  ProjectStatus,
} from '@prisma/client';
import { satisfiesPermission } from '@starium-orchestra/rbac-permissions';
import { EffectivePermissionsService } from '../../common/services/effective-permissions.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AccessDecisionService } from '../access-decision/access-decision.service';
import { assertNever } from './lib/assert-never';

/**
 * Accès effectif aux sources métier d'allocations.
 *
 * - MANUAL : N/A (true)
 * - PROJECT : AccessDecisionService.decide (intent read)
 * - PROJECT_RISK / ACTION_PLAN : non supportés par AccessDecision —
 *   existence tenant-scopée + permission `projects.read`
 *   (pas de `risks.read` / `action_plans.read` au catalogue).
 *   Un filtre `clientId` seul n'est **pas** un accès effectif.
 */
@Injectable()
export class CapacitySourceAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessDecision: AccessDecisionService,
    private readonly effectivePermissions: EffectivePermissionsService,
  ) {}

  async canReadSource(params: {
    clientId: string;
    userId: string;
    sourceType: CapacityAllocationSourceType;
    sourceId: string | null;
  }): Promise<boolean> {
    const { clientId, userId, sourceType, sourceId } = params;

    switch (sourceType) {
      case CapacityAllocationSourceType.MANUAL:
        return true;
      case CapacityAllocationSourceType.PROJECT: {
        if (!sourceId) return false;
        const decision = await this.accessDecision.decide({
          clientId,
          userId,
          resourceType: 'PROJECT',
          resourceId: sourceId,
          intent: 'read',
        });
        return decision.allowed === true;
      }
      case CapacityAllocationSourceType.PROJECT_RISK: {
        if (!sourceId) return false;
        return this.tenantScopedWithProjectsRead(clientId, userId, async () => {
          const row = await this.prisma.projectRisk.findFirst({
            where: { id: sourceId, clientId },
            select: { id: true },
          });
          return row != null;
        });
      }
      case CapacityAllocationSourceType.ACTION_PLAN: {
        if (!sourceId) return false;
        return this.tenantScopedWithProjectsRead(clientId, userId, async () => {
          const row = await this.prisma.actionPlan.findFirst({
            where: { id: sourceId, clientId },
            select: { id: true },
          });
          return row != null;
        });
      }
      default:
        return assertNever(sourceType);
    }
  }

  async loadSourceMeta(
    clientId: string,
    sourceType: CapacityAllocationSourceType,
    sourceId: string,
  ): Promise<{
    label: string;
    status: ProjectStatus | ProjectRiskStatus | ActionPlanStatus | null;
  } | null> {
    if (sourceType === CapacityAllocationSourceType.PROJECT) {
      const p = await this.prisma.project.findFirst({
        where: { id: sourceId, clientId },
        select: { name: true, code: true, status: true },
      });
      if (!p) return null;
      return { label: `${p.code} — ${p.name}`, status: p.status };
    }
    if (sourceType === CapacityAllocationSourceType.PROJECT_RISK) {
      const r = await this.prisma.projectRisk.findFirst({
        where: { id: sourceId, clientId },
        select: { title: true, code: true, status: true },
      });
      if (!r) return null;
      return { label: `${r.code} — ${r.title}`, status: r.status };
    }
    if (sourceType === CapacityAllocationSourceType.ACTION_PLAN) {
      const a = await this.prisma.actionPlan.findFirst({
        where: { id: sourceId, clientId },
        select: { title: true, code: true, status: true },
      });
      if (!a) return null;
      return { label: `${a.code} — ${a.title}`, status: a.status };
    }
    return null;
  }

  private async tenantScopedWithProjectsRead(
    clientId: string,
    userId: string,
    exists: () => Promise<boolean>,
  ): Promise<boolean> {
    const codes =
      await this.effectivePermissions.resolvePermissionCodesForRequest({
        userId,
        clientId,
      });
    if (!satisfiesPermission(codes, 'projects.read')) {
      return false;
    }
    return exists();
  }
}
