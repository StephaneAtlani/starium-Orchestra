import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  ProjectCriticality,
  ProjectPriority,
  ProjectRequest,
  ProjectRequestStatus,
  ProjectRequestRoutingStatus,
  ProjectRequestRoutingTarget,
  ProjectRequestUrgency,
  ProjectStatus,
  ProjectType,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ProjectsService } from '../projects/projects.service';
import { CreateProjectDto } from '../projects/dto/create-project.dto';
import {
  AuditLogsService,
  CreateAuditLogInput,
} from '../audit-logs/audit-logs.service';
import { RequestMeta } from '../../common/decorators/request-meta.decorator';
import { AccessControlService } from '../access-control/access-control.service';
import {
  assertMembershipLicense,
  type MembershipWithSubscription,
} from './project-request-membership.util';
import { canWriteProjectRequest } from './project-request-access.helpers';

function mapUrgencyToPriority(
  urgency: ProjectRequestUrgency | null | undefined,
): ProjectPriority {
  switch (urgency) {
    case ProjectRequestUrgency.LOW:
      return ProjectPriority.LOW;
    case ProjectRequestUrgency.HIGH:
    case ProjectRequestUrgency.CRITICAL:
      return ProjectPriority.HIGH;
    case ProjectRequestUrgency.MEDIUM:
    default:
      return ProjectPriority.MEDIUM;
  }
}

function buildProjectCode(requestId: string, attempt: number): string {
  const suffix = requestId.replace(/\W/g, '').slice(-6).toUpperCase();
  return attempt === 0 ? `REQ-${suffix}` : `REQ-${suffix}-${attempt}`;
}

@Injectable()
export class ProjectRequestToProjectConverter {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projects: ProjectsService,
    private readonly accessControl: AccessControlService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async convertToDraftProject(
    clientId: string,
    projectRequestId: string,
    context?: { actorUserId?: string; meta?: RequestMeta; membership?: MembershipWithSubscription },
  ): Promise<ProjectRequest> {
    return this.convertToDraftProjectInternal(clientId, projectRequestId, {
      ...context,
      finalizeAsConverted: true,
      routingTarget: ProjectRequestRoutingTarget.DRAFT_PROJECT,
      routingStatus: ProjectRequestRoutingStatus.ROUTED_TO_DRAFT_PROJECT,
    });
  }

  /**
   * Crée ou réutilise un projet brouillon lié sans clôturer la demande (ex. pool cycle).
   */
  async ensureDraftProjectLinkedForRouting(
    clientId: string,
    projectRequestId: string,
    context?: { actorUserId?: string; meta?: RequestMeta; membership?: MembershipWithSubscription },
  ): Promise<ProjectRequest> {
    const existing = await this.prisma.projectRequest.findFirst({
      where: { id: projectRequestId, clientId },
      select: { convertedProjectId: true },
    });
    if (existing?.convertedProjectId) {
      return this.prisma.projectRequest.findFirstOrThrow({
        where: { id: projectRequestId, clientId },
      });
    }
    return this.convertToDraftProjectInternal(clientId, projectRequestId, {
      ...context,
      finalizeAsConverted: false,
      preserveStatus: ProjectRequestStatus.APPROVED,
      routingTarget: ProjectRequestRoutingTarget.PILOTING_CYCLE,
      routingStatus: ProjectRequestRoutingStatus.NOT_ROUTED,
    });
  }

  private async convertToDraftProjectInternal(
    clientId: string,
    projectRequestId: string,
    context?: {
      actorUserId?: string;
      meta?: RequestMeta;
      membership?: MembershipWithSubscription;
      finalizeAsConverted?: boolean;
      preserveStatus?: ProjectRequestStatus;
      routingTarget?: ProjectRequestRoutingTarget;
      routingStatus?: ProjectRequestRoutingStatus;
    },
  ): Promise<ProjectRequest> {
    const request = await this.prisma.projectRequest.findFirst({
      where: { id: projectRequestId, clientId },
    });
    if (!request) {
      throw new NotFoundException('Demande projet introuvable');
    }
    if (request.convertedProjectId) {
      throw new BadRequestException('Demande déjà convertie en projet');
    }
    if (
      request.status !== ProjectRequestStatus.APPROVED &&
      request.status !== ProjectRequestStatus.SUBMITTED
    ) {
      throw new BadRequestException(
        'Seule une demande approuvée peut être convertie en projet',
      );
    }

    const actorUserId = context?.actorUserId;
    if (!actorUserId) {
      throw new ForbiddenException('Utilisateur requis');
    }
    if (context?.membership) {
      assertMembershipLicense(context.membership, 'write');
    }
    const canWrite = await canWriteProjectRequest(this.accessControl, {
      clientId,
      userId: actorUserId,
      resourceId: projectRequestId,
    });
    if (!canWrite) {
      throw new NotFoundException('Demande projet introuvable');
    }

    return this.prisma.$transaction(async (tx) => {
      const dto: CreateProjectDto = {
        name: request.title.trim(),
        code: await this.resolveUniqueCode(tx, clientId, request.id),
        description: request.description ?? undefined,
        kind: 'PROJECT',
        type: ProjectType.APPLICATION,
        status: ProjectStatus.DRAFT,
        priority: mapUrgencyToPriority(request.urgency),
        criticality: ProjectCriticality.LOW,
      };

      const project = await this.projects.create(clientId, dto, {
        actorUserId,
        meta: context?.meta,
      });

      if (request.estimatedBudget != null) {
        await tx.project.update({
          where: { id: project.id },
          data: { estimatedCost: request.estimatedBudget },
        });
      }

      const finalizeAsConverted = context?.finalizeAsConverted !== false;
      const updated = await tx.projectRequest.update({
        where: { id: request.id },
        data: {
          convertedProjectId: project.id,
          status: finalizeAsConverted
            ? ProjectRequestStatus.CONVERTED_TO_PROJECT
            : (context?.preserveStatus ?? ProjectRequestStatus.APPROVED),
          routingTarget:
            context?.routingTarget ?? ProjectRequestRoutingTarget.DRAFT_PROJECT,
          routingStatus:
            context?.routingStatus ??
            ProjectRequestRoutingStatus.ROUTED_TO_DRAFT_PROJECT,
          routedAt: finalizeAsConverted ? new Date() : undefined,
        },
      });

      if (finalizeAsConverted) {
        const auditInput: CreateAuditLogInput = {
          clientId,
          userId: actorUserId,
          action: 'project_request.converted_to_project',
          resourceType: 'project_request',
          resourceId: request.id,
          newValue: { convertedProjectId: project.id, projectCode: dto.code },
          ipAddress: context?.meta?.ipAddress,
          userAgent: context?.meta?.userAgent,
          requestId: context?.meta?.requestId,
        };
        await this.auditLogs.create(auditInput);
      }

      return updated;
    });
  }

  private async resolveUniqueCode(
    tx: Prisma.TransactionClient,
    clientId: string,
    requestId: string,
  ): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = buildProjectCode(requestId, attempt);
      const existing = await tx.project.findUnique({
        where: { clientId_code: { clientId, code } },
        select: { id: true },
      });
      if (!existing) return code;
    }
    throw new BadRequestException('Impossible de générer un code projet unique');
  }
}
