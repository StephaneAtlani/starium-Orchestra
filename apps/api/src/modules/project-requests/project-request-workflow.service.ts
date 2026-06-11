import { BadRequestException, Injectable } from '@nestjs/common';
import {
  ProjectRequest,
  ProjectRequestRoutingStatus,
  ProjectRequestRoutingTarget,
  ProjectRequestStatus,
  ProjectRequestWorkflowSettings,
} from '@prisma/client';
import { RequestMeta } from '../../common/decorators/request-meta.decorator';
import { ProjectRequestToProjectConverter } from './project-request-to-project.converter';
import { ProjectRequestPilotingCycleRoutingService } from './project-request-piloting-cycle-routing.service';
import {
  assertMembershipLicense,
  type MembershipWithSubscription,
} from './project-request-membership.util';

type ApprovalContext = {
  actorUserId?: string;
  meta?: RequestMeta;
  membership?: MembershipWithSubscription;
};

@Injectable()
export class ProjectRequestWorkflowService {
  constructor(
    private readonly converter: ProjectRequestToProjectConverter,
    private readonly pilotingCycleRouting: ProjectRequestPilotingCycleRoutingService,
  ) {}

  async applyAfterApproval(
    clientId: string,
    request: ProjectRequest,
    settings: ProjectRequestWorkflowSettings,
    context?: ApprovalContext,
  ): Promise<ProjectRequest> {
    const target = settings.defaultApprovedTarget;

    if (target === ProjectRequestRoutingTarget.MANUAL_DECISION) {
      return this.pilotingCycleRouting.markManualApproved(request.id);
    }

    if (target === ProjectRequestRoutingTarget.PROJECT_BACKLOG) {
      return this.pilotingCycleRouting.markBacklogApproved(request.id);
    }

    if (target === ProjectRequestRoutingTarget.PILOTING_CYCLE) {
      return this.pilotingCycleRouting.routeApprovedToPilotingCycleIfEligible(
        clientId,
        request,
        settings,
        context,
      );
    }

    if (target === ProjectRequestRoutingTarget.DRAFT_PROJECT) {
      if (context?.membership) {
        assertMembershipLicense(context.membership, 'write');
      }
      return this.converter.convertToDraftProject(clientId, request.id, context);
    }

    throw new BadRequestException('Cible de routage par défaut non supportée');
  }

  routingStatusForTarget(
    target: ProjectRequestRoutingTarget,
  ): ProjectRequestRoutingStatus {
    switch (target) {
      case ProjectRequestRoutingTarget.PILOTING_CYCLE:
        return ProjectRequestRoutingStatus.ROUTED_TO_PILOTING_CYCLE;
      case ProjectRequestRoutingTarget.DRAFT_PROJECT:
        return ProjectRequestRoutingStatus.ROUTED_TO_DRAFT_PROJECT;
      case ProjectRequestRoutingTarget.PROJECT_BACKLOG:
        return ProjectRequestRoutingStatus.ROUTED_TO_PROJECT_BACKLOG;
      default:
        return ProjectRequestRoutingStatus.NOT_ROUTED;
    }
  }
}
