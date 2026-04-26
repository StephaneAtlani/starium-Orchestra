import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClientUserStatus } from '@prisma/client';
import bcrypt from '@/lib/bcrypt-compat';
import { PrismaService } from '../../prisma/prisma.service';
import { ActiveClientCacheService } from '../../common/cache/active-client-cache.service';
import {
  AuditLogsService,
  CreateAuditLogInput,
} from '../audit-logs/audit-logs.service';
import { RequestMeta } from '../../common/decorators/request-meta.decorator';
import { AttachUserToClientDto } from './dto/attach-user-to-client.dto';

@Injectable()
export class ClientMembershipService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activeClientCache: ActiveClientCacheService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  /**
   * Retourne les utilisateurs rattachés à un client pour le Platform Admin.
   * Shape simplifiée (user + role + status) pour l’Admin Studio.
   */
  async listUsersForClient(clientId: string): Promise<{
    users: {
      userId: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
      role: string;
      status: ClientUserStatus;
    }[];
  }> {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true },
    });
    if (!client) {
      throw new NotFoundException('Client non trouvé');
    }

    const links = await this.prisma.clientUser.findMany({
      where: { clientId },
      include: { user: true },
      orderBy: { createdAt: 'asc' },
    });

    return {
      users: links.map((link) => ({
        userId: link.userId,
        email: link.user.email,
        firstName: link.user.firstName,
        lastName: link.user.lastName,
        role: link.role,
        status: link.status,
      })),
    };
  }

  /** Rattache un utilisateur à un client (création User possible). Réservé au Platform Admin. */
  async attachUserToClient(
    clientId: string,
    dto: AttachUserToClientDto,
    context?: { actorUserId?: string; meta?: RequestMeta },
  ) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
    });
    if (!client) {
      throw new NotFoundException('Client non trouvé');
    }

    if (!dto.userId && !dto.email) {
      throw new BadRequestException(
        'Vous devez fournir soit userId, soit email pour rattacher un utilisateur',
      );
    }

    let userId: string;

    if (dto.userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: dto.userId },
      });
      if (!user) {
        throw new NotFoundException('Utilisateur non trouvé');
      }
      if (dto.password) {
        throw new BadRequestException(
          'Le mot de passe ne peut pas être modifié via ce flux pour un utilisateur existant',
        );
      }
      userId = user.id;
    } else {
      // email fourni
      const existingUser = await this.prisma.user.findUnique({
        where: { email: dto.email! },
      });
      if (existingUser) {
        if (dto.password) {
          throw new BadRequestException(
            'Le mot de passe ne peut pas être modifié via ce flux pour un utilisateur existant',
          );
        }
        userId = existingUser.id;
      } else {
        if (!dto.password || dto.password.length < 8) {
          throw new BadRequestException(
            'Un mot de passe d’au moins 8 caractères est requis pour créer un nouvel utilisateur',
          );
        }
        const passwordHash = await bcrypt.hash(dto.password, 10);
        const user = await this.prisma.user.create({
          data: {
            email: dto.email!,
            passwordHash,
            firstName: dto.firstName ?? null,
            lastName: dto.lastName ?? null,
          },
        });
        userId = user.id;
      }
    }

    const existingLink = await this.prisma.clientUser.findUnique({
      where: {
        userId_clientId: {
          userId,
          clientId,
        },
      },
    });
    if (existingLink) {
      throw new ConflictException(
        "L'utilisateur est déjà rattaché à ce client",
      );
    }

    const clientUser = await this.prisma.clientUser.create({
      data: {
        userId,
        clientId,
        role: dto.role,
        status: dto.status ?? ClientUserStatus.ACTIVE,
      },
      include: { user: true },
    });

    await this.activeClientCache.invalidate(userId, clientId);

    const result = {
      user: {
        id: clientUser.user.id,
        email: clientUser.user.email,
        firstName: clientUser.user.firstName,
        lastName: clientUser.user.lastName,
      },
      clientUser: {
        clientId: clientUser.clientId,
        role: clientUser.role,
        status: clientUser.status,
      },
    };
    await this.logClientUserEvent('client.user.attached', {
      clientId,
      userId,
      role: clientUser.role,
      status: clientUser.status,
      context,
    });
    return result;
  }

  /** Supprime le lien ClientUser pour un client donné (ne supprime jamais User). */
  async detachUserFromClient(
    clientId: string,
    userId: string,
    context?: { actorUserId?: string; meta?: RequestMeta },
  ): Promise<void> {
    const link = await this.prisma.clientUser.findUnique({
      where: {
        userId_clientId: {
          userId,
          clientId,
        },
      },
    });
    if (!link) {
      throw new NotFoundException('Rattachement utilisateur/client introuvable');
    }
    await this.prisma.clientUser.delete({ where: { id: link.id } });
    await this.activeClientCache.invalidate(userId, clientId);
  }

  private async logClientUserEvent(
    action: 'client.user.attached' | 'client.user.detached',
    params: {
      clientId: string;
      userId: string;
      role: ClientUserStatus | string;
      status: ClientUserStatus;
      context?: { actorUserId?: string; meta?: RequestMeta };
    },
  ): Promise<void> {
    const { clientId, userId, role, status, context } = params;
    if (!clientId) {
      return;
    }
    const input: CreateAuditLogInput = {
      clientId,
      userId: context?.actorUserId,
      action,
      resourceType: 'client_user',
      resourceId: userId,
      newValue: {
        role,
        status,
      },
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    };
    await this.auditLogs.create(input);
  }
}

