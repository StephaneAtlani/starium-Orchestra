import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ClientUserStatus,
  Prisma,
  ProjectGovernanceCircleSystemKind,
  ProjectRaciKind,
  ProjectStatus,
  ProjectTeamMemberAffiliation,
  ProjectTeamRoleSystemKind,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProjectTeamRoleDto } from './dto/create-project-team-role.dto';
import { UpdateProjectTeamRoleDto } from './dto/update-project-team-role.dto';
import { AddProjectTeamMemberDto } from './dto/add-project-team-member.dto';
import { UpdateProjectTeamMemberCirclesDto } from './dto/update-project-team-member-circles.dto';
import {
  assertGovernanceCircleIdsBelongToProject,
  ensureDefaultGovernanceCirclesForProject,
} from './lib/project-governance-circles.db';
import { assertProjectSheetEditable } from './lib/project-sheet-editing-locked';

export type ProjectTeamMemberGovernanceCircleRef = {
  id: string;
  name: string;
  systemKind: ProjectGovernanceCircleSystemKind | null;
};

export type ProjectTeamRoleResponse = {
  id: string;
  clientId: string;
  name: string;
  sortOrder: number;
  systemKind: ProjectTeamRoleSystemKind | null;
};

export type ProjectTeamMemberResponse = {
  id: string;
  projectId: string;
  roleId: string;
  roleName: string;
  systemKind: ProjectTeamRoleSystemKind | null;
  memberKind: 'USER' | 'NAMED';
  userId: string | null;
  displayName: string;
  email: string;
  affiliation: ProjectTeamMemberAffiliation | null;
  identityKey: string;
  governanceCircles: ProjectTeamMemberGovernanceCircleRef[];
};

export type ProjectRaciActionResponse = {
  id: string;
  label: string;
  sortOrder: number;
};

export type ProjectRaciActorResponse = {
  id: string;
  name: string;
  sortOrder: number;
};

export type ProjectRaciCellResponse = {
  actionId: string;
  roleId: string;
  kind: ProjectRaciKind;
};

export type ProjectRaciMatrixResponse = {
  actions: ProjectRaciActionResponse[];
  actors: ProjectRaciActorResponse[];
  cells: ProjectRaciCellResponse[];
};

function normalizeFreeIdentityKey(freeLabel: string): string {
  const n = freeLabel.trim().replace(/\s+/g, ' ').toLowerCase();
  if (!n.length) {
    throw new BadRequestException('Le nom est requis');
  }
  return `n:${n.slice(0, 120)}`;
}

function governanceCirclesForIdentity(
  identityKey: string,
  byIdentity: Map<string, ProjectTeamMemberGovernanceCircleRef[]>,
): ProjectTeamMemberGovernanceCircleRef[] {
  const items = byIdentity.get(identityKey) ?? [];
  return [...items].sort(
    (a, b) => a.name.localeCompare(b.name, 'fr') || a.id.localeCompare(b.id),
  );
}

@Injectable()
export class ProjectTeamService {
  constructor(private readonly prisma: PrismaService) {}

  private roleLooksLikeSponsor(name: string): boolean {
    const n = name.trim().toLowerCase();
    return n === 'sponsor';
  }

  private roleLooksLikeOwner(name: string): boolean {
    const n = name.trim().toLowerCase();
    return n === 'responsable de projet' || n === 'responsable projet';
  }

  private mapMemberRow(
    m: {
      id: string;
      projectId: string;
      roleId: string;
      userId: string | null;
      freeLabel: string | null;
      affiliation: ProjectTeamMemberAffiliation | null;
      identityKey: string;
      role: { name: string; systemKind: ProjectTeamRoleSystemKind | null };
      user: {
        email: string;
        firstName: string | null;
        lastName: string | null;
      } | null;
    },
    byIdentity: Map<string, ProjectTeamMemberGovernanceCircleRef[]>,
  ): ProjectTeamMemberResponse {
    const isUser = m.userId != null && m.user != null;
    const displayName = isUser
      ? [m.user!.firstName, m.user!.lastName].filter(Boolean).join(' ').trim() ||
        m.user!.email
      : (m.freeLabel?.trim() ?? '—');
    return {
      id: m.id,
      projectId: m.projectId,
      roleId: m.roleId,
      roleName: m.role.name,
      systemKind: m.role.systemKind,
      memberKind: isUser ? 'USER' : 'NAMED',
      userId: m.userId,
      displayName,
      email: isUser ? m.user!.email : '',
      affiliation: m.affiliation ?? null,
      identityKey: m.identityKey,
      governanceCircles: governanceCirclesForIdentity(m.identityKey, byIdentity),
    };
  }

  private async loadGovernanceCirclesByIdentity(
    clientId: string,
    projectId: string,
  ): Promise<Map<string, ProjectTeamMemberGovernanceCircleRef[]>> {
    await ensureDefaultGovernanceCirclesForProject(this.prisma, clientId, projectId);
    const rows = await this.prisma.projectTeamGovernanceMembership.findMany({
      where: { clientId, projectId },
      include: {
        circle: {
          select: { id: true, name: true, systemKind: true },
        },
      },
    });
    const map = new Map<string, ProjectTeamMemberGovernanceCircleRef[]>();
    for (const row of rows) {
      const cur = map.get(row.identityKey) ?? [];
      cur.push({
        id: row.circle.id,
        name: row.circle.name,
        systemKind: row.circle.systemKind,
      });
      map.set(row.identityKey, cur);
    }
    return map;
  }

  private async replaceGovernanceCirclesForIdentity(
    db: Pick<PrismaService, 'projectTeamGovernanceMembership'>,
    clientId: string,
    projectId: string,
    identityKey: string,
    circleIds: string[] | undefined,
  ): Promise<void> {
    if (circleIds === undefined) return;
    await assertGovernanceCircleIdsBelongToProject(
      this.prisma,
      clientId,
      projectId,
      circleIds,
    );
    const unique = [...new Set(circleIds)];
    await db.projectTeamGovernanceMembership.deleteMany({
      where: { projectId, identityKey },
    });
    if (unique.length === 0) return;
    await db.projectTeamGovernanceMembership.createMany({
      data: unique.map((circleId) => ({
        clientId,
        projectId,
        identityKey,
        circleId,
      })),
    });
  }

  private async resolveMemberIdentityKey(
    clientId: string,
    projectId: string,
    memberId: string,
  ): Promise<string> {
    if (memberId === this.virtualMemberId(projectId, ProjectTeamRoleSystemKind.OWNER)) {
      const project = await this.prisma.project.findFirst({
        where: { id: projectId, clientId },
        select: { ownerUserId: true, ownerFreeLabel: true },
      });
      if (!project) throw new NotFoundException('Project not found');
      if (project.ownerUserId) return `u:${project.ownerUserId}`;
      if (project.ownerFreeLabel?.trim()) {
        return normalizeFreeIdentityKey(project.ownerFreeLabel);
      }
      throw new BadRequestException('Aucun responsable de projet à mettre à jour');
    }
    if (memberId === this.virtualMemberId(projectId, ProjectTeamRoleSystemKind.SPONSOR)) {
      const project = await this.prisma.project.findFirst({
        where: { id: projectId, clientId },
        select: { sponsorUserId: true },
      });
      if (!project?.sponsorUserId) {
        throw new BadRequestException('Aucun sponsor à mettre à jour');
      }
      return `u:${project.sponsorUserId}`;
    }
    const member = await this.prisma.projectTeamMember.findFirst({
      where: { id: memberId, clientId, projectId },
      select: { identityKey: true },
    });
    if (!member) throw new NotFoundException('Team member not found');
    return member.identityKey;
  }

  /**
   * Rôles catalogue par défaut (Sponsor, Responsable de projet, Référent métier).
   * Idempotent : complète par `systemKind` / nom même si le client avait déjà d’autres rôles
   * (l’ancienne seed ne s’exécutait que sur catalogue vide).
   */
  async ensureDefaultTeamRolesForClient(clientId: string): Promise<void> {
    await this.ensureSystemTeamRole(
      clientId,
      ProjectTeamRoleSystemKind.SPONSOR,
      'Sponsor',
      0,
    );
    await this.ensureSystemTeamRole(
      clientId,
      ProjectTeamRoleSystemKind.OWNER,
      'Responsable de projet',
      1,
    );
    await this.ensureMetierDefaultRole(clientId);
  }

  /** @deprecated alias — utiliser `ensureDefaultTeamRolesForClient` */
  async seedDefaultRolesForClient(clientId: string): Promise<void> {
    await this.ensureDefaultTeamRolesForClient(clientId);
  }

  private async ensureSystemTeamRole(
    clientId: string,
    kind: ProjectTeamRoleSystemKind,
    defaultName: string,
    sortOrder: number,
  ): Promise<void> {
    const found = await this.prisma.projectTeamRole.findFirst({
      where: { clientId, systemKind: kind },
    });
    if (found) return;

    try {
      await this.prisma.projectTeamRole.create({
        data: {
          clientId,
          name: defaultName,
          sortOrder,
          systemKind: kind,
        },
      });
    } catch (e: unknown) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        const clash = await this.prisma.projectTeamRole.findUnique({
          where: { clientId_name: { clientId, name: defaultName } },
        });
        if (clash && clash.systemKind == null) {
          await this.prisma.projectTeamRole.update({
            where: { id: clash.id },
            data: { systemKind: kind, sortOrder },
          });
        }
        return;
      }
      throw e;
    }
  }

  private async ensureMetierDefaultRole(clientId: string): Promise<void> {
    const name = 'Référent métier';
    const found = await this.prisma.projectTeamRole.findFirst({
      where: { clientId, name },
    });
    if (found) return;

    try {
      await this.prisma.projectTeamRole.create({
        data: {
          clientId,
          name,
          sortOrder: 2,
          systemKind: null,
        },
      });
    } catch (e: unknown) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        return;
      }
      throw e;
    }
  }

  private async assertActiveClientUser(
    clientId: string,
    userId: string,
  ): Promise<void> {
    const cu = await this.prisma.clientUser.findFirst({
      where: { userId, clientId, status: ClientUserStatus.ACTIVE },
    });
    if (!cu) {
      throw new BadRequestException(
        'User must be an active member of the client',
      );
    }
  }

  private canonicalRoleKind(
    role: { systemKind: ProjectTeamRoleSystemKind | null; name: string },
  ): ProjectTeamRoleSystemKind | null {
    if (role.systemKind != null) return role.systemKind;
    if (this.roleLooksLikeSponsor(role.name)) return ProjectTeamRoleSystemKind.SPONSOR;
    if (this.roleLooksLikeOwner(role.name)) return ProjectTeamRoleSystemKind.OWNER;
    return null;
  }

  private virtualMemberId(projectId: string, kind: ProjectTeamRoleSystemKind): string {
    return `virtual:${projectId}:${kind.toLowerCase()}`;
  }

  private mapRole(r: {
    id: string;
    clientId: string;
    name: string;
    sortOrder: number;
    systemKind: ProjectTeamRoleSystemKind | null;
  }): ProjectTeamRoleResponse {
    return {
      id: r.id,
      clientId: r.clientId,
      name: r.name,
      sortOrder: r.sortOrder,
      systemKind: r.systemKind,
    };
  }

  async listRoles(clientId: string): Promise<ProjectTeamRoleResponse[]> {
    await this.ensureDefaultTeamRolesForClient(clientId);
    const rows = await this.prisma.projectTeamRole.findMany({
      where: { clientId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return rows.map((r) => this.mapRole(r));
  }

  async createRole(
    clientId: string,
    dto: CreateProjectTeamRoleDto,
  ): Promise<ProjectTeamRoleResponse> {
    const name = dto.name.trim();
    if (!name.length) {
      throw new BadRequestException('Role name is required');
    }
    const created = await this.prisma.projectTeamRole.create({
      data: {
        clientId,
        name,
        sortOrder: dto.sortOrder ?? 0,
        systemKind: null,
      },
    });
    return this.mapRole(created);
  }

  async updateRole(
    clientId: string,
    roleId: string,
    dto: UpdateProjectTeamRoleDto,
  ): Promise<ProjectTeamRoleResponse> {
    const existing = await this.prisma.projectTeamRole.findFirst({
      where: { id: roleId, clientId },
    });
    if (!existing) {
      throw new NotFoundException('Team role not found');
    }
    if (existing.systemKind != null && dto.name !== undefined) {
      throw new BadRequestException(
        'Cannot rename a system role (Sponsor / Responsable)',
      );
    }
    const data: Prisma.ProjectTeamRoleUpdateInput = {};
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name.length) throw new BadRequestException('Invalid name');
      data.name = name;
    }
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;

    try {
      const updated = await this.prisma.projectTeamRole.update({
        where: { id: roleId },
        data,
      });
      return this.mapRole(updated);
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('A role with this name already exists');
      }
      throw e;
    }
  }

  async deleteRole(clientId: string, roleId: string): Promise<void> {
    const existing = await this.prisma.projectTeamRole.findFirst({
      where: { id: roleId, clientId },
      include: { _count: { select: { members: true } } },
    });
    if (!existing) {
      throw new NotFoundException('Team role not found');
    }
    if (existing._count.members > 0) {
      throw new BadRequestException(
        'Remove team members from this role before deleting it',
      );
    }
    await this.prisma.projectTeamRole.delete({ where: { id: roleId } });
  }

  private async getProjectOrThrow(
    clientId: string,
    projectId: string,
  ): Promise<{ id: string; status: ProjectStatus }> {
    const p = await this.prisma.project.findFirst({
      where: { id: projectId, clientId },
    });
    if (!p) throw new NotFoundException('Project not found');
    assertProjectSheetEditable(p);
    return p;
  }

  async getTeam(
    clientId: string,
    projectId: string,
  ): Promise<ProjectTeamMemberResponse[]> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, clientId },
      include: {
        owner: true,
        sponsor: true,
      },
    });
    if (!project) throw new NotFoundException('Project not found');
    await this.ensureDefaultTeamRolesForClient(clientId);
    const roles = await this.prisma.projectTeamRole.findMany({
      where: { clientId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    const ownerRole =
      roles.find((r) => this.canonicalRoleKind(r) === ProjectTeamRoleSystemKind.OWNER) ?? null;
    const sponsorRole =
      roles.find((r) => this.canonicalRoleKind(r) === ProjectTeamRoleSystemKind.SPONSOR) ?? null;

    const members = await this.prisma.projectTeamMember.findMany({
      where: { clientId, projectId },
      include: {
        role: true,
        user: true,
      },
      orderBy: [{ role: { sortOrder: 'asc' } }, { createdAt: 'asc' }],
    });
    const circlesByIdentity = await this.loadGovernanceCirclesByIdentity(clientId, projectId);
    const filtered = members.filter(
      (m) => this.canonicalRoleKind(m.role) == null,
    );
    const out = filtered.map((m) => this.mapMemberRow(m, circlesByIdentity));

    if (ownerRole) {
      if (project.ownerUserId && project.owner) {
        const display =
          [project.owner.firstName, project.owner.lastName].filter(Boolean).join(' ').trim() ||
          project.owner.email;
        const identityKey = `u:${project.ownerUserId}`;
        out.unshift({
          id: this.virtualMemberId(projectId, ProjectTeamRoleSystemKind.OWNER),
          projectId,
          roleId: ownerRole.id,
          roleName: ownerRole.name,
          systemKind: ownerRole.systemKind,
          memberKind: 'USER',
          userId: project.ownerUserId,
          displayName: display,
          email: project.owner.email,
          affiliation: null,
          identityKey,
          governanceCircles: governanceCirclesForIdentity(identityKey, circlesByIdentity),
        });
      } else if (project.ownerFreeLabel?.trim()) {
        const label = project.ownerFreeLabel.trim();
        const identityKey = normalizeFreeIdentityKey(label);
        out.unshift({
          id: this.virtualMemberId(projectId, ProjectTeamRoleSystemKind.OWNER),
          projectId,
          roleId: ownerRole.id,
          roleName: ownerRole.name,
          systemKind: ownerRole.systemKind,
          memberKind: 'NAMED',
          userId: null,
          displayName: label,
          email: '',
          affiliation: project.ownerAffiliation ?? null,
          identityKey,
          governanceCircles: governanceCirclesForIdentity(identityKey, circlesByIdentity),
        });
      }
    }

    if (sponsorRole && project.sponsorUserId && project.sponsor) {
      const display =
        [project.sponsor.firstName, project.sponsor.lastName].filter(Boolean).join(' ').trim() ||
        project.sponsor.email;
      const identityKey = `u:${project.sponsorUserId}`;
      out.unshift({
        id: this.virtualMemberId(projectId, ProjectTeamRoleSystemKind.SPONSOR),
        projectId,
        roleId: sponsorRole.id,
        roleName: sponsorRole.name,
        systemKind: sponsorRole.systemKind,
        memberKind: 'USER',
        userId: project.sponsorUserId,
        displayName: display,
        email: project.sponsor.email,
        affiliation: null,
        identityKey,
        governanceCircles: governanceCirclesForIdentity(identityKey, circlesByIdentity),
      });
    }

    return out;
  }

  /**
   * Aligne les membres **utilisateur** des rôles système Sponsor / Responsable projet
   * sur les champs `Project.sponsorUserId` / `ownerUserId` (saisie fiche ou API projet).
   * Les entrées « nom libre » sur ces rôles ne sont pas supprimées.
   */
  async syncTeamMembersFromProjectSponsorOwner(
    clientId: string,
    projectId: string,
    sponsorUserId: string | null,
    ownerUserId: string | null,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await this.replaceSystemRoleUserMember(
        tx,
        clientId,
        projectId,
        ProjectTeamRoleSystemKind.SPONSOR,
        sponsorUserId,
      );
      await this.replaceSystemRoleUserMember(
        tx,
        clientId,
        projectId,
        ProjectTeamRoleSystemKind.OWNER,
        ownerUserId,
      );
      await this.syncProjectSponsorOwner(tx, projectId, clientId);
    });
  }

  private async replaceSystemRoleUserMember(
    tx: Prisma.TransactionClient,
    clientId: string,
    projectId: string,
    systemKind: ProjectTeamRoleSystemKind,
    userId: string | null,
  ): Promise<void> {
    const roles = await tx.projectTeamRole.findMany({
      where: { clientId },
      select: { id: true, systemKind: true, name: true },
    });
    const role =
      roles.find((r) => r.systemKind === systemKind) ??
      roles.find((r) =>
        systemKind === ProjectTeamRoleSystemKind.SPONSOR
          ? this.roleLooksLikeSponsor(r.name)
          : this.roleLooksLikeOwner(r.name),
      );
    if (!role) return;

    await tx.projectTeamMember.deleteMany({
      where: {
        projectId,
        roleId: role.id,
        userId: { not: null },
      },
    });

    if (userId) {
      await tx.projectTeamMember.create({
        data: {
          clientId,
          projectId,
          roleId: role.id,
          userId,
          freeLabel: null,
          affiliation: null,
          identityKey: `u:${userId}`,
        },
      });
    }
  }

  private async syncProjectSponsorOwner(
    tx: Prisma.TransactionClient,
    projectId: string,
    clientId: string,
  ): Promise<void> {
    const roles = await tx.projectTeamRole.findMany({
      where: { clientId },
      select: { id: true, systemKind: true, name: true },
    });
    const sponsorRole =
      roles.find((r) => r.systemKind === ProjectTeamRoleSystemKind.SPONSOR) ??
      roles.find((r) => this.roleLooksLikeSponsor(r.name));
    const ownerRole =
      roles.find((r) => r.systemKind === ProjectTeamRoleSystemKind.OWNER) ??
      roles.find((r) => this.roleLooksLikeOwner(r.name));

    let sponsorUserId: string | null = null;
    let ownerUserId: string | null = null;

    if (sponsorRole) {
      const first = await tx.projectTeamMember.findFirst({
        where: { projectId, roleId: sponsorRole.id, userId: { not: null } },
        orderBy: { createdAt: 'asc' },
      });
      sponsorUserId = first?.userId ?? null;
    }
    if (ownerRole) {
      const first = await tx.projectTeamMember.findFirst({
        where: { projectId, roleId: ownerRole.id, userId: { not: null } },
        orderBy: { createdAt: 'asc' },
      });
      ownerUserId = first?.userId ?? null;
    }

    await tx.project.update({
      where: { id: projectId },
      data: { sponsorUserId, ownerUserId },
    });
  }

  async addMember(
    clientId: string,
    projectId: string,
    dto: AddProjectTeamMemberDto,
  ): Promise<ProjectTeamMemberResponse> {
    await this.getProjectOrThrow(clientId, projectId);
    const role = await this.prisma.projectTeamRole.findFirst({
      where: { id: dto.roleId, clientId },
    });
    if (!role) {
      throw new NotFoundException('Team role not found');
    }
    const canonical = this.canonicalRoleKind(role);

    const userIdTrim = dto.userId?.trim();
    const freeTrim = dto.freeLabel?.trim();
    const hasUser = Boolean(userIdTrim);
    const hasFree = Boolean(freeTrim);

    if (hasUser === hasFree) {
      throw new BadRequestException(
        'Indiquez soit un utilisateur de la liste, soit un nom libre avec interne / externe',
      );
    }

    let identityKey: string;
    let data: {
      clientId: string;
      projectId: string;
      roleId: string;
      userId: string | null;
      freeLabel: string | null;
      affiliation: ProjectTeamMemberAffiliation | null;
      identityKey: string;
    };

    if (hasUser) {
      await this.assertActiveClientUser(clientId, userIdTrim!);
      identityKey = `u:${userIdTrim}`;
      data = {
        clientId,
        projectId,
        roleId: dto.roleId,
        userId: userIdTrim!,
        freeLabel: null,
        affiliation: null,
        identityKey,
      };
    } else {
      if (
        dto.affiliation !== ProjectTeamMemberAffiliation.INTERNAL &&
        dto.affiliation !== ProjectTeamMemberAffiliation.EXTERNAL
      ) {
        throw new BadRequestException(
          'Pour un nom libre, choisissez interne ou externe',
        );
      }
      const label = freeTrim!.slice(0, 200);
      identityKey = normalizeFreeIdentityKey(label);
      data = {
        clientId,
        projectId,
        roleId: dto.roleId,
        userId: null,
        freeLabel: label,
        affiliation: dto.affiliation,
        identityKey,
      };
    }

    try {
      if (canonical === ProjectTeamRoleSystemKind.SPONSOR) {
        if (!hasUser) {
          throw new BadRequestException(
            'Le rôle Sponsor doit être affecté à un utilisateur du client',
          );
        }
        await this.prisma.project.update({
          where: { id: projectId },
          data: { sponsorUserId: userIdTrim! },
        });
        await this.replaceGovernanceCirclesForIdentity(
          this.prisma,
          clientId,
          projectId,
          identityKey,
          dto.circleIds,
        );
        const user = await this.prisma.user.findUnique({ where: { id: userIdTrim! } });
        const circlesByIdentity = await this.loadGovernanceCirclesByIdentity(clientId, projectId);
        return {
          id: this.virtualMemberId(projectId, ProjectTeamRoleSystemKind.SPONSOR),
          projectId,
          roleId: role.id,
          roleName: role.name,
          systemKind: role.systemKind,
          memberKind: 'USER',
          userId: userIdTrim!,
          displayName:
            user
              ? [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.email
              : userIdTrim!,
          email: user?.email ?? '',
          affiliation: null,
          identityKey,
          governanceCircles: governanceCirclesForIdentity(identityKey, circlesByIdentity),
        };
      }
      if (canonical === ProjectTeamRoleSystemKind.OWNER) {
        if (hasUser) {
          await this.prisma.project.update({
            where: { id: projectId },
            data: {
              ownerUserId: userIdTrim!,
              ownerFreeLabel: null,
              ownerAffiliation: null,
            },
          });
          await this.replaceGovernanceCirclesForIdentity(
            this.prisma,
            clientId,
            projectId,
            identityKey,
            dto.circleIds,
          );
          const user = await this.prisma.user.findUnique({ where: { id: userIdTrim! } });
          const circlesByIdentity = await this.loadGovernanceCirclesByIdentity(clientId, projectId);
          return {
            id: this.virtualMemberId(projectId, ProjectTeamRoleSystemKind.OWNER),
            projectId,
            roleId: role.id,
            roleName: role.name,
            systemKind: role.systemKind,
            memberKind: 'USER',
            userId: userIdTrim!,
            displayName:
              user
                ? [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.email
                : userIdTrim!,
            email: user?.email ?? '',
            affiliation: null,
            identityKey,
            governanceCircles: governanceCirclesForIdentity(identityKey, circlesByIdentity),
          };
        }
        await this.prisma.project.update({
          where: { id: projectId },
          data: {
            ownerUserId: null,
            ownerFreeLabel: freeTrim!.slice(0, 200),
            ownerAffiliation: dto.affiliation ?? null,
          },
        });
        await this.replaceGovernanceCirclesForIdentity(
          this.prisma,
          clientId,
          projectId,
          identityKey,
          dto.circleIds,
        );
        const circlesByIdentity = await this.loadGovernanceCirclesByIdentity(clientId, projectId);
        return {
          id: this.virtualMemberId(projectId, ProjectTeamRoleSystemKind.OWNER),
          projectId,
          roleId: role.id,
          roleName: role.name,
          systemKind: role.systemKind,
          memberKind: 'NAMED',
          userId: null,
          displayName: freeTrim!.slice(0, 200),
          email: '',
          affiliation: dto.affiliation ?? null,
          identityKey,
          governanceCircles: governanceCirclesForIdentity(identityKey, circlesByIdentity),
        };
      }
      const member = await this.prisma.$transaction(async (tx) => {
        const created = await tx.projectTeamMember.create({
          data,
          include: { role: true, user: true },
        });
        await this.replaceGovernanceCirclesForIdentity(
          tx,
          clientId,
          projectId,
          identityKey,
          dto.circleIds,
        );
        await this.syncProjectSponsorOwner(tx, projectId, clientId);
        return created;
      });
      const circlesByIdentity = await this.loadGovernanceCirclesByIdentity(clientId, projectId);
      return this.mapMemberRow(member, circlesByIdentity);
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException(
          'Ce membre est déjà affecté à ce rôle pour ce projet',
        );
      }
      throw e;
    }
  }

  async updateMemberCircles(
    clientId: string,
    projectId: string,
    memberId: string,
    dto: UpdateProjectTeamMemberCirclesDto,
  ): Promise<ProjectTeamMemberResponse> {
    await this.getProjectOrThrow(clientId, projectId);
    const identityKey = await this.resolveMemberIdentityKey(clientId, projectId, memberId);
    await this.replaceGovernanceCirclesForIdentity(
      this.prisma,
      clientId,
      projectId,
      identityKey,
      dto.circleIds,
    );
    const team = await this.getTeam(clientId, projectId);
    const updated = team.find((m) => m.id === memberId);
    if (!updated) {
      throw new NotFoundException('Team member not found');
    }
    return updated;
  }

  async removeMember(
    clientId: string,
    projectId: string,
    memberId: string,
  ): Promise<void> {
    await this.getProjectOrThrow(clientId, projectId);
    if (memberId === this.virtualMemberId(projectId, ProjectTeamRoleSystemKind.OWNER)) {
      await this.prisma.project.update({
        where: { id: projectId },
        data: {
          ownerUserId: null,
          ownerFreeLabel: null,
          ownerAffiliation: null,
        },
      });
      return;
    }
    if (memberId === this.virtualMemberId(projectId, ProjectTeamRoleSystemKind.SPONSOR)) {
      await this.prisma.project.update({
        where: { id: projectId },
        data: { sponsorUserId: null },
      });
      return;
    }
    const existing = await this.prisma.projectTeamMember.findFirst({
      where: { id: memberId, clientId, projectId },
    });
    if (!existing) {
      throw new NotFoundException('Team member not found');
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.projectTeamMember.delete({ where: { id: memberId } });
      await this.syncProjectSponsorOwner(tx, projectId, clientId);
    });
  }

  private readonly defaultRaciActionLabels = [
    'Analyser les besoins internes',
    'Rechercher un outil BPM qui répond aux besoins',
    'Choisir le prestataire',
    'Contractualiser avec prestataire',
    'Former les collaborateurs',
    'Modéliser les processus',
    'Publier les processus',
    'Communiquer aux collaborateurs',
  ];

  private async ensureDefaultRaciActions(
    tx: Prisma.TransactionClient,
    clientId: string,
    projectId: string,
  ): Promise<void> {
    const count = await tx.projectRaciAction.count({ where: { clientId, projectId } });
    if (count > 0) return;
    await tx.projectRaciAction.createMany({
      data: this.defaultRaciActionLabels.map((label, index) => ({
        clientId,
        projectId,
        label,
        sortOrder: index,
      })),
    });
  }

  async getRaciMatrix(
    clientId: string,
    projectId: string,
  ): Promise<ProjectRaciMatrixResponse> {
    await this.getProjectOrThrow(clientId, projectId);
    await this.ensureDefaultTeamRolesForClient(clientId);

    await this.prisma.$transaction(async (tx) => {
      await this.ensureDefaultRaciActions(tx, clientId, projectId);
    });

    const [actions, roles, cells] = await Promise.all([
      this.prisma.projectRaciAction.findMany({
        where: { clientId, projectId },
        orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
      }),
      this.prisma.projectTeamRole.findMany({
        where: { clientId },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.projectRaciCell.findMany({
        where: { clientId, projectId },
      }),
    ]);

    return {
      actions: actions.map((action) => ({
        id: action.id,
        label: action.label,
        sortOrder: action.sortOrder,
      })),
      actors: roles.map((role) => ({
        id: role.id,
        name: role.name,
        sortOrder: role.sortOrder,
      })),
      cells: cells.map((cell) => ({
        actionId: cell.actionId,
        roleId: cell.roleId,
        kind: cell.kind,
      })),
    };
  }

  async setRaciCell(
    clientId: string,
    projectId: string,
    actionId: string,
    roleId: string,
    kind: ProjectRaciKind | null | undefined,
  ): Promise<ProjectRaciMatrixResponse> {
    await this.getProjectOrThrow(clientId, projectId);

    const action = await this.prisma.projectRaciAction.findFirst({
      where: { id: actionId, clientId, projectId },
    });
    if (!action) {
      throw new NotFoundException('Action RACI introuvable');
    }

    const role = await this.prisma.projectTeamRole.findFirst({
      where: { id: roleId, clientId },
    });
    if (!role) {
      throw new NotFoundException('Rôle équipe introuvable');
    }

    if (kind == null) {
      await this.prisma.projectRaciCell.deleteMany({
        where: { clientId, projectId, actionId, roleId },
      });
    } else {
      await this.prisma.$transaction(async (tx) => {
        if (kind === ProjectRaciKind.ACCOUNTABLE) {
          await tx.projectRaciCell.deleteMany({
            where: {
              clientId,
              projectId,
              actionId,
              kind: ProjectRaciKind.ACCOUNTABLE,
              roleId: { not: roleId },
            },
          });
        }
        await tx.projectRaciCell.upsert({
          where: {
            projectId_actionId_roleId: { projectId, actionId, roleId },
          },
          create: { clientId, projectId, actionId, roleId, kind },
          update: { kind },
        });
      });
    }

    return this.getRaciMatrix(clientId, projectId);
  }

  async createRaciAction(
    clientId: string,
    projectId: string,
    label: string,
    sortOrder?: number,
  ): Promise<ProjectRaciMatrixResponse> {
    await this.getProjectOrThrow(clientId, projectId);
    const trimmed = label.trim();
    if (!trimmed.length) {
      throw new BadRequestException('Le libellé de l’action est requis');
    }

    const maxSort = await this.prisma.projectRaciAction.aggregate({
      where: { clientId, projectId },
      _max: { sortOrder: true },
    });

    await this.prisma.projectRaciAction.create({
      data: {
        clientId,
        projectId,
        label: trimmed.slice(0, 500),
        sortOrder: sortOrder ?? (maxSort._max.sortOrder ?? -1) + 1,
      },
    });

    return this.getRaciMatrix(clientId, projectId);
  }

  async deleteRaciAction(
    clientId: string,
    projectId: string,
    actionId: string,
  ): Promise<ProjectRaciMatrixResponse> {
    await this.getProjectOrThrow(clientId, projectId);

    const action = await this.prisma.projectRaciAction.findFirst({
      where: { id: actionId, clientId, projectId },
    });
    if (!action) {
      throw new NotFoundException('Action RACI introuvable');
    }

    await this.prisma.projectRaciAction.delete({ where: { id: actionId } });
    return this.getRaciMatrix(clientId, projectId);
  }
}
