import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface MeProfile {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

export interface MeClient {
  id: string;
  name: string;
  slug: string;
}

@Injectable()
export class MeService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string): Promise<MeProfile> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }
    return user;
  }

  async getClients(userId: string): Promise<MeClient[]> {
    const clientUsers = await this.prisma.clientUser.findMany({
      where: { userId },
      include: { client: true },
    });
    return clientUsers
      .filter((cu) => cu.client)
      .map((cu) => ({
        id: cu.client!.id,
        name: cu.client!.name,
        slug: cu.client!.slug,
      }));
  }
}
