import { BadRequestException, Injectable } from '@nestjs/common';
import {
  ProjectRequest,
  ProjectRequestRoutingStatus,
  ProjectRequestRoutingTarget,
  ProjectRequestStatus,
  ProjectRequestWorkflowSettings,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ProjectRequestToProjectConverter } from './project-request-to-project.converter';

@Injectable()
export class ProjectRequestWorkflowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly converter: ProjectRequestToProjectConverter,
  ) {}

  async applyAfterApproval(
    clientId: string,
    request: ProjectRequest,
    settings: ProjectRequestWorkflowSettings,
    context?: { actorUserId?: string },
  ): Promise<ProjectRequest> {
    const target = settings.defaultApprovedTarget;

    if (target === ProjectRequestRoutingTarget.MANUAL_DECISION) {
      return this.prisma.projectRequest.update({
        where: { id: request.id },
        data: {
          status: ProjectRequestStatus.APPROVED,
          routingTarget: ProjectRequestRoutingTarget.MANUAL_DECISION,
          routingStatus: ProjectRequestRoutingStatus.NOT_ROUTED,
        },
      });
    }

    if (target === ProjectRequestRoutingTarget.PROJECT_BACKLOG) {
      return this.prisma.projectRequest.update({
        where: { id: request.id },
        data: {
          status: ProjectRequestStatus.APPROVED,
          routingTarget: ProjectRequestRoutingTarget.PROJECT_BACKLOG,
          routingStatus: ProjectRequestRoutingStatus.ROUTED_TO_PROJECT_BACKLOG,
          routedAt: new Date(),
        },
      });
    }

    if (target === ProjectRequestRoutingTarget.PILOTING_CYCLE) {
      return this.prisma.projectRequest.update({
        where: { id: request.id },
        data: {
          status: ProjectRequestStatus.APPROVED,
          routingTarget: ProjectRequestRoutingTarget.PILOTING_CYCLE,
          routingStatus: ProjectRequestRoutingStatus.ROUTED_TO_PILOTING_CYCLE,
          routedAt: new Date(),
        },
      });
    }

    if (target === ProjectRequestRoutingTarget.DRAFT_PROJECT) {
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
