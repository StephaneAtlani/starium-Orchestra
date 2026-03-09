import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClientUserRole, ClientUserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePlatformUserDto } from './dto/create-platform-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

/** Réponse utilisateur exposée par l’API (User + ClientUser pour le client actif, sans passwordHash). */
export interface UserResponse {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: ClientUserRole;
  status: ClientUserStatus;
}

/**
 * Service de gestion des utilisateurs dans le contexte d’un client (RFC-008).
 * Toutes les opérations sont scopées au clientId fourni.
 */
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private toResponse(
    user: { id: string; email: string; firstName: string | null; lastName: string | null },
    clientUser: { role: ClientUserRole; status: ClientUserStatus },
  ): UserResponse {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: clientUser.role,
      status: clientUser.status,
    };
  }

  /** Liste des utilisateurs rattachés au client (ClientUser + User). */
  async findAll(clientId: string): Promise<UserResponse[]> {
    const clientUsers = await this.prisma.clientUser.findMany({
      where: { clientId },
      include: { user: true },
    });
    return clientUsers.map((cu) =>
      this.toResponse(cu.user, { role: cu.role, status: cu.status }),
    );
  }

  /**
   * Crée un utilisateur ou le rattache au client.
   * Email existant → ClientUser seul (password ignoré). Email inconnu → User + ClientUser (password obligatoire).
   * @throws ConflictException si déjà rattaché à ce client
   * @throws BadRequestException si nouvel utilisateur sans password (min. 8 car.)
   */
  async create(clientId: string, dto: CreateUserDto): Promise<UserResponse> {
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
    return this.toResponse(user, { role: clientUser.role, status: clientUser.status });
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
   * Met à jour User (firstName, lastName) et ClientUser (role, status) pour le client.
   * @throws NotFoundException si user absent ou non rattaché au client
   */
  async update(
    clientId: string,
    userId: string,
    dto: UpdateUserDto,
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
    return this.toResponse(updatedUser, {
      role: updatedClientUser.role,
      status: updatedClientUser.status,
    });
  }

  /** Supprime le lien ClientUser uniquement (le User global n’est pas supprimé). */
  async remove(clientId: string, userId: string): Promise<void> {
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
  }
}
