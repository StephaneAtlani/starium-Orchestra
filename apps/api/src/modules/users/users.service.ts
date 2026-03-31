import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClientUserRole, ClientUserStatus, CollaboratorSource } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AuditLogsService,
  CreateAuditLogInput,
} from '../audit-logs/audit-logs.service';
import { RequestMeta } from '../../common/decorators/request-meta.decorator';
import { ActiveClientCacheService } from '../../common/cache/active-client-cache.service';
import { CreatePlatformUserDto } from './dto/create-platform-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  PlatformUserClientAssignmentDto,
  UpdatePlatformUserClientsDto,
} from './dto/update-platform-user-clients.dto';
import { UpdatePlatformUserPasswordDto } from './dto/update-platform-user-password.dto';

/** Réponse utilisateur exposée par l’API (User + ClientUser pour le client actif, sans passwordHash). */
export interface UserResponse {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: ClientUserRole;
  status: ClientUserStatus;
  isDirectorySynced?: boolean;
  isDirectoryLocked?: boolean;
}

/** Résumé utilisateur global exposé par les endpoints plateforme (sans passwordHash). */
export interface PlatformUserSummary {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  createdAt: Date;
  updatedAt: Date;
  platformRole: string | null;
}

/**
 * Service de gestion des utilisateurs dans le contexte d’un client (RFC-008).
 * Toutes les opérations sont scopées au clientId fourni.
 */
@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activeClientCache: ActiveClientCacheService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  private toResponse(
    user: { id: string; email: string; firstName: string | null; lastName: string | null },
    clientUser: { role: ClientUserRole; status: ClientUserStatus },
    options?: { isDirectorySynced?: boolean; isDirectoryLocked?: boolean },
  ): UserResponse {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: clientUser.role,
      status: clientUser.status,
      isDirectorySynced: options?.isDirectorySynced ?? false,
      isDirectoryLocked: options?.isDirectoryLocked ?? false,
    };
  }

  /** Liste des utilisateurs rattachés au client (ClientUser + User). */
  async findAll(clientId: string): Promise<UserResponse[]> {
    const clientUsers = await this.prisma.clientUser.findMany({
      where: { clientId },
      include: { user: true },
    });
    const emails = clientUsers
      .map((cu) => cu.user.email?.trim().toLowerCase())
      .filter((v): v is string => Boolean(v));
    const lockPolicy = await this.getDirectoryLockPolicy(clientId);
    const syncedCollaborators =
      emails.length > 0
        ? await this.prisma.collaborator.findMany({
            where: {
              clientId,
              source: CollaboratorSource.DIRECTORY_SYNC,
              OR: [
                { email: { in: emails } },
                { username: { in: emails } },
                { externalUsername: { in: emails } },
              ],
            },
            select: { email: true, username: true, externalUsername: true },
          })
        : [];
    const syncedEmails = new Set(
      syncedCollaborators.flatMap((row) =>
        [row.email, row.username, row.externalUsername]
          .map((v) => v?.trim().toLowerCase())
          .filter((v): v is string => Boolean(v)),
      ),
    );

    return clientUsers.map((cu) => {
      const isDirectorySynced = syncedEmails.has(cu.user.email.toLowerCase());
      return this.toResponse(
        cu.user,
        { role: cu.role, status: cu.status },
        {
          isDirectorySynced,
          isDirectoryLocked: isDirectorySynced && lockPolicy,
        },
      );
    });
  }

  /**
   * Crée un utilisateur ou le rattache au client.
   * Email existant → ClientUser seul (password ignoré). Email inconnu → User + ClientUser (password obligatoire).
   * @throws ConflictException si déjà rattaché à ce client
   * @throws BadRequestException si nouvel utilisateur sans password (min. 8 car.)
   */
  async create(
    clientId: string,
    dto: CreateUserDto,
    context?: { actorUserId?: string; meta?: RequestMeta },
  ): Promise<UserResponse> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      if (dto.password) {
        throw new BadRequestException(
          "Un mot de passe ne peut pas être fourni pour un utilisateur existant dans ce flux ; utilisez un autre flux pour changer le mot de passe",
        );
      }
      const existingLink = await this.prisma.clientUser.findUnique({
        where: {
          userId_clientId: {
            userId: existingUser.id,
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
          userId: existingUser.id,
          clientId,
          role: dto.role,
          status: ClientUserStatus.ACTIVE,
        },
        include: { user: true },
      });
      await this.activeClientCache.invalidate(existingUser.id, clientId);
      await this.logUserEvent('user.created', {
        clientId,
        targetUserId: existingUser.id,
        payload: {
          email: existingUser.email,
          role: clientUser.role,
        },
        context,
      });
      return this.toResponse(clientUser.user, {
        role: clientUser.role,
        status: clientUser.status,
      });
    }

    if (!dto.password || dto.password.length < 8) {
      throw new BadRequestException(
        'Un mot de passe d’au moins 8 caractères est requis pour créer un nouvel utilisateur',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName ?? null,
        lastName: dto.lastName ?? null,
      },
    });
    const clientUser = await this.prisma.clientUser.create({
      data: {
        userId: user.id,
        clientId,
        role: dto.role,
        status: ClientUserStatus.ACTIVE,
      },
    });
    await this.activeClientCache.invalidate(user.id, clientId);
    await this.logUserEvent('user.created', {
      clientId,
      targetUserId: user.id,
      payload: {
        email: user.email,
        role: clientUser.role,
      },
      context,
    });
    return this.toResponse(user, {
      role: clientUser.role,
      status: clientUser.status,
    });
  }

  /** Crée un utilisateur global (sans rattachement client). Réservé au Platform Admin. */
  async createPlatformUser(dto: CreatePlatformUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException(
        "Un utilisateur avec cet email existe déjà (utilisez le rattachement client)",
      );
    }

    if (!dto.password || dto.password.length < 8) {
      throw new BadRequestException(
        'Un mot de passe d’au moins 8 caractères est requis pour créer un utilisateur',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName ?? null,
        lastName: dto.lastName ?? null,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        createdAt: true,
        updatedAt: true,
        platformRole: true,
      },
    });
    return user;
  }

  /**
   * Liste des utilisateurs globaux (scope plateforme).
   * Triés par createdAt desc, sans exposer passwordHash.
   */
  async listPlatformUsers(): Promise<PlatformUserSummary[]> {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        createdAt: true,
        updatedAt: true,
        platformRole: true,
      },
    });
    return users;
  }

  /**
   * Met à jour le mot de passe d’un utilisateur global (flux plateforme).
   */
  async updatePlatformUserPassword(
    userId: string,
    dto: UpdatePlatformUserPasswordDto,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
  }

  /**
   * Retourne les rattachements client d’un utilisateur global, pour le flux plateforme.
   * Shape compatible avec le front (assignments?: [{ clientId, role }]).
   */
  async getPlatformUserClients(userId: string): Promise<{
    assignments: PlatformUserClientAssignmentDto[];
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    const links = await this.prisma.clientUser.findMany({
      where: { userId },
      select: { clientId: true, role: true },
      orderBy: { clientId: 'asc' },
    });

    return {
      assignments: links.map((l) => ({
        clientId: l.clientId,
        role: l.role as ClientUserRole,
      })),
    };
  }

  /**
   * Remplace les rattachements client d’un utilisateur global (flux plateforme).
   * Idempotent : après appel, l’utilisateur est rattaché exactement aux clients listés,
   * avec les rôles fournis. Les autres rattachements sont supprimés.
   */
  async updatePlatformUserClients(
    userId: string,
    dto: UpdatePlatformUserClientsDto,
  ): Promise<{ assignments: PlatformUserClientAssignmentDto[] }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    const targetAssignments = dto.assignments ?? [];
    const targetClientIds = [...new Set(targetAssignments.map((a) => a.clientId))];

    if (targetClientIds.length === 0) {
      // Simple cas : on supprime tous les rattachements existants
      const existingAll = await this.prisma.clientUser.findMany({
        where: { userId },
        select: { id: true, clientId: true },
      });

      if (existingAll.length > 0) {
        await this.prisma.clientUser.deleteMany({
          where: { id: { in: existingAll.map((c) => c.id) } },
        });
        // Invalidation cache + audit par client
        for (const cu of existingAll) {
          await this.activeClientCache.invalidate(userId, cu.clientId);
          await this.logUserEvent('platform.user.client-unlinked', {
            clientId: cu.clientId,
            targetUserId: userId,
            payload: {
              email: user.email,
            },
            context: undefined,
          });
        }
      }

      return { assignments: [] };
    }

    // Vérifie que tous les clients existent
    const clients = await this.prisma.client.findMany({
      where: { id: { in: targetClientIds } },
      select: { id: true },
    });
    const existingClientIds = new Set(clients.map((c) => c.id));
    const unknownClientId = targetClientIds.find((id) => !existingClientIds.has(id));
    if (unknownClientId) {
      throw new BadRequestException(
        `Client inconnu pour le rattachement utilisateur: ${unknownClientId}`,
      );
    }

    const existing = await this.prisma.clientUser.findMany({
      where: { userId },
    });

    const existingByClientId = new Map(
      existing.map((cu) => [cu.clientId, cu]),
    );

    const toDelete = existing.filter(
      (cu) => !targetClientIds.includes(cu.clientId),
    );

    // On applique toutes les modifs dans une transaction pour garder la cohérence
    await this.prisma.$transaction(async (tx) => {
      if (toDelete.length > 0) {
        await tx.clientUser.deleteMany({
          where: { id: { in: toDelete.map((c) => c.id) } },
        });
      }

      for (const assignment of targetAssignments) {
        const current = existingByClientId.get(assignment.clientId);
        if (current) {
          if (current.role !== assignment.role) {
            await tx.clientUser.update({
              where: { id: current.id },
              data: { role: assignment.role },
            });
          }
        } else {
          await tx.clientUser.create({
            data: {
              userId,
              clientId: assignment.clientId,
              role: assignment.role,
              status: ClientUserStatus.ACTIVE,
            },
          });
        }
      }
    });

    // Invalidation cache + audit logs
    const affectedClientIds = new Set<string>([
      ...existing.map((c) => c.clientId),
      ...targetClientIds,
    ]);

    for (const clientId of affectedClientIds) {
      await this.activeClientCache.invalidate(userId, clientId);
      await this.logUserEvent('platform.user.clients-updated', {
        clientId,
        targetUserId: userId,
        payload: {
          email: user.email,
        },
        context: undefined,
      });
    }

    return { assignments: targetAssignments };
  }

  /**
   * Met à jour User (firstName, lastName) et ClientUser (role, status) pour le client.
   * @throws NotFoundException si user absent ou non rattaché au client
   */
  async update(
    clientId: string,
    userId: string,
    dto: UpdateUserDto,
    context?: { actorUserId?: string; meta?: RequestMeta },
  ): Promise<UserResponse> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    const clientUser = await this.prisma.clientUser.findUnique({
      where: {
        userId_clientId: { userId, clientId },
      },
    });
    if (!clientUser) {
      throw new NotFoundException('Utilisateur non rattaché à ce client');
    }

    const lockPolicy = await this.getDirectoryLockPolicy(clientId);
    if (lockPolicy) {
      const synced = await this.prisma.collaborator.findFirst({
        where: {
          clientId,
          source: CollaboratorSource.DIRECTORY_SYNC,
          OR: [
            { email: { equals: user.email, mode: 'insensitive' } },
            { username: { equals: user.email, mode: 'insensitive' } },
            { externalUsername: { equals: user.email, mode: 'insensitive' } },
          ],
        },
        select: { id: true },
      });
      if (synced) {
        throw new BadRequestException(
          'Ce membre est synchronisé depuis l’annuaire et verrouillé par la politique active.',
        );
      }
    }

    if (
      context?.actorUserId &&
      context.actorUserId === userId &&
      dto.status !== undefined &&
      dto.status !== clientUser.status
    ) {
      throw new BadRequestException(
        'Vous ne pouvez pas modifier le statut de votre propre compte depuis cette interface.',
      );
    }

    if (
      context?.actorUserId &&
      context.actorUserId === userId &&
      dto.role !== undefined &&
      dto.role !== clientUser.role
    ) {
      throw new BadRequestException(
        'Vous ne pouvez pas modifier le rôle de votre propre compte depuis cette interface.',
      );
    }

    // Règle métier : le dernier CLIENT_ADMIN ne peut pas être rétrogradé via le flux client actif.
    if (dto.role !== undefined && dto.role !== clientUser.role) {
      if (clientUser.role === ClientUserRole.CLIENT_ADMIN) {
        const adminCount = await this.prisma.clientUser.count({
          where: {
            clientId,
            role: ClientUserRole.CLIENT_ADMIN,
          },
        });
        if (adminCount === 1) {
          throw new BadRequestException(
            'Impossible de rétrograder le dernier administrateur client via ce flux. Utilisez le flux plateforme.',
          );
        }
      }
    }

    const userData: { firstName?: string; lastName?: string } = {};
    if (dto.firstName !== undefined) userData.firstName = dto.firstName;
    if (dto.lastName !== undefined) userData.lastName = dto.lastName;
    if (Object.keys(userData).length > 0) {
      await this.prisma.user.update({
        where: { id: userId },
        data: userData,
      });
    }

    const clientUserData: { role?: ClientUserRole; status?: ClientUserStatus } =
      {};
    if (dto.role !== undefined) clientUserData.role = dto.role;
    if (dto.status !== undefined) clientUserData.status = dto.status;
    if (Object.keys(clientUserData).length > 0) {
      await this.prisma.clientUser.update({
        where: { id: clientUser.id },
        data: clientUserData,
      });
      await this.activeClientCache.invalidate(userId, clientId);
    }

    const updatedUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    const updatedClientUser = await this.prisma.clientUser.findUnique({
      where: { id: clientUser.id },
    });
    if (!updatedUser || !updatedClientUser) {
      throw new NotFoundException('Utilisateur non trouvé');
    }
    await this.logUserEvent('user.updated', {
      clientId,
      targetUserId: updatedUser.id,
      payload: {
        email: updatedUser.email,
        role: updatedClientUser.role,
        status: updatedClientUser.status,
      },
      context,
    });
    return this.toResponse(updatedUser, {
      role: updatedClientUser.role,
      status: updatedClientUser.status,
    });
  }

  private async getDirectoryLockPolicy(clientId: string): Promise<boolean> {
    const row = await this.prisma.directoryConnection.findFirst({
      where: { clientId, isActive: true },
      orderBy: { updatedAt: 'desc' },
      select: { isSyncEnabled: true, lockSyncedCollaborators: true },
    });
    return Boolean(row?.isSyncEnabled && row?.lockSyncedCollaborators);
  }

  /** Supprime le lien ClientUser uniquement (le User global n’est pas supprimé). */
  async remove(
    clientId: string,
    userId: string,
    context?: { actorUserId?: string; meta?: RequestMeta },
  ): Promise<void> {
    const clientUser = await this.prisma.clientUser.findUnique({
      where: {
        userId_clientId: { userId, clientId },
      },
    });
    if (!clientUser) {
      throw new NotFoundException('Utilisateur non rattaché à ce client');
    }

    // Règle métier : le dernier CLIENT_ADMIN ne peut pas être supprimé via le flux client actif.
    if (clientUser.role === ClientUserRole.CLIENT_ADMIN) {
      const adminCount = await this.prisma.clientUser.count({
        where: {
          clientId,
          role: ClientUserRole.CLIENT_ADMIN,
        },
      });
      if (adminCount === 1) {
        throw new BadRequestException(
          'Impossible de supprimer le dernier administrateur client via ce flux. Utilisez le flux plateforme.',
        );
      }
    }

    await this.prisma.clientUser.delete({
      where: { id: clientUser.id },
    });
    await this.activeClientCache.invalidate(userId, clientId);
    await this.logUserEvent('user.deleted', {
      clientId,
      targetUserId: userId,
      payload: {
        role: clientUser.role,
        status: clientUser.status,
      },
      context,
    });
  }

  private async logUserEvent(
    action: string,
    params: {
      clientId: string;
      targetUserId: string;
      payload: Record<string, unknown>;
      context?: { actorUserId?: string; meta?: RequestMeta };
    },
  ): Promise<void> {
    const { clientId, targetUserId, payload, context } = params;
    const input: CreateAuditLogInput = {
      clientId,
      userId: context?.actorUserId,
      action,
      resourceType: 'user',
      resourceId: targetUserId,
      newValue: payload,
      ipAddress: context?.meta?.ipAddress,
      userAgent: context?.meta?.userAgent,
      requestId: context?.meta?.requestId,
    };
    await this.auditLogs.create(input);
  }
}
