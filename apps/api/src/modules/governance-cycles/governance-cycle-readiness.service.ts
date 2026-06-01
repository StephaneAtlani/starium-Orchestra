import { BadRequestException, Injectable } from '@nestjs/common';
import {
  GovernanceCycleItemDecisionStatus,
  GovernanceCycleItemSourceType,
  ProjectArbitrationLevelStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { NormalizedGovernanceCycleConfig } from './lib/governance-cycle-config.schema';

export const GOVERNANCE_CYCLE_PROJECT_NOT_READY = 'GOVERNANCE_CYCLE_PROJECT_NOT_READY';

export type ReadinessMissingFlag =
  | 'COCKPIT'
  | 'METIER'
  | 'COMITE'
  | 'SPONSOR';

@Injectable()
export class GovernanceCycleReadinessService {
  constructor(private readonly prisma: PrismaService) {}

  async assertProjectsReadyForClose(
    tx: Prisma.TransactionClient,
    clientId: string,
    config: NormalizedGovernanceCycleConfig,
    decisions: Array<{
      itemId: string;
      sourceType: GovernanceCycleItemSourceType;
      projectId: string | null;
      decisionStatus: GovernanceCycleItemDecisionStatus;
    }>,
  ): Promise<void> {
    const rules = config.readinessRules;
    if (!rules?.enforceOnInstanceClose) return;

    const onAccepted = rules.onAcceptedDecision ?? {};
    for (const d of decisions) {
      if (d.sourceType !== GovernanceCycleItemSourceType.PROJECT || !d.projectId) {
        continue;
      }
      if (d.decisionStatus !== GovernanceCycleItemDecisionStatus.ACCEPTED) {
        continue;
      }
      const missing = await this.collectMissingForProject(
        tx,
        clientId,
        d.projectId,
        onAccepted,
      );
      if (missing.length > 0) {
        throw new BadRequestException({
          code: GOVERNANCE_CYCLE_PROJECT_NOT_READY,
          message: 'Project not ready for ACCEPTED instance decision',
          missing,
          projectId: d.projectId,
        });
      }
    }
  }

  private async collectMissingForProject(
    tx: Prisma.TransactionClient,
    clientId: string,
    projectId: string,
    onAccepted: NonNullable<
      NonNullable<NormalizedGovernanceCycleConfig['readinessRules']>['onAcceptedDecision']
    >,
  ): Promise<ReadinessMissingFlag[]> {
    const missing: ReadinessMissingFlag[] = [];
    const project = await tx.project.findFirst({
      where: { id: projectId, clientId },
      select: {
        businessProblem: true,
        estimatedCost: true,
        businessValueScore: true,
        strategicAlignment: true,
        urgencyScore: true,
        arbitrationMetierStatus: true,
        arbitrationComiteStatus: true,
      },
    });
    if (!project) return missing;

    if (onAccepted.requireProjectSheetCockpitComplete) {
      const cockpitOk =
        Boolean(project.businessProblem?.trim()) &&
        project.estimatedCost != null &&
        project.businessValueScore != null &&
        project.strategicAlignment != null &&
        project.urgencyScore != null;
      if (!cockpitOk) missing.push('COCKPIT');
    }
    if (
      onAccepted.requireArbitrationMetierValide &&
      project.arbitrationMetierStatus !== ProjectArbitrationLevelStatus.VALIDE
    ) {
      missing.push('METIER');
    }
    if (
      onAccepted.requireArbitrationComiteValide &&
      project.arbitrationComiteStatus !== ProjectArbitrationLevelStatus.VALIDE
    ) {
      missing.push('COMITE');
    }
    if (onAccepted.requireSponsorOnProjectTeam) {
      const sponsor = await tx.projectTeamMember.findFirst({
        where: {
          clientId,
          projectId,
          role: { systemKind: 'SPONSOR' },
        },
        select: { id: true },
      });
      if (!sponsor) missing.push('SPONSOR');
    }
    return missing;
  }
}
