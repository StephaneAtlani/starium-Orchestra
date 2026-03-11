import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClientUserStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/** Profil utilisateur exposé par GET /me (RFC-014-2 : inclut platformRole). */
export interface MeProfile {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  platformRole: 'PLATFORM_ADMIN' | null;
}

/** Client accessible par l’utilisateur (GET /me/clients). RFC-009-1 : isDefault. */
export interface MeClient {
  id: string;
  name: string;
  slug: string;
  role: import('@prisma/client').ClientUserRole;
  status: import('@prisma/client').ClientUserStatus;
  isDefault: boolean;
}

/** Service profil et contexte client de l’utilisateur connecté. */
@Injectable()
export class MeService {
  constructor(private readonly prisma: PrismaService) {}

  /** Retourne le profil User (id, email, firstName, lastName, platformRole). */
  async getProfile(userId: string): Promise<MeProfile> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        platformRole: true,
      },
    });
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }
    return {
      ...user,
      platformRole: user.platformRole as 'PLATFORM_ADMIN' | null,
    };
  }

  /** Liste des clients pour lesquels l’utilisateur a un ClientUser (défaut en premier). */
  async getClients(userId: string): Promise<MeClient[]> {
    const clientUsers = await this.prisma.clientUser.findMany({
      where: { userId },
      include: { client: true },
      orderBy: [{ isDefault: 'desc' }, { client: { name: 'asc' } }],
    });
    return clientUsers
      .filter((cu) => cu.client)
      .map((cu) => ({
        id: cu.client!.id,
        name: cu.client!.name,
        slug: cu.client!.slug,
        role: cu.role,
        status: cu.status,
        isDefault: cu.isDefault,
      }));
  }

  /** Définit le client par défaut pour l’utilisateur (RFC-009-1). Un seul par user. */
  async setDefaultClient(
    userId: string,
    clientId: string,
  ): Promise<{ success: true; defaultClientId: string }> {
    const cu = await this.prisma.clientUser.findUnique({
      where: {
        userId_clientId: { userId, clientId },
      },
    });
    if (!cu) {
      throw new ForbiddenException('Client not accessible');
    }
    if (cu.status !== ClientUserStatus.ACTIVE) {
      throw new BadRequestException('Client not active');
    }
    await this.prisma.$transaction([
      this.prisma.clientUser.updateMany({
        where: { userId },
        data: { isDefault: false },
      }),
      this.prisma.clientUser.update({
        where: { id: cu.id },
        data: { isDefault: true },
      }),
    ]);
    return { success: true, defaultClientId: clientId };
  }
}
