import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, WorkTeam, WorkTeamStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import {
  assertResourceHuman,
  resourceHumanDisplayName,
} from '../resources/resource-human.util';
import { CreateWorkTeamDto } from './dto/create-work-team.dto';
import { ListWorkTeamsTreeQueryDto } from './dto/list-tree.query.dto';
import { ListWorkTeamsQueryDto } from './dto/list-work-teams.query.dto';
import { UpdateWorkTeamDto } from './dto/update-work-team.dto';

const MAX_TEAM_DEPTH = 20;
const PATH_SEP = ' > ';

export type AuditMeta = {
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
};

@Injectable()
export class WorkTeamsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  normalizeCode(code: string | null | undefined): string | null {
    if (code === undefined || code === null) return null;
    const t = code.trim();
    return t.length === 0 ? null : t;
  }

  async list(clientId: string, query: ListWorkTeamsQueryDto) {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;
    const where: Prisma.WorkTeamWhereInput = { clientId };

    if (query.parentId !== undefined) {
      where.parentId = query.parentId === null ? null : query.parentId;
    }

    if (query.q?.trim()) {
      const q = query.q.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { code: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (query.status) {
      where.status = query.status;
    } else if (!query.includeArchived) {
      where.status = WorkTeamStatus.ACTIVE;
    }

    if (query.leadResourceId?.trim()) {
      where.leadResourceId = query.leadResourceId.trim();
    }

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.workTeam.count({ where }),
      this.prisma.workTeam.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        skip: offset,
        take: limit,
        include: {
          lead: { select: { name: true, firstName: true } },
          parent: { select: { name: true } },
        },
      }),
    ]);

    const items = await Promise.all(
      rows.map((w) => this.toWorkTeamResponse(clientId, w)),
    );

    return { items, total, limit, offset };
  }

  async tree(clientId: string, query: ListWorkTeamsTreeQueryDto) {
    const where: Prisma.WorkTeamWhereInput = {
      clientId,
      parentId: query.parentId ?? null,
    };
    if (!query.includeArchived) {
      where.status = WorkTeamStatus.ACTIVE;
    }

    const rows = await this.prisma.workTeam.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        include: {
        lead: { select: { name: true, firstName: true } },
        _count: { select: { children: true } },
      },
    });

    const nodes = rows.map((w) => ({
      id: w.id,
      name: w.name,
      code: w.code,
      parentId: w.parentId,
      status: w.status,
      sortOrder: w.sortOrder,
      hasChildren: w._count.children > 0,
      leadDisplayName: w.lead ? resourceHumanDisplayName(w.lead) : null,
    }));

    return { nodes };
  }

  async getById(clientId: string, id: string) {
    const w = await this.prisma.workTeam.findFirst({
      where: { id, clientId },
      include: {
        lead: { select: { name: true, firstName: true } },
        parent: { select: { name: true } },
      },
    });
    if (!w) {
      throw new NotFoundException('Equipe introuvable');
    }
    return this.toWorkTeamResponse(clientId, w);
  }

  async create(
    clientId: string,
    dto: CreateWorkTeamDto,
    actorUserId: string | undefined,
    meta?: AuditMeta,
  ) {
    const code = this.normalizeCode(dto.code ?? null);
    if (code) {
      const dup = await this.prisma.workTeam.findFirst({
        where: { clientId, code },
        select: { id: true },
      });
      if (dup) {
        throw new ConflictException('Code equipe deja utilise');
      }
    }

    if (dto.parentId) {
      await this.assertParentInClient(clientId, dto.parentId);
      await this.assertNoCycle(clientId, null, dto.parentId);
      await this.assertDepth(clientId, dto.parentId, 1);
    }

    await this.assertLeadResourceHuman(clientId, dto.leadResourceId);

    const created = await this.prisma.workTeam.create({
      data: {
        clientId,
        name: dto.name,
        code,
        parentId: dto.parentId ?? null,
        leadResourceId: dto.leadResourceId,
        sortOrder: dto.sortOrder ?? 0,
        status: WorkTeamStatus.ACTIVE,
      },
      include: {
        lead: { select: { name: true, firstName: true } },
        parent: { select: { name: true } },
      },
    });

    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'work_team.created',
      resourceType: 'work_team',
      resourceId: created.id,
      newValue: { name: created.name, code: created.code },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      requestId: meta?.requestId,
    });

    return this.toWorkTeamResponse(clientId, created);
  }

  async update(
    clientId: string,
    id: string,
    dto: UpdateWorkTeamDto,
    actorUserId: string | undefined,
    meta?: AuditMeta,
  ) {
    const existing = await this.prisma.workTeam.findFirst({
      where: { id, clientId },
    });
    if (!existing) {
      throw new NotFoundException('Equipe introuvable');
    }

    const data: Prisma.WorkTeamUpdateInput = {};

    if (dto.name !== undefined) data.name = dto.name;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;

    if (dto.code !== undefined) {
      const code = this.normalizeCode(dto.code);
      data.code = code;
      if (code) {
        const dup = await this.prisma.workTeam.findFirst({
          where: {
            clientId,
            code,
            NOT: { id: existing.id },
          },
          select: { id: true },
        });
        if (dup) {
          throw new ConflictException('Code equipe deja utilise');
        }
      }
    }

    if (dto.parentId !== undefined) {
      if (dto.parentId === null) {
        data.parent = { disconnect: true };
      } else {
        if (dto.parentId === id) {
          throw new BadRequestException('parentId invalide');
        }
        await this.assertParentInClient(clientId, dto.parentId);
        await this.assertNoCycle(clientId, id, dto.parentId);
        await this.assertDepth(clientId, dto.parentId, 1);
        data.parent = { connect: { id: dto.parentId } };
      }
    }

    if (dto.leadResourceId !== undefined) {
      if (dto.leadResourceId === null) {
        if (existing.status === WorkTeamStatus.ACTIVE) {
          throw new BadRequestException(
            'Une equipe active doit avoir un responsable designe',
          );
        }
        data.lead = { disconnect: true };
      } else {
        await this.assertLeadResourceHuman(clientId, dto.leadResourceId);
        data.lead = { connect: { id: dto.leadResourceId } };
      }
    }

    const updated = await this.prisma.workTeam.update({
      where: { id: existing.id },
      data,
      include: {
        lead: { select: { name: true, firstName: true } },
        parent: { select: { name: true } },
      },
    });

    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'work_team.updated',
      resourceType: 'work_team',
      resourceId: updated.id,
      oldValue: { name: existing.name, status: existing.status },
      newValue: { name: updated.name, status: updated.status },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      requestId: meta?.requestId,
    });

    return this.toWorkTeamResponse(clientId, updated);
  }

  async archive(
    clientId: string,
    id: string,
    actorUserId: string | undefined,
    meta?: AuditMeta,
  ) {
    const existing = await this.prisma.workTeam.findFirst({
      where: { id, clientId },
    });
    if (!existing) {
      throw new NotFoundException('Equipe introuvable');
    }
    if (existing.status === WorkTeamStatus.ARCHIVED) {
      return this.toWorkTeamResponse(
        clientId,
        await this.prisma.workTeam.findFirstOrThrow({
          where: { id },
          include: {
            lead: { select: { name: true, firstName: true } },
            parent: { select: { name: true } },
          },
        }),
      );
    }

    const updated = await this.prisma.workTeam.update({
      where: { id: existing.id },
      data: {
        status: WorkTeamStatus.ARCHIVED,
        archivedAt: new Date(),
      },
      include: {
        lead: { select: { name: true, firstName: true } },
        parent: { select: { name: true } },
      },
    });

    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'work_team.archived',
      resourceType: 'work_team',
      resourceId: updated.id,
      oldValue: { status: existing.status },
      newValue: { status: updated.status },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      requestId: meta?.requestId,
    });

    return this.toWorkTeamResponse(clientId, updated);
  }

  async restore(
    clientId: string,
    id: string,
    actorUserId: string | undefined,
    meta?: AuditMeta,
  ) {
    const existing = await this.prisma.workTeam.findFirst({
      where: { id, clientId },
    });
    if (!existing) {
      throw new NotFoundException('Equipe introuvable');
    }
    if (existing.status === WorkTeamStatus.ACTIVE) {
      return this.toWorkTeamResponse(
        clientId,
        await this.prisma.workTeam.findFirstOrThrow({
          where: { id },
          include: {
            lead: { select: { name: true, firstName: true } },
            parent: { select: { name: true } },
          },
        }),
      );
    }

    const updated = await this.prisma.workTeam.update({
      where: { id: existing.id },
      data: {
        status: WorkTeamStatus.ACTIVE,
        archivedAt: null,
      },
      include: {
        lead: { select: { name: true, firstName: true } },
        parent: { select: { name: true } },
      },
    });

    await this.auditLogs.create({
      clientId,
      userId: actorUserId,
      action: 'work_team.restored',
      resourceType: 'work_team',
      resourceId: updated.id,
      oldValue: { status: existing.status },
      newValue: { status: updated.status },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      requestId: meta?.requestId,
    });

    return this.toWorkTeamResponse(clientId, updated);
  }

  async assertTeamInClient(clientId: string, teamId: string) {
    const t = await this.prisma.workTeam.findFirst({
      where: { id: teamId, clientId },
      select: { id: true },
    });
    if (!t) {
      throw new NotFoundException('Equipe introuvable');
    }
  }

  private async assertParentInClient(clientId: string, parentId: string) {
    const p = await this.prisma.workTeam.findFirst({
      where: { id: parentId, clientId },
      select: { id: true },
    });
    if (!p) {
      throw new BadRequestException('parentId hors perimetre client');
    }
  }

  /** `excludeId` = team being moved (ignore self as descendant). */
  private async assertNoCycle(
    clientId: string,
    excludeId: string | null,
    parentId: string,
  ) {
    let current: string | null = parentId;
    let depth = 0;
    while (current) {
      if (excludeId && current === excludeId) {
        throw new BadRequestException('Cycle parent interdit');
      }
      const parentRow: { parentId: string | null } | null =
        await this.prisma.workTeam.findFirst({
          where: { id: current, clientId },
          select: { parentId: true },
        });
      if (!parentRow) break;
      current = parentRow.parentId;
      depth += 1;
      if (depth > MAX_TEAM_DEPTH + 5) {
        throw new BadRequestException('Cycle parent interdit');
      }
    }
  }

  private async assertDepth(
    clientId: string,
    parentId: string,
    additionalDepth: number,
  ) {
    let depth = 0;
    let current: string | null = parentId;
    while (current) {
      const parentRow: { parentId: string | null } | null =
        await this.prisma.workTeam.findFirst({
          where: { id: current, clientId },
          select: { parentId: true },
        });
      if (!parentRow) break;
      depth += 1;
      current = parentRow.parentId;
    }
    if (depth + additionalDepth > MAX_TEAM_DEPTH) {
      throw new BadRequestException(
        `Profondeur hierarchique max ${MAX_TEAM_DEPTH}`,
      );
    }
  }

  async assertLeadResourceHuman(clientId: string, resourceId: string) {
    await assertResourceHuman(this.prisma, clientId, resourceId);
  }

  private async toWorkTeamResponse(
    clientId: string,
    w: WorkTeam & {
      lead?: { name: string; firstName: string | null } | null;
      parent?: { name: string } | null;
    },
  ) {
    const pathLabel = await this.buildPathLabel(clientId, w);
    return {
      id: w.id,
      clientId: w.clientId,
      name: w.name,
      code: w.code,
      parentId: w.parentId,
      status: w.status,
      archivedAt: w.archivedAt,
      sortOrder: w.sortOrder,
      leadResourceId: w.leadResourceId,
      createdAt: w.createdAt,
      updatedAt: w.updatedAt,
      parentTeamName: w.parent?.name ?? null,
      leadDisplayName: w.lead ? resourceHumanDisplayName(w.lead) : null,
      pathLabel,
    };
  }

  private async buildPathLabel(
    clientId: string,
    w: Pick<WorkTeam, 'id' | 'name' | 'parentId'>,
  ): Promise<string> {
    const segments: string[] = [w.name];
    let currentId: string | null = w.parentId;
    let guard = 0;
    while (currentId && guard < MAX_TEAM_DEPTH + 5) {
      const p = await this.prisma.workTeam.findFirst({
        where: { id: currentId, clientId },
        select: { name: true, parentId: true },
      });
      if (!p) break;
      segments.unshift(p.name);
      currentId = p.parentId;
      guard += 1;
    }
    return segments.join(PATH_SEP);
  }
}
