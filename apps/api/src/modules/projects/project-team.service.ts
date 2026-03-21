import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ClientUserStatus,
  Prisma,
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
  userId: string;
  displayName: string;
  email: string;
};

@Injectable()
export class ProjectTeamService {
  constructor(private readonly prisma: PrismaService) {}

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
    if (existing.systemKind != null) {
      throw new BadRequestException('Cannot delete a system role');
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
    return members.map((m) => ({
      id: m.id,
      projectId: m.projectId,
      roleId: m.roleId,
      roleName: m.role.name,
      systemKind: m.role.systemKind,
      userId: m.userId,
      email: m.user.email,
      displayName:
        [m.user.firstName, m.user.lastName].filter(Boolean).join(' ').trim() ||
        m.user.email,
    }));
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
        where: { projectId, roleId: sponsorRole.id },
        orderBy: { createdAt: 'asc' },
      });
      sponsorUserId = first?.userId ?? null;
    }
    if (ownerRole) {
      const first = await tx.projectTeamMember.findFirst({
        where: { projectId, roleId: ownerRole.id },
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
    await this.assertActiveClientUser(clientId, dto.userId);

    const member = await this.prisma.$transaction(async (tx) => {
      const created = await tx.projectTeamMember.create({
        data: {
          clientId,
          projectId,
          roleId: dto.roleId,
          userId: dto.userId,
        },
        include: { role: true, user: true },
      });
      await this.syncProjectSponsorOwner(tx, projectId, clientId);
      return created;
    });

    return {
      id: member.id,
      projectId: member.projectId,
      roleId: member.roleId,
      roleName: member.role.name,
      systemKind: member.role.systemKind,
      userId: member.userId,
      email: member.user.email,
      displayName:
        [member.user.firstName, member.user.lastName]
          .filter(Boolean)
          .join(' ')
          .trim() || member.user.email,
    };
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
