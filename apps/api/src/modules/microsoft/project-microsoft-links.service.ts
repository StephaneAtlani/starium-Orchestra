import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { ProjectMicrosoftLink } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import type { AuditContext } from '../budget-management/types/audit-context';
import { MicrosoftOAuthService } from './microsoft-oauth.service';
import type { UpdateProjectMicrosoftLinkDto } from './dto/update-project-microsoft-link.dto';
import { MicrosoftConnectionStatus } from '@prisma/client';

const AUDIT_ACTION_ENABLED = 'project.microsoft_link.enabled';
const AUDIT_ACTION_UPDATED = 'project.microsoft_link.updated';
const AUDIT_RESOURCE_TYPE = 'project';

export type ProjectMicrosoftLinkConfig = Pick<
  ProjectMicrosoftLink,
  | 'isEnabled'
  | 'teamId'
  | 'teamName'
  | 'channelId'
  | 'channelName'
  | 'plannerPlanId'
  | 'plannerPlanTitle'
  | 'syncTasksEnabled'
  | 'syncDocumentsEnabled'
  | 'filesDriveId'
  | 'filesFolderId'
  | 'lastSyncAt'
  | 'createdAt'
  | 'updatedAt'
>;

@Injectable()
export class ProjectMicrosoftLinksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
    private readonly microsoftOAuth: MicrosoftOAuthService,
  ) {}

  async getConfig(
    clientId: string,
    projectId: string,
  ): Promise<ProjectMicrosoftLinkConfig> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, clientId },
      select: { id: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const link = await this.prisma.projectMicrosoftLink.findFirst({
      where: { projectId, clientId },
    });

    if (!link) {
      throw new NotFoundException('Microsoft link not configured');
    }

    return link;
  }

  async upsertConfig(
    clientId: string,
    projectId: string,
    dto: UpdateProjectMicrosoftLinkDto,
    context?: AuditContext,
  ): Promise<ProjectMicrosoftLinkConfig> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, clientId },
      select: { id: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const existing = await this.prisma.projectMicrosoftLink.findFirst({
      where: { projectId, clientId },
    });

    const oldEnabled = existing?.isEnabled ?? false;
    const newEnabled = dto.isEnabled;

    // Multi-client: aucune résolution Graph/Teams/Channels/Plans bloquante ici.
    let activeConnectionId: string | null = existing?.microsoftConnectionId ?? null;
    if (newEnabled === true) {
      const connection = await this.microsoftOAuth.getActiveConnection(clientId);
      if (!connection || connection.status !== MicrosoftConnectionStatus.ACTIVE) {
        throw new UnprocessableEntityException(
          'Connexion Microsoft active requise pour activer le lien projet',
        );
      }
      activeConnectionId = connection.id;
    }

    const syncTasksEnabled =
      dto.syncTasksEnabled ?? existing?.syncTasksEnabled ?? true;
    const syncDocumentsEnabled =
      dto.syncDocumentsEnabled ?? existing?.syncDocumentsEnabled ?? true;

    const updated: ProjectMicrosoftLinkConfig & { id: string } =
      existing
        ? await this.prisma.projectMicrosoftLink.update({
            where: { id: existing.id },
            data: {
              clientId,
              projectId,
              isEnabled: newEnabled,
              microsoftConnectionId: activeConnectionId,
              syncTasksEnabled,
              syncDocumentsEnabled,

              // IDs / noms : "aucune purge" => on ne remet à null que si la ligne n'existe pas.
              ...(newEnabled === true
                ? {
                    teamId: dto.teamId,
                    channelId: dto.channelId,
                    plannerPlanId: dto.plannerPlanId,
                    ...(dto.teamName !== undefined && { teamName: dto.teamName }),
                    ...(dto.channelName !== undefined && {
                      channelName: dto.channelName,
                    }),
                    ...(dto.plannerPlanTitle !== undefined && {
                      plannerPlanTitle: dto.plannerPlanTitle,
                    }),
                  }
                : {
                    ...(dto.teamId !== undefined && { teamId: dto.teamId }),
                    ...(dto.channelId !== undefined && { channelId: dto.channelId }),
                    ...(dto.plannerPlanId !== undefined && {
                      plannerPlanId: dto.plannerPlanId,
                    }),
                    ...(dto.teamName !== undefined && { teamName: dto.teamName }),
                    ...(dto.channelName !== undefined && {
                      channelName: dto.channelName,
                    }),
                    ...(dto.plannerPlanTitle !== undefined && {
                      plannerPlanTitle: dto.plannerPlanTitle,
                    }),
                  }),
            },
          })
        : await this.prisma.projectMicrosoftLink.create({
            data: {
              clientId,
              projectId,
              isEnabled: newEnabled,
              microsoftConnectionId: newEnabled ? activeConnectionId : null,
              syncTasksEnabled,
              syncDocumentsEnabled,
              ...(newEnabled === true
                ? {
                    teamId: dto.teamId,
                    channelId: dto.channelId,
                    plannerPlanId: dto.plannerPlanId,
                    ...(dto.teamName !== undefined && { teamName: dto.teamName }),
                    ...(dto.channelName !== undefined && {
                      channelName: dto.channelName,
                    }),
                    ...(dto.plannerPlanTitle !== undefined && {
                      plannerPlanTitle: dto.plannerPlanTitle,
                    }),
                  }
                : {
                    ...(dto.teamId !== undefined && { teamId: dto.teamId }),
                    ...(dto.channelId !== undefined && { channelId: dto.channelId }),
                    ...(dto.plannerPlanId !== undefined && {
                      plannerPlanId: dto.plannerPlanId,
                    }),
                    ...(dto.teamName !== undefined && { teamName: dto.teamName }),
                    ...(dto.channelName !== undefined && {
                      channelName: dto.channelName,
                    }),
                    ...(dto.plannerPlanTitle !== undefined && {
                      plannerPlanTitle: dto.plannerPlanTitle,
                    }),
                  }),
            },
          });

    const action =
      !oldEnabled && newEnabled === true ? AUDIT_ACTION_ENABLED : AUDIT_ACTION_UPDATED;

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action,
      resourceType: AUDIT_RESOURCE_TYPE,
      resourceId: projectId,
      oldValue: {
        isEnabled: oldEnabled,
        teamId: existing?.teamId ?? null,
        channelId: existing?.channelId ?? null,
        plannerPlanId: existing?.plannerPlanId ?? null,
      },
      newValue: {
        isEnabled: updated.isEnabled,
        teamId: updated.teamId ?? null,
        channelId: updated.channelId ?? null,
        plannerPlanId: updated.plannerPlanId ?? null,
      },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });

    // Sanity: le PUT avec isEnabled=true ne doit jamais aboutir sans IDs
    // (la validation DTO le garantit mais on garde un filet de sécurité).
    if (newEnabled === true) {
      if (!dto.teamId || !dto.channelId || !dto.plannerPlanId) {
        throw new BadRequestException('teamId, channelId et plannerPlanId sont requis');
      }
    }

    return updated;
  }
}

