import { Injectable } from '@nestjs/common';
import {
  GovernanceCycleItemDecisionStatus,
  GovernanceCycleItemSourceType,
  ProjectArbitrationLevelStatus,
  Prisma,
} from '@prisma/client';
import { deriveLegacyArbitrationStatus } from '../projects/lib/project-arbitration-legacy.util';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import type { NormalizedGovernanceCycleConfig } from './lib/governance-cycle-config.schema';

export type PropagationAuditContext = {
  actorUserId?: string;
  meta?: { ipAddress?: string; userAgent?: string; requestId?: string };
};

function mapDecisionToCodirStatus(
  status: GovernanceCycleItemDecisionStatus,
): ProjectArbitrationLevelStatus | null {
  switch (status) {
    case GovernanceCycleItemDecisionStatus.ACCEPTED:
    case GovernanceCycleItemDecisionStatus.ACCEPTED_WITH_RESERVE:
      return ProjectArbitrationLevelStatus.VALIDE;
    case GovernanceCycleItemDecisionStatus.REJECTED:
      return ProjectArbitrationLevelStatus.REFUSE;
    case GovernanceCycleItemDecisionStatus.DEFERRED:
      return ProjectArbitrationLevelStatus.BROUILLON;
    case GovernanceCycleItemDecisionStatus.NEEDS_INFORMATION:
      return ProjectArbitrationLevelStatus.EN_COURS;
    default:
      return null;
  }
}

@Injectable()
export class GovernanceCyclePropagationService {
  constructor(private readonly auditLogs: AuditLogsService) {}

  async applyInTransaction(
    tx: Prisma.TransactionClient,
    clientId: string,
    instanceId: string,
    config: NormalizedGovernanceCycleConfig,
    decisions: Array<{
      id: string;
      itemId: string;
      sourceType: GovernanceCycleItemSourceType;
      projectId: string | null;
      budgetId: string | null;
      decisionStatus: GovernanceCycleItemDecisionStatus;
      decisionReason: string | null;
      decidedAt: Date;
      decidedByUserId: string | null;
    }>,
    context: PropagationAuditContext,
    options: { allowBudgetGovernancePropagation?: boolean } = {},
  ): Promise<void> {
    if (config.propagation.project === 'WRITE_ARBITRATION_CODIR') {
      await this.propagateProjects(tx, clientId, decisions, context);
    }
    if (
      options.allowBudgetGovernancePropagation &&
      config.propagation.budget === 'WRITE_BUDGET_GOVERNANCE_DECISION'
    ) {
      await this.propagateBudgets(tx, clientId, instanceId, decisions, context);
    }
  }

  private async propagateProjects(
    tx: Prisma.TransactionClient,
    clientId: string,
    decisions: Array<{
      itemId: string;
      sourceType: GovernanceCycleItemSourceType;
      projectId: string | null;
      decisionStatus: GovernanceCycleItemDecisionStatus;
      decisionReason: string | null;
    }>,
    context: PropagationAuditContext,
  ): Promise<void> {
    for (const d of decisions) {
      if (d.sourceType !== GovernanceCycleItemSourceType.PROJECT || !d.projectId) {
        continue;
      }
      const codir = mapDecisionToCodirStatus(d.decisionStatus);
      if (!codir) continue;

      const existing = await tx.project.findFirst({
        where: { id: d.projectId, clientId },
        select: {
          id: true,
          arbitrationMetierStatus: true,
          arbitrationComiteStatus: true,
          arbitrationCodirStatus: true,
        },
      });
      if (!existing) {
        throw new Error(`Project ${d.projectId} not found for propagation`);
      }

      const metier = existing.arbitrationMetierStatus ?? ProjectArbitrationLevelStatus.BROUILLON;
      const comite = existing.arbitrationComiteStatus;
      const arbitrationStatus = deriveLegacyArbitrationStatus(metier, comite, codir);

      const updated = await tx.project.update({
        where: { id: d.projectId },
        data: {
          arbitrationCodirStatus: codir,
          arbitrationStatus,
        },
        select: {
          id: true,
          arbitrationCodirStatus: true,
          arbitrationStatus: true,
        },
      });

      await this.auditLogs.create({
        clientId,
        userId: context.actorUserId,
        action: 'governance_cycle.propagation.project',
        resourceType: 'governance_cycle_item',
        resourceId: d.itemId,
        oldValue: {
          arbitrationCodirStatus: existing.arbitrationCodirStatus,
          arbitrationStatus: null,
        },
        newValue: {
          arbitrationCodirStatus: updated.arbitrationCodirStatus,
          arbitrationStatus: updated.arbitrationStatus,
          projectId: d.projectId,
        },
        ipAddress: context.meta?.ipAddress,
        userAgent: context.meta?.userAgent,
        requestId: context.meta?.requestId,
      });
    }
  }

  private async propagateBudgets(
    tx: Prisma.TransactionClient,
    clientId: string,
    instanceId: string,
    decisions: Array<{
      id: string;
      itemId: string;
      sourceType: GovernanceCycleItemSourceType;
      budgetId: string | null;
      decisionStatus: GovernanceCycleItemDecisionStatus;
      decisionReason: string | null;
      decidedAt: Date;
      decidedByUserId: string | null;
    }>,
    context: PropagationAuditContext,
  ): Promise<void> {
    for (const d of decisions) {
      if (d.sourceType !== GovernanceCycleItemSourceType.BUDGET || !d.budgetId) {
        continue;
      }
      const budget = await tx.budget.findFirst({
        where: { id: d.budgetId, clientId },
        select: { id: true, status: true },
      });
      if (!budget) {
        throw new Error(`Budget ${d.budgetId} not found for propagation`);
      }

      const row = await tx.budgetGovernanceDecision.create({
        data: {
          clientId,
          budgetId: d.budgetId,
          instanceId,
          itemId: d.itemId,
          decisionId: d.id,
          decisionStatus: d.decisionStatus,
          decisionReason: d.decisionReason,
          decidedAt: d.decidedAt,
          decidedByUserId: d.decidedByUserId,
        },
      });

      await this.auditLogs.create({
        clientId,
        userId: context.actorUserId,
        action: 'governance_cycle.propagation.budget',
        resourceType: 'budget_governance_decision',
        resourceId: row.id,
        newValue: {
          budgetId: d.budgetId,
          instanceId,
          itemId: d.itemId,
          decisionStatus: d.decisionStatus,
        },
        ipAddress: context.meta?.ipAddress,
        userAgent: context.meta?.userAgent,
        requestId: context.meta?.requestId,
      });
    }
  }
}
