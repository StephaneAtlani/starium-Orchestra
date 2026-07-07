import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ClientUserStatus,
  RoleScope,
  StrategicDirectionStrategyWorkflowSettings,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AuditLogsService,
  CreateAuditLogInput,
} from '../audit-logs/audit-logs.service';
import { RequestMeta } from '../../common/decorators/request-meta.decorator';
import { UpdateClientStrategicDirectionStrategyWorkflowSettingsDto } from './dto/update-client-strategic-direction-strategy-workflow-settings.dto';
import {
  StrategicDirectionStrategyUserSummary,
  toStrategicDirectionStrategyUserSummary,
} from '../strategic-direction-strategy/strategic-direction-strategy-user.util';

const userSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
} as const;

export type StrategicDirectionStrategyWorkflowSettingsResolved = {
  allowSubmitterToSelectValidator: boolean;
  authorizedValidatorUserIds: string[];
  authorizedValidatorRoleIds: string[];
  defaultValidatorUserId: string | null;
};

export type ClientStrategicDirectionStrategyWorkflowSettingsResponse = {
  stored: StrategicDirectionStrategyWorkflowSettings;
  resolved: StrategicDirectionStrategyWorkflowSettingsResolved;
  options: {
    eligibleValidators: StrategicDirectionStrategyUserSummary[];
    potentialValidators: StrategicDirectionStrategyUserSummary[];
  };
};

function toResolved(
  row: StrategicDirectionStrategyWorkflowSettings,
): StrategicDirectionStrategyWorkflowSettingsResolved {
  return {
    allowSubmitterToSelectValidator: row.allowSubmitterToSelectValidator,
    authorizedValidatorUserIds: row.authorizedValidatorUserIds ?? [],
    authorizedValidatorRoleIds: row.authorizedValidatorRoleIds ?? [],
    defaultValidatorUserId: row.defaultValidatorUserId ?? null,
  };
}

@Injectable()
export class ClientStrategicDirectionStrategyWorkflowSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async ensureRow(
    clientId: string,
  ): Promise<StrategicDirectionStrategyWorkflowSettings> {
    const existing =
      await this.prisma.strategicDirectionStrategyWorkflowSettings.findUnique({
        where: { clientId },
      });
    if (existing) return existing;
    return this.prisma.strategicDirectionStrategyWorkflowSettings.create({
      data: { clientId },
    });
  }

  private async userIdsWithPermission(
    clientId: string,
    permissionCode: string,
  ): Promise<Set<string>> {
    const perm = await this.prisma.permission.findFirst({
      where: { code: permissionCode },
      select: { id: true },
    });
    if (!perm) return new Set();

    const userRoles = await this.prisma.userRole.findMany({
      where: {
        role: {
          OR: [
            { scope: RoleScope.CLIENT, clientId },
            { scope: RoleScope.GLOBAL },
          ],
          rolePermissions: { some: { permissionId: perm.id } },
        },
      },
      select: { userId: true },
    });
    return new Set(userRoles.map((ur) => ur.userId));
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

  async listEligibleValidatorUserIds(
    clientId: string,
    settings: StrategicDirectionStrategyWorkflowSettings,
    options?: { excludeUserId?: string },
  ): Promise<string[]> {
    const clientUsers = await this.prisma.clientUser.findMany({
      where: { clientId, status: ClientUserStatus.ACTIVE },
      select: { userId: true },
    });

    const reviewPermUsers = await this.userIdsWithPermission(
      clientId,
      'strategic_direction_strategy.review',
    );

    const listUsers = settings.authorizedValidatorUserIds ?? [];
    const listRoles = settings.authorizedValidatorRoleIds ?? [];
    const eligible = new Set<string>();

    if (listUsers.length === 0 && listRoles.length === 0) {
      for (const uid of reviewPermUsers) {
        eligible.add(uid);
      }
    } else {
      for (const uid of listUsers) {
        eligible.add(uid);
      }
      if (listRoles.length > 0) {
        const withRoles = await this.prisma.userRole.findMany({
          where: {
            roleId: { in: listRoles },
            role: {
              OR: [
                { scope: RoleScope.CLIENT, clientId },
                { scope: RoleScope.GLOBAL },
              ],
            },
          },
          select: { userId: true },
        });
        for (const ur of withRoles) {
          eligible.add(ur.userId);
        }
      }
      for (const uid of reviewPermUsers) {
        eligible.add(uid);
      }
    }

    return clientUsers
      .map((cu) => cu.userId)
      .filter(
        (userId) =>
          eligible.has(userId) &&
          (!options?.excludeUserId || userId !== options.excludeUserId),
      );
  }

  async listEligibleValidators(
    clientId: string,
    settings: StrategicDirectionStrategyWorkflowSettings,
    options?: { excludeUserId?: string },
  ): Promise<StrategicDirectionStrategyUserSummary[]> {
    const userIds = await this.listEligibleValidatorUserIds(
      clientId,
      settings,
      options,
    );
    if (userIds.length === 0) return [];

    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: userSelect,
    });
    const byId = new Map(users.map((user) => [user.id, user]));
    return userIds
      .map((id) => byId.get(id))
      .filter((user): user is (typeof users)[number] => Boolean(user))
      .map((user) => toStrategicDirectionStrategyUserSummary(user))
      .sort((a, b) => a.displayName.localeCompare(b.displayName, 'fr'));
  }

  async assertValidatorEligible(
    clientId: string,
    validatorUserId: string,
    settings: StrategicDirectionStrategyWorkflowSettings,
    options?: { excludeUserId?: string },
  ): Promise<void> {
    if (options?.excludeUserId && validatorUserId === options.excludeUserId) {
      throw new BadRequestException(
        'Le soumissionnaire ne peut pas être désigné comme validateur',
      );
    }

    const eligible = await this.listEligibleValidatorUserIds(
      clientId,
      settings,
      options,
    );
    if (!eligible.includes(validatorUserId)) {
      throw new BadRequestException(
        'Validateur non éligible selon les paramètres du module',
      );
    }
  }

  private async listPotentialValidators(
    clientId: string,
  ): Promise<StrategicDirectionStrategyUserSummary[]> {
    const reviewPermUsers = await this.userIdsWithPermission(
      clientId,
      'strategic_direction_strategy.review',
    );
    if (reviewPermUsers.size === 0) return [];

    const clientUsers = await this.prisma.clientUser.findMany({
      where: {
        clientId,
        status: ClientUserStatus.ACTIVE,
        userId: { in: [...reviewPermUsers] },
      },
      include: { user: { select: userSelect } },
    });

    return clientUsers
      .map((cu) => toStrategicDirectionStrategyUserSummary(cu.user))
      .sort((a, b) => a.displayName.localeCompare(b.displayName, 'fr'));
  }

  private async composeResponse(
    clientId: string,
    stored: StrategicDirectionStrategyWorkflowSettings,
  ): Promise<ClientStrategicDirectionStrategyWorkflowSettingsResponse> {
    return {
      stored,
      resolved: toResolved(stored),
      options: {
        eligibleValidators: await this.listEligibleValidators(clientId, stored),
        potentialValidators: await this.listPotentialValidators(clientId),
      },
    };
  }

  async getActive(
    clientId: string,
  ): Promise<ClientStrategicDirectionStrategyWorkflowSettingsResponse> {
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

  async updateActive(
    clientId: string,
    dto: UpdateClientStrategicDirectionStrategyWorkflowSettingsDto,
    context?: {
      actorUserId?: string;
      meta?: RequestMeta;
    },
  ): Promise<ClientStrategicDirectionStrategyWorkflowSettingsResponse> {
    const before = await this.ensureRow(clientId);

    const validatorUserIds = dto.authorizedValidatorUserIds;
    const validatorRoleIds = dto.authorizedValidatorRoleIds;

    if (validatorUserIds?.length) {
      await this.assertActiveClientUsers(clientId, validatorUserIds);
    }
    if (validatorRoleIds?.length) {
      await this.assertClientRoles(clientId, validatorRoleIds);
    }

    const nextAllowPick =
      dto.allowSubmitterToSelectValidator ?? before.allowSubmitterToSelectValidator;
    const nextDefaultValidatorId =
      dto.defaultValidatorUserId !== undefined
        ? dto.defaultValidatorUserId
        : before.defaultValidatorUserId;

    if (!nextAllowPick && !nextDefaultValidatorId) {
      throw new BadRequestException(
        'Un validateur par défaut est requis quand la sélection par le soumissionnaire est désactivée',
      );
    }

    if (nextDefaultValidatorId) {
      await this.assertActiveClientUsers(clientId, [nextDefaultValidatorId]);
      await this.assertValidatorEligible(clientId, nextDefaultValidatorId, {
        ...before,
        authorizedValidatorUserIds:
          validatorUserIds ?? before.authorizedValidatorUserIds,
        authorizedValidatorRoleIds:
          validatorRoleIds ?? before.authorizedValidatorRoleIds,
      });
    }

    const updated = await this.prisma.strategicDirectionStrategyWorkflowSettings.update({
      where: { clientId },
      data: {
        ...(dto.allowSubmitterToSelectValidator !== undefined && {
          allowSubmitterToSelectValidator: dto.allowSubmitterToSelectValidator,
        }),
        ...(validatorUserIds !== undefined && {
          authorizedValidatorUserIds: validatorUserIds,
        }),
        ...(validatorRoleIds !== undefined && {
          authorizedValidatorRoleIds: validatorRoleIds,
        }),
        ...(dto.defaultValidatorUserId !== undefined && {
          defaultValidatorUserId: dto.defaultValidatorUserId,
        }),
      },
    });

    const auditInput: CreateAuditLogInput = {
      clientId,
      userId: context?.actorUserId,
      action: 'strategic_direction_strategy.workflow_settings.updated',
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
