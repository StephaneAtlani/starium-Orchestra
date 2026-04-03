import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  Resource,
  ResourceAffiliation,
  ResourceType,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import type { AuditContext } from '../budget-management/types/audit-context';
import { CreateResourceDto } from './dto/create-resource.dto';
import { ListResourcesQueryDto } from './dto/list-resources.query.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';
import { CollaboratorsService } from '../collaborators/collaborators.service';

export type ResourceRoleEmbed = {
  id: string;
  name: string;
  code: string | null;
};

export type ResourceListItemDto = {
  id: string;
  name: string;
  firstName: string | null;
  code: string | null;
  type: ResourceType;
  email: string | null;
  affiliation: ResourceAffiliation | null;
  companyName: string | null;
  dailyRate: string | null;
  metadata: unknown | null;
  createdAt: string;
  updatedAt: string;
  role: ResourceRoleEmbed | null;
  /** Si non null : ressource HUMAN alignée sur un membre client (même email) — identité en lecture seule côté catalogue. */
  linkedUserId: string | null;
};

export type ResourceDetailDto = ResourceListItemDto;

@Injectable()
export class ResourcesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
    private readonly collaborators: CollaboratorsService,
  ) {}

  private hasPresentKey(raw: Record<string, unknown>, key: string): boolean {
    return Object.prototype.hasOwnProperty.call(raw, key);
  }

  private decimalToString(d: Prisma.Decimal | null | undefined): string | null {
    if (d === null || d === undefined) return null;
    return d.toString();
  }

  private toDetail(
    r: Resource & { resourceRole: { id: string; name: string; code: string | null } | null },
    linkedUserId: string | null = null,
  ): ResourceDetailDto {
    return {
      id: r.id,
      name: r.name,
      firstName: r.firstName ?? null,
      code: r.code,
      type: r.type,
      email: r.email,
      affiliation: r.affiliation ?? null,
      companyName: r.companyName ?? null,
      dailyRate: this.decimalToString(r.dailyRate as unknown as Prisma.Decimal),
      metadata: r.metadata,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      role:
        r.type === 'HUMAN' && r.resourceRole
          ? {
              id: r.resourceRole.id,
              name: r.resourceRole.name,
              code: r.resourceRole.code,
            }
          : null,
      linkedUserId,
    };
  }

  /** Membre client dont l’email correspond à la ressource HUMAN (compte plateforme rattaché au client). */
  private async resolveLinkedUserId(
    clientId: string,
    r: { type: ResourceType; email: string | null },
  ): Promise<string | null> {
    if (r.type !== ResourceType.HUMAN || !r.email?.trim()) {
      return null;
    }
    const cu = await this.prisma.clientUser.findFirst({
      where: {
        clientId,
        user: {
          email: { equals: r.email.trim(), mode: 'insensitive' },
        },
      },
      select: { userId: true },
    });
    return cu?.userId ?? null;
  }

  private async emailToLinkedUserIdMap(clientId: string): Promise<Map<string, string>> {
    const rows = await this.prisma.clientUser.findMany({
      where: { clientId },
      select: { userId: true, user: { select: { email: true } } },
    });
    const m = new Map<string, string>();
    for (const cu of rows) {
      m.set(cu.user.email.trim().toLowerCase(), cu.userId);
    }
    return m;
  }

  /**
   * Après création / mise à jour d’une ressource Humaine : aligne le collaborateur MANUAL
   * (membre → identité User ; hors membre → nom / prénom de la fiche ressource).
   */
  private async syncCollaboratorAfterHumanResource(
    clientId: string,
    r: Resource,
  ): Promise<void> {
    if (r.type !== ResourceType.HUMAN || !r.email?.trim()) return;
    const linkedUserId = await this.resolveLinkedUserId(clientId, r);
    if (linkedUserId) {
      const u = await this.prisma.user.findUnique({
        where: { id: linkedUserId },
        select: { email: true, firstName: true, lastName: true },
      });
      if (u) {
        await this.collaborators.syncFromHumanIdentity(clientId, {
          email: u.email,
          firstName: u.firstName,
          lastName: u.lastName ?? '',
        });
      }
      return;
    }
    await this.collaborators.syncFromHumanIdentity(clientId, {
      email: r.email!,
      firstName: r.firstName,
      lastName: r.name,
    });
  }

  private validateTypeRules(
    type: ResourceType,
    raw: Record<string, unknown>,
    mode: 'create' | 'update',
  ): void {
    const forbidden = [
      'email',
      'roleId',
      'dailyRate',
      'affiliation',
      'firstName',
      'companyName',
    ] as const;
    if (type === 'MATERIAL' || type === 'LICENSE') {
      for (const key of forbidden) {
        if (this.hasPresentKey(raw, key)) {
          throw new BadRequestException(
            `Le champ "${key}" n'est pas autorisé pour le type ${type}`,
          );
        }
      }
    }
    if (type === 'HUMAN' && this.hasPresentKey(raw, 'metadata')) {
      throw new BadRequestException(
        'Le champ "metadata" n\'est pas autorisé pour le type HUMAN',
      );
    }
  }

  /** roleId défini : ResourceRole doit exister et être du même client — sinon 404 (RFC). */
  private async assertResourceRoleForClient(
    clientId: string,
    roleId: string | null | undefined,
  ): Promise<void> {
    if (roleId === undefined || roleId === null || roleId === '') return;
    const rr = await this.prisma.resourceRole.findFirst({
      where: { id: roleId, clientId },
    });
    if (!rr) {
      throw new NotFoundException('Rôle métier introuvable');
    }
  }

  async list(
    clientId: string,
    query: ListResourcesQueryDto,
  ): Promise<{
    items: ResourceListItemDto[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const offset = query.offset ?? 0;
    const limit = query.limit ?? 50;
    const where: Prisma.ResourceWhereInput = { clientId };
    if (query.type) where.type = query.type;
    if (query.search?.trim()) {
      const s = query.search.trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { firstName: { contains: s, mode: 'insensitive' } },
        { code: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
        { companyName: { contains: s, mode: 'insensitive' } },
      ];
    }
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.resource.count({ where }),
      this.prisma.resource.findMany({
        where,
        include: { resourceRole: true },
        orderBy: { name: 'asc' },
        skip: offset,
        take: limit,
      }),
    ]);
    const emailMap = await this.emailToLinkedUserIdMap(clientId);
    return {
      items: rows.map((r) => {
        const linked =
          r.type === ResourceType.HUMAN && r.email?.trim()
            ? emailMap.get(r.email.trim().toLowerCase()) ?? null
            : null;
        return this.toDetail(r, linked);
      }),
      total,
      limit,
      offset,
    };
  }

  async getById(clientId: string, id: string): Promise<ResourceDetailDto> {
    const r = await this.prisma.resource.findFirst({
      where: { id, clientId },
      include: { resourceRole: true },
    });
    if (!r) {
      throw new NotFoundException('Ressource introuvable');
    }
    const linked = await this.resolveLinkedUserId(clientId, r);
    return this.toDetail(r, linked);
  }

  async create(
    clientId: string,
    dto: CreateResourceDto,
    rawBody: Record<string, unknown>,
    context: AuditContext,
  ): Promise<ResourceDetailDto> {
    this.validateTypeRules(dto.type, rawBody, 'create');
    if (dto.roleId) {
      await this.assertResourceRoleForClient(clientId, dto.roleId);
    }
    try {
      const createData: Prisma.ResourceCreateInput = {
        client: { connect: { id: clientId } },
        name: dto.name.trim(),
        code: dto.code?.trim() || null,
        type: dto.type,
      };
      if (dto.type === 'HUMAN') {
        createData.firstName = dto.firstName?.trim() || null;
        createData.email = dto.email ?? null;
        const aff = dto.affiliation ?? ResourceAffiliation.INTERNAL;
        createData.affiliation = aff;
        createData.companyName =
          aff === ResourceAffiliation.EXTERNAL
            ? dto.companyName?.trim() || null
            : null;
        createData.dailyRate =
          dto.dailyRate != null ? new Prisma.Decimal(dto.dailyRate) : null;
        if (dto.roleId) {
          createData.resourceRole = { connect: { id: dto.roleId } };
        }
      }
      if (dto.type === 'MATERIAL' || dto.type === 'LICENSE') {
        if (dto.metadata !== undefined) {
          createData.metadata =
            dto.metadata === null
              ? Prisma.JsonNull
              : (dto.metadata as Prisma.InputJsonValue);
        }
      }
      const created = await this.prisma.resource.create({
        data: createData,
        include: { resourceRole: true },
      });
      await this.auditLogs.create({
        clientId,
        userId: context.actorUserId,
        action: 'resource.created',
        resourceType: 'resource',
        resourceId: created.id,
        newValue: { name: created.name, type: created.type },
        ipAddress: context.meta?.ipAddress,
        userAgent: context.meta?.userAgent,
        requestId: context.meta?.requestId,
      });
      const linked = await this.resolveLinkedUserId(clientId, created);
      await this.syncCollaboratorAfterHumanResource(clientId, created);
      return this.toDetail(created, linked);
    } catch (e) {
      this.rethrowUnique(e);
      throw e;
    }
  }

  async update(
    clientId: string,
    id: string,
    dto: UpdateResourceDto,
    rawBody: Record<string, unknown>,
    context: AuditContext,
  ): Promise<ResourceDetailDto> {
    const existing = await this.prisma.resource.findFirst({
      where: { id, clientId },
    });
    if (!existing) {
      throw new NotFoundException('Ressource introuvable');
    }
    this.validateTypeRules(existing.type, rawBody, 'update');

    const linkedUserId = await this.resolveLinkedUserId(clientId, existing);
    const identityLocked =
      linkedUserId !== null && existing.type === ResourceType.HUMAN;
    if (identityLocked) {
      const identityMsg =
        'Nom, prénom et email sont gérés depuis le membre client : modifiez le membre correspondant.';
      if (dto.name !== undefined && dto.name.trim() !== existing.name.trim()) {
        throw new BadRequestException(identityMsg);
      }
      if (
        dto.firstName !== undefined &&
        (dto.firstName?.trim() ?? '') !== (existing.firstName?.trim() ?? '')
      ) {
        throw new BadRequestException(identityMsg);
      }
      if (dto.email !== undefined) {
        const cur = existing.email?.trim().toLowerCase() ?? '';
        const next = (dto.email as string)?.trim().toLowerCase() ?? '';
        if (cur !== next) {
          throw new BadRequestException(identityMsg);
        }
      }
    }

    const data: Prisma.ResourceUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.code !== undefined) data.code = dto.code?.trim() || null;
    if (dto.firstName !== undefined) {
      if (existing.type !== 'HUMAN') {
        throw new BadRequestException('firstName réservé au type HUMAN');
      }
      data.firstName = dto.firstName?.trim() || null;
    }
    if (dto.email !== undefined) {
      if (existing.type !== 'HUMAN') {
        throw new BadRequestException('email réservé au type HUMAN');
      }
      data.email = dto.email;
    }
    if (dto.roleId !== undefined) {
      if (existing.type !== 'HUMAN') {
        throw new BadRequestException('roleId réservé au type HUMAN');
      }
      await this.assertResourceRoleForClient(clientId, dto.roleId || undefined);
      data.resourceRole = dto.roleId
        ? { connect: { id: dto.roleId } }
        : { disconnect: true };
    }
    if (dto.dailyRate !== undefined) {
      if (existing.type !== 'HUMAN') {
        throw new BadRequestException('dailyRate réservé au type HUMAN');
      }
      data.dailyRate =
        dto.dailyRate == null ? null : new Prisma.Decimal(dto.dailyRate);
    }
    if (dto.affiliation !== undefined) {
      if (existing.type !== 'HUMAN') {
        throw new BadRequestException('affiliation réservée au type HUMAN');
      }
      data.affiliation = dto.affiliation;
      if (dto.affiliation !== ResourceAffiliation.EXTERNAL) {
        data.companyName = null;
      }
    }
    if (dto.companyName !== undefined) {
      if (existing.type !== 'HUMAN') {
        throw new BadRequestException('companyName réservé au type HUMAN');
      }
      const effAff =
        (dto.affiliation !== undefined
          ? dto.affiliation
          : existing.affiliation) ?? ResourceAffiliation.INTERNAL;
      data.companyName =
        effAff === ResourceAffiliation.EXTERNAL
          ? dto.companyName?.trim() || null
          : null;
    }
    if (dto.metadata !== undefined) {
      if (existing.type === 'HUMAN') {
        throw new BadRequestException('metadata réservé aux types MATERIAL et LICENSE');
      }
      data.metadata =
        dto.metadata === null
          ? Prisma.JsonNull
          : (dto.metadata as Prisma.InputJsonValue);
    }
    if (Object.keys(data).length === 0) {
      const r = await this.prisma.resource.findFirst({
        where: { id, clientId },
        include: { resourceRole: true },
      });
      if (!r) throw new NotFoundException('Ressource introuvable');
      const linked = await this.resolveLinkedUserId(clientId, r);
      return this.toDetail(r, linked);
    }
    try {
      const updated = await this.prisma.resource.update({
        where: { id },
        data,
        include: { resourceRole: true },
      });
      await this.auditLogs.create({
        clientId,
        userId: context.actorUserId,
        action: 'resource.updated',
        resourceType: 'resource',
        resourceId: updated.id,
        oldValue: { name: existing.name },
        newValue: { name: updated.name },
        ipAddress: context.meta?.ipAddress,
        userAgent: context.meta?.userAgent,
        requestId: context.meta?.requestId,
      });
      const linkedAfter = await this.resolveLinkedUserId(clientId, updated);
      await this.syncCollaboratorAfterHumanResource(clientId, updated);
      return this.toDetail(updated, linkedAfter);
    } catch (e) {
      this.rethrowUnique(e);
      throw e;
    }
  }

  private rethrowUnique(e: unknown): void {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002'
    ) {
      throw new ConflictException('Contrainte d\'unicité (email ou code)');
    }
  }
}
