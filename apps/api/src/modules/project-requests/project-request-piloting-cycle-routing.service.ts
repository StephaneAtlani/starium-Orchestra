import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  GovernanceCycleItemDecisionStatus,
  GovernanceCycleItemSourceType,
  Prisma,
  ProjectRequest,
  ProjectRequestRoutingStatus,
  ProjectRequestRoutingTarget,
  ProjectRequestStatus,
  ProjectRequestWorkflowSettings,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestMeta } from '../../common/decorators/request-meta.decorator';
import {
  AuditLogsService,
  CreateAuditLogInput,
} from '../audit-logs/audit-logs.service';
import {
  isGovernanceCycleActiveForProjectRequestPool,
  isGovernanceCyclesModuleActive,
} from './project-request-governance-cycle.util';
import { ProjectRequestToProjectConverter } from './project-request-to-project.converter';
import {
  assertMembershipLicense,
  type MembershipWithSubscription,
} from './project-request-membership.util';

const CANDIDACY_RESUBMIT_STATUSES: GovernanceCycleItemDecisionStatus[] = [
  GovernanceCycleItemDecisionStatus.CANDIDATE,
  GovernanceCycleItemDecisionStatus.DEFERRED,
  GovernanceCycleItemDecisionStatus.NEEDS_INFORMATION,
  GovernanceCycleItemDecisionStatus.TO_ARBITRATE,
];

type RoutingContext = {
  actorUserId?: string;
  meta?: RequestMeta;
  membership?: MembershipWithSubscription;
};

@Injectable()
export class ProjectRequestPilotingCycleRoutingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly converter: ProjectRequestToProjectConverter,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async isPilotingCycleRoutingAvailable(
    clientId: string,
    settings: ProjectRequestWorkflowSettings,
  ): Promise<boolean> {
    const moduleEnabled = await isGovernanceCyclesModuleActive(
      this.prisma,
      clientId,
    );
    if (!moduleEnabled || !settings.defaultGovernanceCycleId) {
      return false;
    }
    const cycle = await this.prisma.governanceCycle.findFirst({
      where: { id: settings.defaultGovernanceCycleId, clientId },
      select: { status: true },
    });
    if (!cycle) return false;
    return isGovernanceCycleActiveForProjectRequestPool(cycle.status);
  }

  async markManualApproved(requestId: string): Promise<ProjectRequest> {
    return this.prisma.projectRequest.update({
      where: { id: requestId },
      data: {
        status: ProjectRequestStatus.APPROVED,
        routingTarget: ProjectRequestRoutingTarget.MANUAL_DECISION,
        routingStatus: ProjectRequestRoutingStatus.NOT_ROUTED,
      },
    });
  }

  async markBacklogApproved(requestId: string): Promise<ProjectRequest> {
    return this.prisma.projectRequest.update({
      where: { id: requestId },
      data: {
        status: ProjectRequestStatus.APPROVED,
        routingTarget: ProjectRequestRoutingTarget.PROJECT_BACKLOG,
        routingStatus: ProjectRequestRoutingStatus.ROUTED_TO_PROJECT_BACKLOG,
        routedAt: new Date(),
      },
    });
  }

  /**
   * Route une demande approuvée vers le pool du cycle configuré si module + cycle actifs.
   * Sinon : APPROVED en attente (NOT_ROUTED).
   */
  async routeApprovedToPilotingCycleIfEligible(
    clientId: string,
    request: ProjectRequest,
    settings: ProjectRequestWorkflowSettings,
    context?: RoutingContext,
  ): Promise<ProjectRequest> {
    const cycleId = settings.defaultGovernanceCycleId;
    const moduleEnabled = await isGovernanceCyclesModuleActive(
      this.prisma,
      clientId,
    );

    if (!moduleEnabled || !cycleId) {
      return this.markManualApproved(request.id);
    }

    const cycle = await this.prisma.governanceCycle.findFirst({
      where: { id: cycleId, clientId },
      select: { id: true, status: true, name: true },
    });
    if (!cycle) {
      return this.markManualApproved(request.id);
    }

    if (!isGovernanceCycleActiveForProjectRequestPool(cycle.status)) {
      return this.markApprovedPending(clientId, request.id, {
        routingTarget: ProjectRequestRoutingTarget.PILOTING_CYCLE,
      });
    }

    const actorUserId = context?.actorUserId;
    if (!actorUserId) {
      throw new BadRequestException('Utilisateur requis pour le routage cycle');
    }
    if (context?.membership) {
      assertMembershipLicense(context.membership, 'write');
    }

    const linked = await this.converter.ensureDraftProjectLinkedForRouting(
      clientId,
      request.id,
      { actorUserId, meta: context?.meta, membership: context?.membership },
    );

    const project = await this.prisma.project.findFirst({
      where: { id: linked.convertedProjectId!, clientId },
      select: { id: true, name: true, code: true },
    });
    if (!project) {
      throw new NotFoundException('Projet lié introuvable');
    }

    const title =
      project.code && project.name
        ? `${project.code} — ${project.name}`
        : project.name;

    await this.upsertCycleCandidacy({
      clientId,
      cycleId: cycle.id,
      projectId: project.id,
      title,
      description: request.description,
      estimatedBudget: request.estimatedBudget,
    });

    const updated = await this.prisma.projectRequest.update({
      where: { id: request.id },
      data: {
        status: ProjectRequestStatus.APPROVED,
        convertedProjectId: project.id,
        routingTarget: ProjectRequestRoutingTarget.PILOTING_CYCLE,
        routingStatus: ProjectRequestRoutingStatus.ROUTED_TO_PILOTING_CYCLE,
        routedAt: new Date(),
      },
    });

    const auditInput: CreateAuditLogInput = {
      clientId,
      userId: actorUserId,
      action: 'project_request.routed_to_piloting_cycle',
      resourceType: 'project_request',
      resourceId: request.id,
      newValue: {
        governanceCycleId: cycle.id,
        governanceCycleName: cycle.name,
        projectId: project.id,
      },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    };
    await this.auditLogs.create(auditInput);

    return updated;
  }

  private async markApprovedPending(
    clientId: string,
    requestId: string,
    extra?: { routingTarget?: ProjectRequestRoutingTarget },
  ): Promise<ProjectRequest> {
    return this.prisma.projectRequest.update({
      where: { id: requestId },
      data: {
        status: ProjectRequestStatus.APPROVED,
        routingTarget:
          extra?.routingTarget ?? ProjectRequestRoutingTarget.MANUAL_DECISION,
        routingStatus: ProjectRequestRoutingStatus.NOT_ROUTED,
      },
    });
  }

  private async upsertCycleCandidacy(params: {
    clientId: string;
    cycleId: string;
    projectId: string;
    title: string;
    description: string | null;
    estimatedBudget: Prisma.Decimal | null;
  }): Promise<void> {
    const existing = await this.prisma.governanceCycleItem.findUnique({
      where: {
        cycleId_projectId: {
          cycleId: params.cycleId,
          projectId: params.projectId,
        },
      },
    });

    if (
      existing &&
      !CANDIDACY_RESUBMIT_STATUSES.includes(existing.decisionStatus)
    ) {
      throw new ConflictException(
        'Le projet lié a déjà une décision finale sur ce cycle de pilotage',
      );
    }

    const budgetAmount =
      params.estimatedBudget != null ? Number(params.estimatedBudget) : null;

    if (existing) {
      await this.prisma.governanceCycleItem.update({
        where: { id: existing.id },
        data: {
          decisionStatus: GovernanceCycleItemDecisionStatus.CANDIDATE,
          decisionReason: null,
          title: params.title,
          description: params.description,
          ...(budgetAmount != null && {
            estimatedBudgetAmount: budgetAmount,
          }),
        },
      });
      return;
    }

    await this.prisma.governanceCycleItem.create({
      data: {
        clientId: params.clientId,
        cycleId: params.cycleId,
        sourceType: GovernanceCycleItemSourceType.PROJECT,
        projectId: params.projectId,
        title: params.title,
        description: params.description,
        decisionStatus: GovernanceCycleItemDecisionStatus.CANDIDATE,
        ...(budgetAmount != null && {
          estimatedBudgetAmount: budgetAmount,
        }),
      },
    });
  }
}
