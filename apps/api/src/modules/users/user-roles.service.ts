import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClientUserStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateUserRolesDto } from './dto/update-user-roles.dto';

export interface UserRoleItem {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
}

@Injectable()
export class UserRolesService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserRolesForClient(
    clientId: string,
    userId: string,
  ): Promise<UserRoleItem[]> {
    await this.ensureUserBelongsToClient(clientId, userId);

    const userRoles = await this.prisma.userRole.findMany({
      where: {
        userId,
        role: { clientId },
      },
      include: {
        role: true,
      },
      orderBy: {
        role: { name: 'asc' },
      },
    });

    return userRoles.map((ur) => ({
      id: ur.role.id,
      name: ur.role.name,
      description: ur.role.description ?? null,
      isSystem: ur.role.isSystem,
    }));
  }

  async replaceUserRolesForClient(
    clientId: string,
    userId: string,
    dto: UpdateUserRolesDto,
  ): Promise<{ userId: string; roleIds: string[] }> {
    await this.ensureUserBelongsToClient(clientId, userId);

    const roles = await this.prisma.role.findMany({
      where: {
        id: { in: dto.roleIds },
        clientId,
      },
      select: { id: true },
    });

    const allowedIds = new Set(roles.map((r) => r.id));
    const invalidIds = dto.roleIds.filter((id) => !allowedIds.has(id));
    if (invalidIds.length > 0) {
      throw new BadRequestException(
        "Certains rôles ne sont pas associés au client actif",
      );
    }

    const allClientRoleIds = await this.prisma.role.findMany({
      where: { clientId },
      select: { id: true },
    });
    const clientRoleIdsSet = new Set(allClientRoleIds.map((r) => r.id));

    await this.prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({
        where: {
          userId,
          roleId: { in: Array.from(clientRoleIdsSet) },
        },
      });

      if (dto.roleIds.length > 0) {
        await tx.userRole.createMany({
          data: dto.roleIds.map((roleId) => ({
            userId,
            roleId,
          })),
        });
      }
    });

    return { userId, roleIds: dto.roleIds };
  }

  private async ensureUserBelongsToClient(
    clientId: string,
    userId: string,
  ): Promise<void> {
    const clientUser = await this.prisma.clientUser.findFirst({
      where: {
        clientId,
        userId,
        status: ClientUserStatus.ACTIVE,
      },
      select: { id: true },
    });

    if (!clientUser) {
      throw new NotFoundException(
        "Utilisateur non trouvé dans le client actif ou inactif",
      );
    }
  }
}

