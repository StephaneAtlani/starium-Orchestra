import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProjectTeamColorToken } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ResourcesService } from '../resources/resources.service';
import { ProjectsService } from './projects.service';
import {
  CreateProjectTeamDto,
  ProjectTeamMemberInputDto,
  UpdateProjectTeamDto,
} from './dto/create-project-governance-circle.dto';
import {
  mapGovernanceCircle,
  PROJECT_TEAM_COLOR_TOKENS,
  type ProjectGovernanceCircleResponse,
  type ProjectTeamMemberResponse,
} from './lib/project-governance-circles.defaults';
import {
  assertGovernanceCircleIdsBelongToProject,
  ensureDefaultGovernanceCirclesForProject,
} from './lib/project-governance-circles.db';

function normalizeTeamName(raw: string): string {
  return raw.trim();
}

function assertTeamName(name: string): string {
  const n = normalizeTeamName(name);
  if (n.length < 2) {
    throw new BadRequestException(
      'Donnez un nom à l’équipe — deux caractères au minimum',
    );
  }
  if (n.length > 24) {
    throw new BadRequestException('Le nom de l’équipe est limité à 24 caractères');
  }
  return n;
}

@Injectable()
export class ProjectGovernanceCirclesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projects: ProjectsService,
    private readonly resources: ResourcesService,
  ) {}

  async ensureDefaultCirclesForProject(
    clientId: string,
    projectId: string,
  ): Promise<void> {
    await ensureDefaultGovernanceCirclesForProject(this.prisma, clientId, projectId);
  }

  async list(
    clientId: string,
    projectId: string,
  ): Promise<{ items: ProjectGovernanceCircleResponse[] }> {
    await this.projects.getProjectForScope(clientId, projectId);
    await this.ensureDefaultCirclesForProject(clientId, projectId);
    return { items: await this.loadTeamResponses(clientId, projectId) };
  }

  async getOne(
    clientId: string,
    projectId: string,
    teamId: string,
  ): Promise<ProjectGovernanceCircleResponse> {
    await this.projects.getProjectForScope(clientId, projectId);
    const items = await this.loadTeamResponses(clientId, projectId, teamId);
    const found = items[0];
    if (!found) {
      throw new NotFoundException('Équipe introuvable');
    }
    return found;
  }

  async create(
    clientId: string,
    projectId: string,
    dto: CreateProjectTeamDto,
  ): Promise<ProjectGovernanceCircleResponse> {
    await this.projects.getProjectForScope(clientId, projectId);
    await this.ensureDefaultCirclesForProject(clientId, projectId);
    const name = assertTeamName(dto.name);
    await this.assertNameAvailable(clientId, projectId, name);

    const maxOrder = await this.prisma.projectGovernanceCircle.aggregate({
      where: { clientId, projectId },
      _max: { sortOrder: true },
    });
    const colorToken =
      dto.colorToken ??
      PROJECT_TEAM_COLOR_TOKENS[
        ((maxOrder._max.sortOrder ?? -1) + 1) % PROJECT_TEAM_COLOR_TOKENS.length
      ]!;

    try {
      const resolved = await this.resolveMembersAgainstResources(
        clientId,
        dto.members,
        dto.pilotIdentityKey,
      );
      const created = await this.prisma.$transaction(async (tx) => {
        const row = await tx.projectGovernanceCircle.create({
          data: {
            clientId,
            projectId,
            name,
            label: dto.label?.trim() || null,
            colorToken,
            pilotIdentityKey: resolved.pilotIdentityKey,
            sortOrder: dto.sortOrder ?? (maxOrder._max.sortOrder ?? -1) + 1,
            systemKind: null,
          },
        });
        if (resolved.members?.length) {
          await this.replaceMembersTx(
            tx,
            clientId,
            projectId,
            row.id,
            resolved.members,
          );
        }
        if (resolved.pilotIdentityKey) {
          await this.assertPilotInMembers(
            tx,
            projectId,
            row.id,
            resolved.pilotIdentityKey,
            resolved.members,
          );
        }
        return row;
      });
      return this.getOne(clientId, projectId, created.id);
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException(
          `Une équipe ${name} existe déjà sur ce projet`,
        );
      }
      throw e;
    }
  }

  async update(
    clientId: string,
    projectId: string,
    teamId: string,
    dto: UpdateProjectTeamDto,
  ): Promise<ProjectGovernanceCircleResponse> {
    await this.projects.getProjectForScope(clientId, projectId);
    const existing = await this.prisma.projectGovernanceCircle.findFirst({
      where: { id: teamId, clientId, projectId },
    });
    if (!existing) {
      throw new NotFoundException('Équipe introuvable');
    }

    const nextName =
      dto.name != null ? assertTeamName(dto.name) : existing.name;
    if (nextName.toLowerCase() !== existing.name.toLowerCase()) {
      await this.assertNameAvailable(clientId, projectId, nextName, teamId);
    }

    try {
      const resolved = await this.resolveMembersAgainstResources(
        clientId,
        dto.members,
        dto.pilotIdentityKey !== undefined
          ? dto.pilotIdentityKey
          : existing.pilotIdentityKey,
      );
      await this.prisma.$transaction(async (tx) => {
        await tx.projectGovernanceCircle.update({
          where: { id: teamId },
          data: {
            name: nextName,
            ...(dto.label !== undefined
              ? { label: dto.label?.trim() || null }
              : {}),
            ...(dto.colorToken != null ? { colorToken: dto.colorToken } : {}),
            ...(dto.pilotIdentityKey !== undefined || dto.members
              ? { pilotIdentityKey: resolved.pilotIdentityKey }
              : {}),
            ...(dto.sortOrder != null ? { sortOrder: dto.sortOrder } : {}),
          },
        });
        if (resolved.members) {
          await this.replaceMembersTx(
            tx,
            clientId,
            projectId,
            teamId,
            resolved.members,
          );
        }
        if (resolved.pilotIdentityKey) {
          await this.assertPilotInMembers(
            tx,
            projectId,
            teamId,
            resolved.pilotIdentityKey,
            resolved.members,
          );
        }
      });
      return this.getOne(clientId, projectId, teamId);
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException(
          `Une équipe ${nextName} existe déjà sur ce projet`,
        );
      }
      throw e;
    }
  }

  /**
   * H8 — suppression autorisée même systemKind.
   * Ne retire pas les participants des points déjà convoqués.
   */
  async delete(
    clientId: string,
    projectId: string,
    circleId: string,
  ): Promise<{ reviewConvocationCount: number; name: string }> {
    await this.projects.getProjectForScope(clientId, projectId);
    const existing = await this.prisma.projectGovernanceCircle.findFirst({
      where: { id: circleId, clientId, projectId },
    });
    if (!existing) {
      throw new NotFoundException('Équipe introuvable');
    }
    const reviewConvocationCount =
      await this.prisma.projectReviewTeamConvocation.count({
        where: { clientId, projectId, teamId: circleId },
      });
    await this.prisma.$transaction(async (tx) => {
      await tx.projectTeamGovernanceMembership.deleteMany({
        where: { circleId, clientId, projectId },
      });
      await tx.projectGovernanceCircle.delete({ where: { id: circleId } });
    });
    return { reviewConvocationCount, name: existing.name };
  }

  async assertCircleIdsBelongToProject(
    clientId: string,
    projectId: string,
    circleIds: string[],
  ): Promise<void> {
    await assertGovernanceCircleIdsBelongToProject(
      this.prisma,
      clientId,
      projectId,
      circleIds,
    );
  }

  private async assertNameAvailable(
    clientId: string,
    projectId: string,
    name: string,
    excludeId?: string,
  ): Promise<void> {
    const clash = await this.prisma.projectGovernanceCircle.findFirst({
      where: {
        clientId,
        projectId,
        name: { equals: name, mode: 'insensitive' },
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    });
    if (clash) {
      throw new ConflictException(
        `Une équipe ${clash.name} existe déjà sur ce projet`,
      );
    }
  }

  async inviteDirectoryPerson(
    clientId: string,
    projectId: string,
    dto: {
      firstName: string;
      lastName: string;
      companyName?: string | null;
      email: string;
    },
  ): Promise<ProjectTeamMemberResponse> {
    await this.projects.getProjectForScope(clientId, projectId);
    const firstName = dto.firstName.trim();
    const lastName = dto.lastName.trim();
    const email = dto.email.trim().toLowerCase();
    if (!firstName || !lastName) {
      throw new BadRequestException('Prénom et nom sont obligatoires');
    }
    if (!email) {
      throw new BadRequestException('E-mail requis');
    }

    const resource = await this.resources.ensureExternalHuman(clientId, {
      firstName,
      name: lastName,
      email,
      companyName: dto.companyName,
    });

    const displayName =
      [resource.firstName, resource.name].filter(Boolean).join(' ').trim() ||
      email;

    return {
      identityKey: `r:${resource.id}`,
      userId: null,
      resourceId: resource.id,
      displayName,
      firstName: resource.firstName,
      lastName: resource.name,
      companyName: resource.companyName,
      email: resource.email,
      sortOrder: 0,
    };
  }

  /**
   * Externes sans compte → upsert Resource HUMAN EXTERNAL + identityKey `r:<id>`.
   */
  private async resolveMembersAgainstResources(
    clientId: string,
    members: ProjectTeamMemberInputDto[] | undefined,
    pilotIdentityKey: string | null | undefined,
  ): Promise<{
    members: ProjectTeamMemberInputDto[] | undefined;
    pilotIdentityKey: string | null;
  }> {
    const pilotRaw =
      pilotIdentityKey === undefined || pilotIdentityKey === null
        ? null
        : pilotIdentityKey.trim() || null;

    if (!members) {
      return { members: undefined, pilotIdentityKey: pilotRaw };
    }

    const keyMap = new Map<string, string>();
    const resolved: ProjectTeamMemberInputDto[] = [];

    for (const m of members) {
      const identityKey = m.identityKey.trim();
      const userId =
        m.userId?.trim() ||
        (identityKey.startsWith('u:') ? identityKey.slice(2) : null);

      if (userId || identityKey.startsWith('u:')) {
        resolved.push({
          ...m,
          identityKey: userId ? `u:${userId}` : identityKey,
          userId: userId || undefined,
          resourceId: null,
        });
        continue;
      }

      // Ressource RH déjà connue (`r:<id>`) — ne pas exiger d’e-mail ni recreer.
      if (identityKey.startsWith('r:')) {
        const resourceId =
          m.resourceId?.trim() || identityKey.slice(2).trim() || null;
        if (!resourceId) {
          throw new BadRequestException(
            'Ressource invalide pour ce membre d’équipe',
          );
        }
        resolved.push({
          ...m,
          identityKey: `r:${resourceId}`,
          userId: undefined,
          resourceId,
        });
        continue;
      }

      const email = m.email?.trim().toLowerCase();
      if (email) {
        const lastName =
          m.lastName?.trim() ||
          m.displayName?.trim().split(/\s+/).slice(-1)[0] ||
          'Externe';
        const firstName =
          m.firstName?.trim() ||
          m.displayName?.trim().split(/\s+/).slice(0, -1).join(' ') ||
          null;

        const resource = await this.resources.ensureExternalHuman(clientId, {
          firstName,
          name: lastName,
          email,
          companyName: m.companyName,
        });

        const newKey = `r:${resource.id}`;
        keyMap.set(identityKey, newKey);
        const displayName =
          [resource.firstName, resource.name].filter(Boolean).join(' ').trim() ||
          m.displayName?.trim() ||
          email;

        resolved.push({
          identityKey: newKey,
          userId: undefined,
          resourceId: resource.id,
          displayName,
          firstName: resource.firstName,
          lastName: resource.name,
          companyName: resource.companyName,
          email: resource.email,
          sortOrder: m.sortOrder,
        });
        continue;
      }

      // Identité « nom libre » (roster `n:…`) — membership sans Resource.
      const freeLabel =
        m.displayName?.trim() ||
        (identityKey.startsWith('n:') ? identityKey.slice(2) : '');
      if (!freeLabel) {
        throw new BadRequestException(
          'E-mail ou nom requis pour ajouter ce membre à l’équipe',
        );
      }
      resolved.push({
        ...m,
        identityKey: identityKey.startsWith('n:')
          ? identityKey
          : `n:${freeLabel.replace(/\s+/g, ' ').toLowerCase().slice(0, 120)}`,
        userId: undefined,
        resourceId: null,
        displayName: freeLabel,
        email: null,
      });
    }

    let pilot = pilotRaw;
    if (pilot && keyMap.has(pilot)) {
      pilot = keyMap.get(pilot)!;
    }

    return { members: resolved, pilotIdentityKey: pilot };
  }

  private async replaceMembersTx(
    tx: Prisma.TransactionClient,
    clientId: string,
    projectId: string,
    circleId: string,
    members: ProjectTeamMemberInputDto[],
  ): Promise<void> {
    await tx.projectTeamGovernanceMembership.deleteMany({
      where: { clientId, projectId, circleId },
    });
    const seen = new Set<string>();
    let order = 0;
    for (const m of members) {
      const identityKey = m.identityKey.trim();
      if (!identityKey || seen.has(identityKey)) continue;
      seen.add(identityKey);
      const userId =
        m.userId?.trim() ||
        (identityKey.startsWith('u:') ? identityKey.slice(2) : null);
      const resourceId =
        m.resourceId?.trim() ||
        (identityKey.startsWith('r:') ? identityKey.slice(2) : null);
      await tx.projectTeamGovernanceMembership.create({
        data: {
          clientId,
          projectId,
          circleId,
          identityKey,
          userId: userId || null,
          resourceId: userId ? null : resourceId || null,
          displayName: m.displayName?.trim() || null,
          firstName: userId ? null : m.firstName?.trim() || null,
          lastName: userId ? null : m.lastName?.trim() || null,
          companyName: userId ? null : m.companyName?.trim() || null,
          email: userId ? null : m.email?.trim().toLowerCase() || null,
          sortOrder: m.sortOrder ?? order,
        },
      });
      order += 1;
    }
  }

  private async assertPilotInMembers(
    tx: Prisma.TransactionClient,
    projectId: string,
    circleId: string,
    pilotIdentityKey: string,
    incomingMembers?: ProjectTeamMemberInputDto[],
  ): Promise<void> {
    if (incomingMembers) {
      const ok = incomingMembers.some(
        (m) => m.identityKey.trim() === pilotIdentityKey,
      );
      if (!ok && incomingMembers.length > 0) {
        throw new BadRequestException(
          'Le pilote doit faire partie des membres de l’équipe',
        );
      }
      return;
    }
    const row = await tx.projectTeamGovernanceMembership.findFirst({
      where: { projectId, circleId, identityKey: pilotIdentityKey },
    });
    if (!row) {
      throw new BadRequestException(
        'Le pilote doit faire partie des membres de l’équipe',
      );
    }
  }

  private async loadTeamResponses(
    clientId: string,
    projectId: string,
    onlyTeamId?: string,
  ): Promise<ProjectGovernanceCircleResponse[]> {
    const rows = await this.prisma.projectGovernanceCircle.findMany({
      where: {
        clientId,
        projectId,
        ...(onlyTeamId ? { id: onlyTeamId } : {}),
      },
      include: {
        memberships: { orderBy: { sortOrder: 'asc' } },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    const teamIds = rows.map((r) => r.id);
    const convCounts =
      teamIds.length === 0
        ? []
        : await this.prisma.projectReviewTeamConvocation.groupBy({
            by: ['teamId'],
            where: {
              clientId,
              projectId,
              teamId: { in: teamIds },
            },
            _count: { _all: true },
          });
    const countByTeam = new Map(
      convCounts
        .filter((c) => c.teamId != null)
        .map((c) => [c.teamId!, c._count._all]),
    );

    const userIds = [
      ...new Set(
        rows.flatMap((r) =>
          r.memberships
            .map((m) => m.userId)
            .filter((id): id is string => Boolean(id)),
        ),
      ),
    ];
    const users =
      userIds.length === 0
        ? []
        : await this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, firstName: true, lastName: true, email: true },
          });
    const userLabel = new Map(
      users.map((u) => [
        u.id,
        [u.firstName, u.lastName].filter(Boolean).join(' ').trim() ||
          u.email ||
          'Utilisateur',
      ]),
    );

    return rows.map((row) => {
      const members: ProjectTeamMemberResponse[] = row.memberships.map((m) => {
        const fromUser = m.userId ? userLabel.get(m.userId) : null;
        return {
          identityKey: m.identityKey,
          userId: m.userId,
          resourceId: m.resourceId ?? null,
          displayName:
            m.displayName?.trim() ||
            fromUser ||
            [m.firstName, m.lastName].filter(Boolean).join(' ').trim() ||
            (m.identityKey.startsWith('n:')
              ? m.identityKey.slice(2)
              : m.identityKey.startsWith('r:')
                ? 'Ressource'
                : 'Membre'),
          firstName: m.userId ? null : m.firstName?.trim() || null,
          lastName: m.userId ? null : m.lastName?.trim() || null,
          companyName: m.userId ? null : m.companyName?.trim() || null,
          email: m.userId ? null : m.email?.trim() || null,
          sortOrder: m.sortOrder,
        };
      });
      const pilotDisplayName =
        row.pilotIdentityKey == null
          ? null
          : (members.find((m) => m.identityKey === row.pilotIdentityKey)
              ?.displayName ?? null);
      return mapGovernanceCircle(row, {
        members,
        reviewConvocationCount: countByTeam.get(row.id) ?? 0,
        pilotDisplayName,
      });
    });
  }
}
