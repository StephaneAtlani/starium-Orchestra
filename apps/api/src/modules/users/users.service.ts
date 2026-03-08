import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClientUserRole, ClientUserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

export interface UserResponse {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: ClientUserRole;
  status: ClientUserStatus;
}

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

  async findAll(clientId: string): Promise<UserResponse[]> {
    const clientUsers = await this.prisma.clientUser.findMany({
      where: { clientId },
      include: { user: true },
    });
    return clientUsers.map((cu) =>
      this.toResponse(cu.user, { role: cu.role, status: cu.status }),
    );
  }

  async create(clientId: string, dto: CreateUserDto): Promise<UserResponse> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
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

  async update(
    clientId: string,
    userId: string,
    dto: UpdateUserDto,
  ): Promise<UserResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
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

  async remove(clientId: string, userId: string): Promise<void> {
    const clientUser = await this.prisma.clientUser.findUnique({
      where: {
        userId_clientId: { userId, clientId },
      },
    });
    if (!clientUser) {
      throw new NotFoundException('Utilisateur non rattaché à ce client');
    }
    await this.prisma.clientUser.delete({
      where: { id: clientUser.id },
    });
  }
}
