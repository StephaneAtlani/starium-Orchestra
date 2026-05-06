import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ClientModuleStatus,
  ClientUserStatus,
  ModuleVisibilityScopeType,
  ModuleVisibilityState,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestMeta } from '../../common/decorators/request-meta.decorator';
import {
  AuditLogsService,
  CreateAuditLogInput,
} from '../audit-logs/audit-logs.service';
import { SetModuleVisibilityDto } from './dto/set-module-visibility.dto';

export type ModuleVisibilityOverrideRow = {
  id: string;
  scopeType: ModuleVisibilityScopeType;
  scopeId: string | null;
  visibility: ModuleVisibilityState;
  /** Libellé métier pour l’UI (jamais seul un ID). */
  scopeLabel: string;
};

export type ModuleVisibilityMatrixRow = {
  moduleCode: string;
  moduleName: string;
  overrides: ModuleVisibilityOverrideRow[];
};

@Injectable()
export class ModuleVisibilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  /**
   * USER > GROUP (VISIBLE l’emporte sur HIDDEN) > CLIENT > défaut visible.
   */
  computeVisibilityForModule(
    moduleCode: string,
    userId: string,
    rows: Array<{
      moduleCode: string;
      scopeType: ModuleVisibilityScopeType;
      scopeId: string | null;
      visibility: ModuleVisibilityState;
    }>,
    userGroupIds: Set<string>,
  ): boolean {
    const byModule = rows.filter((r) => r.moduleCode === moduleCode);

    const userRow = byModule.find(
      (r) => r.scopeType === ModuleVisibilityScopeType.USER && r.scopeId === userId,
    );
    if (userRow) return userRow.visibility === ModuleVisibilityState.VISIBLE;

    const groupRows = byModule.filter(
      (r) =>
        r.scopeType === ModuleVisibilityScopeType.GROUP &&
        r.scopeId != null &&
        userGroupIds.has(r.scopeId),
    );
    if (groupRows.some((r) => r.visibility === ModuleVisibilityState.VISIBLE)) {
      return true;
    }
    if (groupRows.some((r) => r.visibility === ModuleVisibilityState.HIDDEN)) {
      return false;
    }

    const clientRow = byModule.find(
      (r) =>
        r.scopeType === ModuleVisibilityScopeType.CLIENT && r.scopeId === null,
    );
    if (clientRow) {
      return clientRow.visibility === ModuleVisibilityState.VISIBLE;
    }

    return true;
  }

  async isVisibleForUser(
    userId: string,
    clientId: string,
    moduleCode: string,
  ): Promise<boolean> {
    const map = await this.getVisibilityMap(userId, clientId, [moduleCode]);
    return map.get(moduleCode) ?? true;
  }

  async getVisibilityMap(
    userId: string,
    clientId: string,
    moduleCodes: string[],
  ): Promise<Map<string, boolean>> {
    const unique = [...new Set(moduleCodes.filter((c) => c.length > 0))];
    const result = new Map<string, boolean>();
    if (unique.length === 0) return result;

    const [allRows, members] = await Promise.all([
      this.prisma.clientModuleVisibility.findMany({
        where: { clientId, moduleCode: { in: unique } },
      }),
      this.prisma.accessGroupMember.findMany({
        where: { clientId, userId },
        select: { groupId: true },
      }),
    ]);
    const userGroupIds = new Set(members.map((m) => m.groupId));

    for (const code of unique) {
      result.set(
        code,
        this.computeVisibilityForModule(code, userId, allRows, userGroupIds),
      );
    }
    return result;
  }

  /** Modules activés pour le client et visibles pour l’utilisateur (GET /me/permissions). */
  async getVisibleModuleCodesForUser(
    userId: string,
    clientId: string,
  ): Promise<string[]> {
    const enabled = await this.prisma.clientModule.findMany({
      where: { clientId, status: ClientModuleStatus.ENABLED },
      include: { module: { select: { code: true, isActive: true } } },
    });
    const codes = enabled
      .filter((cm) => cm.module.isActive)
      .map((cm) => cm.module.code);
    if (codes.length === 0) return [];

    const visMap = await this.getVisibilityMap(userId, clientId, codes);
    return codes.filter((c) => visMap.get(c) !== false);
  }

  async listMatrix(clientId: string): Promise<ModuleVisibilityMatrixRow[]> {
    const enabled = await this.prisma.clientModule.findMany({
      where: { clientId, status: ClientModuleStatus.ENABLED },
      include: { module: { select: { code: true, name: true } } },
      orderBy: { module: { code: 'asc' } },
    });

    const rows = await this.prisma.clientModuleVisibility.findMany({
      where: { clientId },
    });

    const groupIds = [
      ...new Set(
        rows
          .filter(
            (r) =>
              r.scopeType === ModuleVisibilityScopeType.GROUP && r.scopeId != null,
          )
          .map((r) => r.scopeId as string),
      ),
    ];
    const userIds = [
      ...new Set(
        rows
          .filter(
            (r) =>
              r.scopeType === ModuleVisibilityScopeType.USER && r.scopeId != null,
          )
          .map((r) => r.scopeId as string),
      ),
    ];

    const [groups, users] = await Promise.all([
      groupIds.length
        ? this.prisma.accessGroup.findMany({
            where: { clientId, id: { in: groupIds } },
            select: { id: true, name: true },
          })
        : [],
      userIds.length
        ? this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, email: true, firstName: true, lastName: true },
          })
        : [],
    ]);

    const groupName = new Map(groups.map((g) => [g.id, g.name]));
    const userLabel = new Map(
      users.map((u) => {
        const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
        return [u.id, name || u.email];
      }),
    );

    return enabled.map((cm) => ({
      moduleCode: cm.module.code,
      moduleName: cm.module.name,
      overrides: rows
        .filter((r) => r.moduleCode === cm.module.code)
        .map((r) => ({
          id: r.id,
          scopeType: r.scopeType,
          scopeId: r.scopeId,
          visibility: r.visibility,
          scopeLabel:
            r.scopeType === ModuleVisibilityScopeType.CLIENT
              ? 'Tout le client'
              : r.scopeType === ModuleVisibilityScopeType.GROUP
                ? (r.scopeId ? groupName.get(r.scopeId) ?? 'Groupe' : 'Groupe')
                : (r.scopeId ? userLabel.get(r.scopeId) ?? 'Utilisateur' : 'Utilisateur'),
        })),
    }));
  }

  async setOverride(
    clientId: string,
    dto: SetModuleVisibilityDto,
    context?: { actorUserId?: string; meta?: RequestMeta },
  ): Promise<{ id: string }> {
    this.validateScopePayload(dto);

    if (dto.scopeType === ModuleVisibilityScopeType.GROUP) {
      const g = await this.prisma.accessGroup.findFirst({
        where: { id: dto.scopeId!, clientId },
        select: { id: true },
      });
      if (!g) {
        throw new BadRequestException('Groupe introuvable pour ce client');
      }
    }

    if (dto.scopeType === ModuleVisibilityScopeType.USER) {
      const cu = await this.prisma.clientUser.findFirst({
        where: {
          clientId,
          userId: dto.scopeId!,
          status: ClientUserStatus.ACTIVE,
        },
        select: { id: true },
      });
      if (!cu) {
        throw new BadRequestException(
          "Utilisateur non membre actif de ce client",
        );
      }
    }

    const enabled = await this.prisma.clientModule.findFirst({
      where: {
        clientId,
        status: ClientModuleStatus.ENABLED,
        module: { code: dto.moduleCode, isActive: true },
      },
      select: { id: true },
    });
    if (!enabled) {
      throw new BadRequestException(
        'Module inconnu, inactif ou non activé pour ce client',
      );
    }

    const whereUnique: Prisma.ClientModuleVisibilityWhereInput =
      dto.scopeType === ModuleVisibilityScopeType.CLIENT
        ? {
            clientId,
            moduleCode: dto.moduleCode,
            scopeType: ModuleVisibilityScopeType.CLIENT,
            scopeId: null,
          }
        : {
            clientId,
            moduleCode: dto.moduleCode,
            scopeType: dto.scopeType,
            scopeId: dto.scopeId!,
          };

    const existing = await this.prisma.clientModuleVisibility.findFirst({
      where: whereUnique,
    });

    let row: { id: string };
    if (existing) {
      row = await this.prisma.clientModuleVisibility.update({
        where: { id: existing.id },
        data: { visibility: dto.visibility },
        select: { id: true },
      });
      await this.logVisibility('module_visibility.updated', {
        clientId,
        resourceId: row.id,
        oldValue: {
          visibility: existing.visibility,
          scopeType: existing.scopeType,
          scopeId: existing.scopeId,
          moduleCode: dto.moduleCode,
        },
        newValue: {
          visibility: dto.visibility,
          scopeType: dto.scopeType,
          scopeId: dto.scopeId ?? null,
          moduleCode: dto.moduleCode,
        },
        context,
      });
    } else {
      const created = await this.prisma.clientModuleVisibility.create({
        data: {
          clientId,
          moduleCode: dto.moduleCode,
          scopeType: dto.scopeType,
          scopeId:
            dto.scopeType === ModuleVisibilityScopeType.CLIENT
              ? null
              : dto.scopeId!,
          visibility: dto.visibility,
        },
        select: { id: true },
      });
      row = created;
      await this.logVisibility('module_visibility.updated', {
        clientId,
        resourceId: row.id,
        newValue: {
          visibility: dto.visibility,
          scopeType: dto.scopeType,
          scopeId: dto.scopeId ?? null,
          moduleCode: dto.moduleCode,
        },
        context,
      });
    }

    return row;
  }

  async removeOverride(
    clientId: string,
    moduleCode: string,
    scopeType: ModuleVisibilityScopeType,
    scopeId: string | undefined,
    context?: { actorUserId?: string; meta?: RequestMeta },
  ): Promise<void> {
    if (scopeType === ModuleVisibilityScopeType.CLIENT && scopeId != null) {
      throw new BadRequestException('scopeId doit être absent pour le scope CLIENT');
    }
    if (
      (scopeType === ModuleVisibilityScopeType.GROUP ||
        scopeType === ModuleVisibilityScopeType.USER) &&
      !scopeId
    ) {
      throw new BadRequestException('scopeId requis pour GROUP ou USER');
    }

    const where: Prisma.ClientModuleVisibilityWhereInput =
      scopeType === ModuleVisibilityScopeType.CLIENT
        ? {
            clientId,
            moduleCode,
            scopeType: ModuleVisibilityScopeType.CLIENT,
            scopeId: null,
          }
        : {
            clientId,
            moduleCode,
            scopeType,
            scopeId: scopeId!,
          };

    const existing = await this.prisma.clientModuleVisibility.findFirst({
      where,
    });
    if (!existing) {
      throw new NotFoundException('Règle de visibilité introuvable');
    }

    await this.logVisibility('module_visibility.updated', {
      clientId,
      resourceId: existing.id,
      oldValue: {
        visibility: existing.visibility,
        scopeType: existing.scopeType,
        scopeId: existing.scopeId,
        moduleCode,
      },
      context,
    });

    await this.prisma.clientModuleVisibility.delete({
      where: { id: existing.id },
    });
  }

  private validateScopePayload(dto: SetModuleVisibilityDto): void {
    if (dto.scopeType === ModuleVisibilityScopeType.CLIENT) {
      if (dto.scopeId != null && dto.scopeId !== '') {
        throw new BadRequestException('scopeId doit être absent pour le scope CLIENT');
      }
      return;
    }
    if (!dto.scopeId?.trim()) {
      throw new BadRequestException('scopeId requis pour GROUP ou USER');
    }
  }

  private async logVisibility(
    action: string,
    params: {
      clientId: string;
      resourceId: string;
      oldValue?: unknown;
      newValue?: unknown;
      context?: { actorUserId?: string; meta?: RequestMeta };
    },
  ): Promise<void> {
    const input: CreateAuditLogInput = {
      clientId: params.clientId,
      userId: params.context?.actorUserId,
      action,
      resourceType: 'client_module_visibility',
      resourceId: params.resourceId,
      ipAddress: params.context?.meta?.ipAddress,
      userAgent: params.context?.meta?.userAgent,
      requestId: params.context?.meta?.requestId,
      oldValue: params.oldValue,
      newValue: params.newValue,
    };
    await this.auditLogs.create(input);
  }
}
