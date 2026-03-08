import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClientUserRole, ClientUserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

/** Réponse client pour GET /clients (liste). */
export interface ClientListItem {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
}

/** Réponse client pour POST /clients et PATCH /clients/:id. */
export interface ClientResponse {
  id: string;
  name: string;
  slug: string;
}

/**
 * Service de gestion des clients (RFC-009).
 * Réservé aux administrateurs plateforme (PlatformAdminGuard).
 */
@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retourne tous les clients, sans pagination ni filtre, triés par createdAt desc.
   */
  async findAll(): Promise<ClientListItem[]> {
    const clients = await this.prisma.client.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        slug: true,
        createdAt: true,
      },
    });
    return clients;
  }

  /**
   * Crée un client dans une transaction : résoudre/créer l'admin, vérifier slug, créer Client puis ClientUser.
   * Réponse strictement { id, name, slug }.
   */
  async create(dto: CreateClientDto): Promise<ClientResponse> {
    const result = await this.prisma.$transaction(async (tx) => {
      let adminUserId: string;

      const existingUser = await tx.user.findUnique({
        where: { email: dto.adminEmail },
      });

      if (existingUser) {
        adminUserId = existingUser.id;
      } else {
        if (!dto.adminPassword || dto.adminPassword.length < 8) {
          throw new BadRequestException(
            'Un mot de passe d’au moins 8 caractères est requis pour créer un nouvel administrateur client',
          );
        }
        const passwordHash = await bcrypt.hash(dto.adminPassword, 10);
        const newUser = await tx.user.create({
          data: {
            email: dto.adminEmail,
            passwordHash,
            firstName: dto.adminFirstName ?? null,
            lastName: dto.adminLastName ?? null,
          },
        });
        adminUserId = newUser.id;
      }

      const existingSlug = await tx.client.findUnique({
        where: { slug: dto.slug },
      });
      if (existingSlug) {
        throw new ConflictException('Un client avec ce slug existe déjà');
      }

      const client = await tx.client.create({
        data: {
          name: dto.name,
          slug: dto.slug,
        },
      });

      const existingLink = await tx.clientUser.findUnique({
        where: {
          userId_clientId: {
            userId: adminUserId,
            clientId: client.id,
          },
        },
      });
      if (existingLink) {
        throw new ConflictException(
          'Cet utilisateur est déjà rattaché à ce client',
        );
      }

      await tx.clientUser.create({
        data: {
          userId: adminUserId,
          clientId: client.id,
          role: ClientUserRole.CLIENT_ADMIN,
          status: ClientUserStatus.ACTIVE,
        },
      });

      return { id: client.id, name: client.name, slug: client.slug };
    });

    return result;
  }

  /**
   * Met à jour un client. Si slug fourni, vérifie l'unicité (autre client uniquement).
   * Réponse strictement { id, name, slug }.
   */
  async update(id: string, dto: UpdateClientDto): Promise<ClientResponse> {
    const client = await this.prisma.client.findUnique({
      where: { id },
    });
    if (!client) {
      throw new NotFoundException('Client non trouvé');
    }

    if (dto.slug !== undefined) {
      const otherWithSlug = await this.prisma.client.findFirst({
        where: {
          slug: dto.slug,
          id: { not: id },
        },
      });
      if (otherWithSlug) {
        throw new ConflictException('Un client avec ce slug existe déjà');
      }
    }

    const data: { name?: string; slug?: string } = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.slug !== undefined) data.slug = dto.slug;

    if (Object.keys(data).length === 0) {
      return { id: client.id, name: client.name, slug: client.slug };
    }

    const updated = await this.prisma.client.update({
      where: { id },
      data,
    });
    return { id: updated.id, name: updated.name, slug: updated.slug };
  }

  /**
   * Suppression physique du client. Les ClientUser liés sont supprimés (cascade).
   * Ne supprime jamais de User.
   */
  async remove(id: string): Promise<void> {
    const client = await this.prisma.client.findUnique({
      where: { id },
    });
    if (!client) {
      throw new NotFoundException('Client non trouvé');
    }
    await this.prisma.client.delete({
      where: { id },
    });
  }
}
