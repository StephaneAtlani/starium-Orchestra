import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import {
  CollaboratorStatus,
  ManagerScopeMode,
  Prisma,
  ResourceType,
  WorkTeamStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import {
  assertResourceHuman,
  resourceHumanDisplayName,
} from '../resources/resource-human.util';
import { PreviewManagerScopeQueryDto } from './dto/preview-manager-scope.query.dto';
import { PutManagerScopeDto } from './dto/put-manager-scope.dto';
import { AuditMeta } from './work-teams.service';

@Injectable()
export class ManagerScopesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async get(clientId: string, managerResourceId: string) {
    await assertResourceHuman(this.prisma, clientId, managerResourceId);

    const row = await this.prisma.managerScopeConfig.findFirst({
      where: { managerResourceId, clientId },
      include: {
        rootTeams: {
          include: { workTeam: { select: { id: true, name: true, code: true } } },
        },
      },
    });

    if (!row) {
      return this.defaultConfigResponse(clientId, managerResourceId);
    }

    return this.toConfigResponse(clientId, row);
  }

  async put(
    clientId: string,
    managerResourceId: string,
    dto: PutManagerScopeDto,
    actorUserId: string | undefined,
    meta?: AuditMeta,
  ) {
    await assertResourceHuman(this.prisma, clientId, managerResourceId);

    for (const tid of dto.rootTeamIds) {
      const t = await this.prisma.workTeam.findFirst({
        where: { id: tid, clientId },
        select: { id: true, status: true },
      });
      if (!t) {
        throw new BadRequestException('Racine equipe invalide');
      }
      if (t.status === WorkTeamStatus.ARCHIVED) {
        throw new ConflictException('Racine equipe archivee');
      }
    }

    const existing = await this.prisma.managerScopeConfig.findFirst({
      where: { managerResourceId, clientId },
      include: { rootTeams: true },
    });

    const saved = await this.prisma.$transaction(async (tx) => {
      const config = existing
        ? await tx.managerScopeConfig.update({
            where: { id: existing.id },
            data: {
              mode: dto.mode,
              includeDirectReports: dto.includeDirectReports,
              includeTeamSubtree: dto.includeTeamSubtree,
            },
          })
        : await tx.managerScopeConfig.create({
            data: {
              clientId,
              managerResourceId,
              mode: dto.mode,
              includeDirectReports: dto.includeDirectReports,
              includeTeamSubtree: dto.includeTeamSubtree,
            },
          });

      await tx.managerScopeRootTeam.deleteMany({
        where: { managerScopeConfigId: config.id },
      });

      if (dto.rootTeamIds.length > 0) {
        await tx.managerScopeRootTeam.createMany({
          data: dto.rootTeamIds.map((workTeamId) => ({
            clientId,
            managerScopeConfigId: config.id,
            workTeamId,
          })),
        });
      }

      return tx.managerScopeConfig.findFirstOrThrow({
        where: { id: config.id },
        include: {
          rootTeams: {
            include: {
              workTeam: { select: { id: true, name: true, code: true } },
            },
          },
        },
      });
    });

    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'manager_scope.updated',
      resourceType: 'manager_scope',
      resourceId: saved.id,
      oldValue: existing
        ? {
            mode: existing.mode,
            rootTeamIds: existing.rootTeams.map((r) => r.workTeamId),
          }
        : null,
      newValue: {
        mode: saved.mode,
        rootTeamIds: dto.rootTeamIds,
      },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      requestId: meta?.requestId,
    });

    return this.toConfigResponse(clientId, saved);
  }

  async preview(
    clientId: string,
    managerResourceId: string,
    query: PreviewManagerScopeQueryDto,
  ) {
    await assertResourceHuman(this.prisma, clientId, managerResourceId);

    const row = await this.prisma.managerScopeConfig.findFirst({
      where: { managerResourceId, clientId },
      include: { rootTeams: true },
    });

    const mode = row?.mode ?? ManagerScopeMode.DIRECT_REPORTS_ONLY;
    const includeDirectReports = row?.includeDirectReports ?? true;
    const includeTeamSubtree = row?.includeTeamSubtree ?? false;
    const rootIds = row?.rootTeams.map((r) => r.workTeamId) ?? [];

    const ids = await this.resolveScopedIds(clientId, {
      managerResourceId,
      mode,
      includeDirectReports,
      includeTeamSubtree,
      rootTeamIds: rootIds,
    });

    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;

    const where: Prisma.ResourceWhereInput = {
      clientId,
      type: ResourceType.HUMAN,
      id: { in: [...ids] },
    };

    if (query.q?.trim()) {
      const q = query.q.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { firstName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.resource.count({ where }),
      this.prisma.resource.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: offset,
        take: limit,
        select: {
          id: true,
          name: true,
          firstName: true,
          email: true,
        },
      }),
    ]);

    return {
      items: rows.map((r) => ({
        resourceId: r.id,
        displayName: resourceHumanDisplayName(r),
        email: r.email,
      })),
      total,
      limit,
      offset,
    };
  }

  private defaultConfigResponse(clientId: string, managerResourceId: string) {
    return {
      id: null as string | null,
      clientId,
      managerResourceId,
      mode: ManagerScopeMode.DIRECT_REPORTS_ONLY,
      includeDirectReports: true,
      includeTeamSubtree: false,
      createdAt: null as Date | null,
      updatedAt: null as Date | null,
      rootTeams: [] as Array<{
        workTeamId: string;
        teamName: string;
        teamCode: string | null;
      }>,
    };
  }

  private toConfigResponse(
    clientId: string,
    row: {
      id: string;
      managerResourceId: string;
      mode: ManagerScopeMode;
      includeDirectReports: boolean;
      includeTeamSubtree: boolean;
      createdAt: Date;
      updatedAt: Date;
      rootTeams: Array<{
        workTeam: { id: string; name: string; code: string | null };
      }>;
    },
  ) {
    return {
      id: row.id,
      clientId,
      managerResourceId: row.managerResourceId,
      mode: row.mode,
      includeDirectReports: row.includeDirectReports,
      includeTeamSubtree: row.includeTeamSubtree,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      rootTeams: row.rootTeams.map((r) => ({
        workTeamId: r.workTeam.id,
        teamName: r.workTeam.name,
        teamCode: r.workTeam.code,
      })),
    };
  }

  private async expandSubtreeTeamIds(
    clientId: string,
    rootIds: string[],
  ): Promise<string[]> {
    const all = new Set<string>(rootIds);
    let frontier = [...rootIds];
    while (frontier.length > 0) {
      const children = await this.prisma.workTeam.findMany({
        where: { clientId, parentId: { in: frontier } },
        select: { id: true },
      });
      frontier = [];
      for (const c of children) {
        if (!all.has(c.id)) {
          all.add(c.id);
          frontier.push(c.id);
        }
      }
    }
    return [...all];
  }

  /** Identifiants personne dans le périmètre : même espace d’id que Collaborator après migration (Resource HUMAN alignée). */
  private async resolveScopedIds(
    clientId: string,
    params: {
      managerResourceId: string;
      mode: ManagerScopeMode;
      includeDirectReports: boolean;
      includeTeamSubtree: boolean;
      rootTeamIds: string[];
    },
  ): Promise<Set<string>> {
    const out = new Set<string>();

    if (params.mode === ManagerScopeMode.DIRECT_REPORTS_ONLY) {
      const directs = await this.prisma.collaborator.findMany({
        where: {
          clientId,
          managerId: params.managerResourceId,
          status: CollaboratorStatus.ACTIVE,
        },
        select: { id: true },
      });
      directs.forEach((d) => out.add(d.id));
      return out;
    }

    if (params.includeDirectReports) {
      const directs = await this.prisma.collaborator.findMany({
        where: {
          clientId,
          managerId: params.managerResourceId,
          status: CollaboratorStatus.ACTIVE,
        },
        select: { id: true },
      });
      directs.forEach((d) => out.add(d.id));
    }

    if (params.includeTeamSubtree && params.rootTeamIds.length > 0) {
      const teamIds = await this.expandSubtreeTeamIds(
        clientId,
        params.rootTeamIds,
      );
      const members = await this.prisma.workTeamMembership.findMany({
        where: { clientId, workTeamId: { in: teamIds } },
        select: { resourceId: true },
      });
      members.forEach((m) => out.add(m.resourceId));
    }

    return out;
  }
}
