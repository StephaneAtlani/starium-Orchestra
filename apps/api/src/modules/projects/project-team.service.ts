import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ClientUserStatus,
  Prisma,
  ProjectTeamMemberAffiliation,
  ProjectTeamRoleSystemKind,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProjectTeamRoleDto } from './dto/create-project-team-role.dto';
import { UpdateProjectTeamRoleDto } from './dto/update-project-team-role.dto';
import { AddProjectTeamMemberDto } from './dto/add-project-team-member.dto';

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
};

function normalizeFreeIdentityKey(freeLabel: string): string {
  const n = freeLabel.trim().replace(/\s+/g, ' ').toLowerCase();
  if (!n.length) {
    throw new BadRequestException('Le nom est requis');
  }
  return `n:${n.slice(0, 120)}`;
}

@Injectable()
export class ProjectTeamService {
  constructor(private readonly prisma: PrismaService) {}

  private mapMemberRow(m: {
    id: string;
    projectId: string;
    roleId: string;
    userId: string | null;
    freeLabel: string | null;
    affiliation: ProjectTeamMemberAffiliation | null;
    role: { name: string; systemKind: ProjectTeamRoleSystemKind | null };
    user: {
      email: string;
      firstName: string | null;
      lastName: string | null;
    } | null;
  }): ProjectTeamMemberResponse {
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
    };
  }

  /** Rôles par défaut pour un nouveau client (idempotent si déjà présents). */
  async seedDefaultRolesForClient(clientId: string): Promise<void> {
    const existing = await this.prisma.projectTeamRole.count({
      where: { clientId },
    });
    if (existing > 0) return;

    await this.prisma.projectTeamRole.createMany({
      data: [
        {
          clientId,
          name: 'Sponsor',
          sortOrder: 0,
          systemKind: ProjectTeamRoleSystemKind.SPONSOR,
        },
        {
          clientId,
          name: 'Responsable de projet',
          sortOrder: 1,
          systemKind: ProjectTeamRoleSystemKind.OWNER,
        },
        {
          clientId,
          name: 'Référent métier',
          sortOrder: 2,
          systemKind: null,
        },
      ],
    });
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
  ): Promise<{ id: string }> {
    const p = await this.prisma.project.findFirst({
      where: { id: projectId, clientId },
    });
    if (!p) throw new NotFoundException('Project not found');
    return p;
  }

  async getTeam(
    clientId: string,
    projectId: string,
  ): Promise<ProjectTeamMemberResponse[]> {
    await this.getProjectOrThrow(clientId, projectId);
    const members = await this.prisma.projectTeamMember.findMany({
      where: { clientId, projectId },
      include: {
        role: true,
        user: true,
      },
      orderBy: [{ role: { sortOrder: 'asc' } }, { createdAt: 'asc' }],
    });
    return members.map((m) => this.mapMemberRow(m));
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
    const role = await tx.projectTeamRole.findFirst({
      where: { clientId, systemKind },
    });
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
    const sponsorRole = await tx.projectTeamRole.findFirst({
      where: { clientId, systemKind: ProjectTeamRoleSystemKind.SPONSOR },
    });
    const ownerRole = await tx.projectTeamRole.findFirst({
      where: { clientId, systemKind: ProjectTeamRoleSystemKind.OWNER },
    });

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
      const member = await this.prisma.$transaction(async (tx) => {
        const created = await tx.projectTeamMember.create({
          data,
          include: { role: true, user: true },
        });
        await this.syncProjectSponsorOwner(tx, projectId, clientId);
        return created;
      });
      return this.mapMemberRow(member);
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException(
          'Cette personne est déjà affectée à ce rôle pour ce projet',
        );
      }
      throw e;
    }
  }

  async removeMember(
    clientId: string,
    projectId: string,
    memberId: string,
  ): Promise<void> {
    await this.getProjectOrThrow(clientId, projectId);
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
}
