import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import type { AuditContext } from '../budget-management/types/audit-context';
import { CreateTeamsChannelTemplateDto } from './dto/create-teams-channel-template.dto';
import { ReorderTeamsChannelTemplatesDto } from './dto/reorder-teams-channel-templates.dto';
import { UpdateTeamsChannelTemplateDto } from './dto/update-teams-channel-template.dto';
import { UpdateTeamsProvisioningSettingsDto } from './dto/update-teams-provisioning-settings.dto';

const SETTINGS_AUDIT_ACTION = 'project.microsoft_teams.settings.updated';
const CHANNEL_TEMPLATE_CREATED_AUDIT_ACTION = 'channel_template.created';
const CHANNEL_TEMPLATE_UPDATED_AUDIT_ACTION = 'channel_template.updated';
const CHANNEL_TEMPLATE_DELETED_AUDIT_ACTION = 'channel_template.deleted';
const AUDIT_RESOURCE_TYPE = 'project_microsoft_teams_options';
const DEFAULT_TEAM_NAME_TEMPLATE = '{{code}} - {{name}}';

export type ProjectMicrosoftTeamsProvisioningSettingsDto = {
  id: string | null;
  clientId: string;
  isEnabled: boolean;
  offerOnProjectCreate: boolean;
  teamNameTemplate: string;
  teamDescriptionTemplate: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type ProjectMicrosoftTeamsChannelTemplateDto = {
  id: string;
  clientId: string;
  settingsId: string;
  displayName: string;
  description: string | null;
  sortOrder: number;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class ProjectMicrosoftTeamsTemplateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async getSettings(clientId: string): Promise<ProjectMicrosoftTeamsProvisioningSettingsDto> {
    const settings = await this.prisma.projectMicrosoftTeamsProvisioningSettings.findUnique({
      where: { clientId },
    });
    return this.toSettingsDto(clientId, settings);
  }

  async updateSettings(
    clientId: string,
    dto: UpdateTeamsProvisioningSettingsDto,
    context?: AuditContext,
  ): Promise<ProjectMicrosoftTeamsProvisioningSettingsDto> {
    const existing = await this.prisma.projectMicrosoftTeamsProvisioningSettings.findUnique({
      where: { clientId },
    });

    const nextData = {
      isEnabled: dto.isEnabled,
      offerOnProjectCreate: dto.isEnabled ? dto.offerOnProjectCreate : false,
      teamNameTemplate: dto.teamNameTemplate.trim(),
      teamDescriptionTemplate: dto.teamDescriptionTemplate?.trim() || null,
    };

    const settings = existing
      ? await this.prisma.projectMicrosoftTeamsProvisioningSettings.update({
          where: { id: existing.id },
          data: nextData,
        })
      : await this.prisma.projectMicrosoftTeamsProvisioningSettings.create({
          data: {
            clientId,
            ...nextData,
          },
        });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: SETTINGS_AUDIT_ACTION,
      resourceType: AUDIT_RESOURCE_TYPE,
      resourceId: settings.id,
      oldValue: existing
        ? this.toSettingsDto(clientId, existing)
        : this.toSettingsDto(clientId, null),
      newValue: this.toSettingsDto(clientId, settings),
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });

    return this.toSettingsDto(clientId, settings);
  }

  async listChannelTemplates(
    clientId: string,
  ): Promise<{ items: ProjectMicrosoftTeamsChannelTemplateDto[] }> {
    const items = await this.prisma.projectMicrosoftTeamsChannelTemplate.findMany({
      where: { clientId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return { items: items.map((item) => this.toTemplateDto(item)) };
  }

  async createChannelTemplate(
    clientId: string,
    dto: CreateTeamsChannelTemplateDto,
    context?: AuditContext,
  ): Promise<ProjectMicrosoftTeamsChannelTemplateDto> {
    const settings = await this.ensureSettingsRow(clientId);
    const payload = this.normalizeTemplatePayload(dto);

    if (payload.isPrimary) {
      await this.assertPrimaryTemplateAvailability(clientId);
    }

    const count = await this.prisma.projectMicrosoftTeamsChannelTemplate.count({
      where: { clientId },
    });

    try {
      const created = await this.prisma.projectMicrosoftTeamsChannelTemplate.create({
        data: {
          clientId,
          settingsId: settings.id,
          displayName: payload.displayName,
          description: payload.description,
          isPrimary: payload.isPrimary,
          sortOrder: count,
        },
      });

      await this.auditLogs.create({
        clientId,
        userId: context?.actorUserId,
        action: CHANNEL_TEMPLATE_CREATED_AUDIT_ACTION,
        resourceType: AUDIT_RESOURCE_TYPE,
        resourceId: created.id,
        newValue: this.toTemplateDto(created),
        ipAddress: context?.meta?.ipAddress,
        userAgent: context?.meta?.userAgent,
        requestId: context?.meta?.requestId,
      });

      return this.toTemplateDto(created);
    } catch (error) {
      throw this.toTemplateWriteError(error);
    }
  }

  async updateChannelTemplate(
    clientId: string,
    id: string,
    dto: UpdateTeamsChannelTemplateDto,
    context?: AuditContext,
  ): Promise<ProjectMicrosoftTeamsChannelTemplateDto> {
    const existing = await this.prisma.projectMicrosoftTeamsChannelTemplate.findFirst({
      where: { id, clientId },
    });
    if (!existing) {
      throw new NotFoundException('Template de canal introuvable');
    }

    const nextDisplayName =
      dto.displayName !== undefined ? dto.displayName.trim() : existing.displayName;
    const nextDescription =
      dto.description !== undefined ? dto.description.trim() || null : existing.description;
    const nextIsPrimary =
      dto.isPrimary !== undefined ? dto.isPrimary : existing.isPrimary;

    if (nextIsPrimary && !existing.isPrimary) {
      await this.assertPrimaryTemplateAvailability(clientId, existing.id);
    }

    try {
      const updated = await this.prisma.projectMicrosoftTeamsChannelTemplate.update({
        where: { id: existing.id },
        data: {
          displayName: nextDisplayName,
          description: nextDescription,
          isPrimary: nextIsPrimary,
        },
      });

      await this.auditLogs.create({
        clientId,
        userId: context?.actorUserId,
        action: CHANNEL_TEMPLATE_UPDATED_AUDIT_ACTION,
        resourceType: AUDIT_RESOURCE_TYPE,
        resourceId: updated.id,
        oldValue: this.toTemplateDto(existing),
        newValue: this.toTemplateDto(updated),
        ipAddress: context?.meta?.ipAddress,
        userAgent: context?.meta?.userAgent,
        requestId: context?.meta?.requestId,
      });

      return this.toTemplateDto(updated);
    } catch (error) {
      throw this.toTemplateWriteError(error);
    }
  }

  async deleteChannelTemplate(
    clientId: string,
    id: string,
    context?: AuditContext,
  ): Promise<void> {
    const existing = await this.prisma.projectMicrosoftTeamsChannelTemplate.findFirst({
      where: { id, clientId },
    });
    if (!existing) {
      throw new NotFoundException('Template de canal introuvable');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.projectMicrosoftTeamsChannelTemplate.delete({
        where: { id: existing.id },
      });

      const remaining = await tx.projectMicrosoftTeamsChannelTemplate.findMany({
        where: { clientId },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      });

      await Promise.all(
        remaining.map((item, index) =>
          item.sortOrder === index
            ? Promise.resolve()
            : tx.projectMicrosoftTeamsChannelTemplate.update({
                where: { id: item.id },
                data: { sortOrder: index },
              }),
        ),
      );
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: CHANNEL_TEMPLATE_DELETED_AUDIT_ACTION,
      resourceType: AUDIT_RESOURCE_TYPE,
      resourceId: existing.id,
      oldValue: this.toTemplateDto(existing),
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });
  }

  async reorderChannelTemplates(
    clientId: string,
    dto: ReorderTeamsChannelTemplatesDto,
    context?: AuditContext,
  ): Promise<{ items: ProjectMicrosoftTeamsChannelTemplateDto[] }> {
    const existing = await this.prisma.projectMicrosoftTeamsChannelTemplate.findMany({
      where: { clientId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    if (existing.length !== dto.items.length) {
      throw new BadRequestException('La liste de réordonnancement est incomplète');
    }

    const existingIds = new Set(existing.map((item) => item.id));
    for (const item of dto.items) {
      if (!existingIds.has(item.id)) {
        throw new BadRequestException('Template inconnu dans la liste de réordonnancement');
      }
    }

    await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.projectMicrosoftTeamsChannelTemplate.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        }),
      ),
    );

    const refreshed = await this.prisma.projectMicrosoftTeamsChannelTemplate.findMany({
      where: { clientId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    await this.auditLogs.create({
      clientId,
      userId: context?.actorUserId,
      action: CHANNEL_TEMPLATE_UPDATED_AUDIT_ACTION,
      resourceType: AUDIT_RESOURCE_TYPE,
      resourceId: clientId,
      oldValue: existing.map((item) => ({ id: item.id, sortOrder: item.sortOrder })),
      newValue: refreshed.map((item) => ({ id: item.id, sortOrder: item.sortOrder })),
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    });

    return { items: refreshed.map((item) => this.toTemplateDto(item)) };
  }

  private normalizeTemplatePayload(
    dto: CreateTeamsChannelTemplateDto,
  ): { displayName: string; description: string | null; isPrimary: boolean } {
    return {
      displayName: dto.displayName.trim(),
      description: dto.description?.trim() || null,
      isPrimary: dto.isPrimary,
    };
  }

  private async ensureSettingsRow(clientId: string) {
    const existing = await this.prisma.projectMicrosoftTeamsProvisioningSettings.findUnique({
      where: { clientId },
    });
    if (existing) {
      return existing;
    }

    return this.prisma.projectMicrosoftTeamsProvisioningSettings.create({
      data: {
        clientId,
        isEnabled: false,
        offerOnProjectCreate: false,
        teamNameTemplate: DEFAULT_TEAM_NAME_TEMPLATE,
      },
    });
  }

  private async assertPrimaryTemplateAvailability(
    clientId: string,
    excludeId?: string,
  ): Promise<void> {
    const existingPrimary = await this.prisma.projectMicrosoftTeamsChannelTemplate.findFirst({
      where: {
        clientId,
        isPrimary: true,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });

    if (existingPrimary) {
      throw new ConflictException('Un seul canal principal est autorisé par client');
    }
  }

  private toTemplateWriteError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Ce template Microsoft Teams existe déjà pour ce client');
    }
    throw error;
  }

  private toSettingsDto(
    clientId: string,
    settings:
      | {
          id: string;
          isEnabled: boolean;
          offerOnProjectCreate: boolean;
          teamNameTemplate: string;
          teamDescriptionTemplate: string | null;
          createdAt: Date;
          updatedAt: Date;
        }
      | null,
  ): ProjectMicrosoftTeamsProvisioningSettingsDto {
    return {
      id: settings?.id ?? null,
      clientId,
      isEnabled: settings?.isEnabled ?? false,
      offerOnProjectCreate: settings?.offerOnProjectCreate ?? false,
      teamNameTemplate: settings?.teamNameTemplate ?? DEFAULT_TEAM_NAME_TEMPLATE,
      teamDescriptionTemplate: settings?.teamDescriptionTemplate ?? null,
      createdAt: settings?.createdAt.toISOString() ?? null,
      updatedAt: settings?.updatedAt.toISOString() ?? null,
    };
  }

  private toTemplateDto(template: {
    id: string;
    clientId: string;
    settingsId: string;
    displayName: string;
    description: string | null;
    sortOrder: number;
    isPrimary: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): ProjectMicrosoftTeamsChannelTemplateDto {
    return {
      id: template.id,
      clientId: template.clientId,
      settingsId: template.settingsId,
      displayName: template.displayName,
      description: template.description,
      sortOrder: template.sortOrder,
      isPrimary: template.isPrimary,
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
    };
  }
}
