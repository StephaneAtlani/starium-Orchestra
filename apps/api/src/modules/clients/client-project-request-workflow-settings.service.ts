import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  GovernanceCycleStatus,
  ProjectRequestRoutingTarget,
  ProjectRequestValidatorSelectionMode,
  ProjectRequestWorkflowSettings,
  RoleScope,
  ClientUserStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AuditLogsService,
  CreateAuditLogInput,
} from '../audit-logs/audit-logs.service';
import { RequestMeta } from '../../common/decorators/request-meta.decorator';
import { UpdateClientProjectRequestWorkflowSettingsDto } from './dto/update-client-project-request-workflow-settings.dto';
import {
  isGovernanceCycleActiveForProjectRequestPool,
  isGovernanceCyclesModuleActive,
} from '../project-requests/project-request-governance-cycle.util';

export type GovernanceCycleOptionDto = {
  id: string;
  name: string;
  code: string | null;
  status: GovernanceCycleStatus;
  activeForProjectRequestPool: boolean;
};

export type ProjectRequestWorkflowSettingsResolved = {
  defaultApprovedTarget: ProjectRequestRoutingTarget;
  defaultGovernanceCycleId: string | null;
  validatorSelectionMode: ProjectRequestValidatorSelectionMode;
  authorizedValidatorUserIds: string[];
  authorizedValidatorRoleIds: string[];
  authorizedRoutingUserIds: string[];
  authorizedRoutingRoleIds: string[];
  allowRequesterToSelectValidator: boolean;
  allowValidatorToChooseRoutingTarget: boolean;
};

export type ProjectRequestWorkflowSettingsOptions = {
  governanceCyclesModuleEnabled: boolean;
  governanceCycles: GovernanceCycleOptionDto[];
  pilotingCycleTargetAvailable: boolean;
  selectedGovernanceCycleActive: boolean;
};

export type ClientProjectRequestWorkflowSettingsResponse = {
  stored: ProjectRequestWorkflowSettings;
  resolved: ProjectRequestWorkflowSettingsResolved;
  options: ProjectRequestWorkflowSettingsOptions;
};

function toResolved(
  row: ProjectRequestWorkflowSettings,
): ProjectRequestWorkflowSettingsResolved {
  return {
    defaultApprovedTarget: row.defaultApprovedTarget,
    defaultGovernanceCycleId: row.defaultGovernanceCycleId ?? null,
    validatorSelectionMode: row.validatorSelectionMode,
    authorizedValidatorUserIds: row.authorizedValidatorUserIds ?? [],
    authorizedValidatorRoleIds: row.authorizedValidatorRoleIds ?? [],
    authorizedRoutingUserIds: row.authorizedRoutingUserIds ?? [],
    authorizedRoutingRoleIds: row.authorizedRoutingRoleIds ?? [],
    allowRequesterToSelectValidator: row.allowRequesterToSelectValidator,
    allowValidatorToChooseRoutingTarget: row.allowValidatorToChooseRoutingTarget,
  };
}

@Injectable()
export class ClientProjectRequestWorkflowSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async ensureRow(clientId: string): Promise<ProjectRequestWorkflowSettings> {
    const existing = await this.prisma.projectRequestWorkflowSettings.findUnique({
      where: { clientId },
    });
    if (existing) return existing;
    return this.prisma.projectRequestWorkflowSettings.create({
      data: { clientId },
    });
  }

  private async buildOptions(
    clientId: string,
    stored: ProjectRequestWorkflowSettings,
  ): Promise<ProjectRequestWorkflowSettingsOptions> {
    const governanceCyclesModuleEnabled = await isGovernanceCyclesModuleActive(
      this.prisma,
      clientId,
    );

    const cycles = governanceCyclesModuleEnabled
      ? await this.prisma.governanceCycle.findMany({
          where: {
            clientId,
            status: { not: GovernanceCycleStatus.ARCHIVED },
          },
          select: { id: true, name: true, code: true, status: true },
          orderBy: [{ updatedAt: 'desc' }],
        })
      : [];

    const governanceCycles: GovernanceCycleOptionDto[] = cycles.map((c) => ({
      id: c.id,
      name: c.name,
      code: c.code,
      status: c.status,
      activeForProjectRequestPool: isGovernanceCycleActiveForProjectRequestPool(
        c.status,
      ),
    }));

    const selected = stored.defaultGovernanceCycleId
      ? governanceCycles.find((c) => c.id === stored.defaultGovernanceCycleId)
      : undefined;

    const pilotingCycleTargetAvailable =
      governanceCyclesModuleEnabled &&
      governanceCycles.some((c) => c.activeForProjectRequestPool);

    return {
      governanceCyclesModuleEnabled,
      governanceCycles,
      pilotingCycleTargetAvailable,
      selectedGovernanceCycleActive: selected?.activeForProjectRequestPool ?? false,
    };
  }

  private async composeResponse(
    clientId: string,
    stored: ProjectRequestWorkflowSettings,
  ): Promise<ClientProjectRequestWorkflowSettingsResponse> {
    return {
      stored,
      resolved: toResolved(stored),
      options: await this.buildOptions(clientId, stored),
    };
  }

  async getActive(
    clientId: string,
  ): Promise<ClientProjectRequestWorkflowSettingsResponse> {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true },
    });
    if (!client) {
      throw new NotFoundException('Client not found');
    }
    const stored = await this.ensureRow(clientId);
    return this.composeResponse(clientId, stored);
  }

  private async assertActiveClientUsers(
    clientId: string,
    userIds: string[],
  ): Promise<void> {
    for (const userId of userIds) {
      const cu = await this.prisma.clientUser.findUnique({
        where: { userId_clientId: { userId, clientId } },
        select: { status: true },
      });
      if (!cu || cu.status !== ClientUserStatus.ACTIVE) {
        throw new BadRequestException(
          `Utilisateur ${userId} introuvable ou inactif sur ce client`,
        );
      }
    }
  }

  private async assertClientRoles(
    clientId: string,
    roleIds: string[],
  ): Promise<void> {
    for (const roleId of roleIds) {
      const role = await this.prisma.role.findFirst({
        where: { id: roleId, scope: RoleScope.CLIENT, clientId },
        select: { id: true },
      });
      if (!role) {
        throw new BadRequestException(
          `Rôle ${roleId} introuvable pour ce client`,
        );
      }
    }
  }

  private async assertPilotingCycleConfiguration(
    clientId: string,
    cycleId: string | null | undefined,
  ): Promise<void> {
    if (!cycleId) {
      throw new BadRequestException(
        'Un cycle de pilotage doit être sélectionné pour cette cible après approbation',
      );
    }
    const moduleEnabled = await isGovernanceCyclesModuleActive(
      this.prisma,
      clientId,
    );
    if (!moduleEnabled) {
      throw new BadRequestException(
        'Le module Cycles de pilotage doit être activé pour ce client',
      );
    }
    const cycle = await this.prisma.governanceCycle.findFirst({
      where: { id: cycleId, clientId },
      select: { id: true, status: true },
    });
    if (!cycle) {
      throw new BadRequestException('Cycle de pilotage introuvable pour ce client');
    }
    if (!isGovernanceCycleActiveForProjectRequestPool(cycle.status)) {
      throw new BadRequestException(
        'Le cycle sélectionné doit être actif (non clôturé ni archivé)',
      );
    }
  }

  async updateActive(
    clientId: string,
    dto: UpdateClientProjectRequestWorkflowSettingsDto,
    context?: { actorUserId?: string; meta?: RequestMeta },
  ): Promise<ClientProjectRequestWorkflowSettingsResponse> {
    const before = await this.ensureRow(clientId);

    const validatorUserIds = dto.authorizedValidatorUserIds
      ? [...new Set(dto.authorizedValidatorUserIds)]
      : undefined;
    const validatorRoleIds = dto.authorizedValidatorRoleIds
      ? [...new Set(dto.authorizedValidatorRoleIds)]
      : undefined;
    const routingUserIds = dto.authorizedRoutingUserIds
      ? [...new Set(dto.authorizedRoutingUserIds)]
      : undefined;
    const routingRoleIds = dto.authorizedRoutingRoleIds
      ? [...new Set(dto.authorizedRoutingRoleIds)]
      : undefined;

    if (validatorUserIds?.length) {
      await this.assertActiveClientUsers(clientId, validatorUserIds);
    }
    if (validatorRoleIds?.length) {
      await this.assertClientRoles(clientId, validatorRoleIds);
    }
    if (routingUserIds?.length) {
      await this.assertActiveClientUsers(clientId, routingUserIds);
    }
    if (routingRoleIds?.length) {
      await this.assertClientRoles(clientId, routingRoleIds);
    }

    const nextTarget =
      dto.defaultApprovedTarget ?? before.defaultApprovedTarget;
    const nextCycleId =
      dto.defaultGovernanceCycleId !== undefined
        ? dto.defaultGovernanceCycleId
        : before.defaultGovernanceCycleId;

    if (nextTarget === ProjectRequestRoutingTarget.PILOTING_CYCLE) {
      await this.assertPilotingCycleConfiguration(clientId, nextCycleId);
    }

    const clearCycleId =
      dto.defaultApprovedTarget !== undefined &&
      dto.defaultApprovedTarget !== ProjectRequestRoutingTarget.PILOTING_CYCLE;

    const updated = await this.prisma.projectRequestWorkflowSettings.update({
      where: { clientId },
      data: {
        ...(dto.defaultApprovedTarget !== undefined && {
          defaultApprovedTarget: dto.defaultApprovedTarget,
        }),
        ...(dto.validatorSelectionMode !== undefined && {
          validatorSelectionMode: dto.validatorSelectionMode,
        }),
        ...(validatorUserIds !== undefined && {
          authorizedValidatorUserIds: validatorUserIds,
        }),
        ...(validatorRoleIds !== undefined && {
          authorizedValidatorRoleIds: validatorRoleIds,
        }),
        ...(routingUserIds !== undefined && {
          authorizedRoutingUserIds: routingUserIds,
        }),
        ...(routingRoleIds !== undefined && {
          authorizedRoutingRoleIds: routingRoleIds,
        }),
        ...(dto.allowRequesterToSelectValidator !== undefined && {
          allowRequesterToSelectValidator: dto.allowRequesterToSelectValidator,
        }),
        ...(dto.allowValidatorToChooseRoutingTarget !== undefined && {
          allowValidatorToChooseRoutingTarget:
            dto.allowValidatorToChooseRoutingTarget,
        }),
        ...(dto.defaultGovernanceCycleId !== undefined && {
          defaultGovernanceCycleId: dto.defaultGovernanceCycleId,
        }),
        ...(clearCycleId && { defaultGovernanceCycleId: null }),
      },
    });

    const auditInput: CreateAuditLogInput = {
      clientId,
      userId: context?.actorUserId,
      action: 'project_request.workflow_settings.updated',
      resourceType: 'client',
      resourceId: clientId,
      oldValue: { settings: before },
      newValue: { settings: updated },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    };
    await this.auditLogs.create(auditInput);

    return this.composeResponse(clientId, updated);
  }
}
