import { NotFoundException } from '@nestjs/common';
import { ClientUserRole, ClientUserStatus } from '@prisma/client';
import { MeService } from './me.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('MeService', () => {
  let service: MeService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
      },
      clientUser: {
        findMany: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaService>;
    service = new MeService(prisma);
  });

  describe('getProfile', () => {
    it('lève NotFoundException si user inexistant', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.getProfile('user-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('retourne le profil si user trouvé', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
      } as any);

      const result = await service.getProfile('user-1');
      expect(result).toEqual({
        id: 'user-1',
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
      });
    });
  });

  describe('getClients', () => {
    it('mappe correctement les clients (id, name, slug, role, status)', async () => {
      prisma.clientUser.findMany.mockResolvedValue([
        {
          role: ClientUserRole.CLIENT_ADMIN,
          status: ClientUserStatus.ACTIVE,
          client: {
            id: 'client-1',
            name: 'Client Démo',
            slug: 'client-demo',
          },
        },
        {
          role: ClientUserRole.CLIENT_USER,
          status: ClientUserStatus.SUSPENDED,
          client: {
            id: 'client-2',
            name: 'Autre Client',
            slug: 'autre-client',
          },
        },
      ] as any);

      const result = await service.getClients('user-1');
      expect(result).toEqual([
        {
          id: 'client-1',
          name: 'Client Démo',
          slug: 'client-demo',
          role: ClientUserRole.CLIENT_ADMIN,
          status: ClientUserStatus.ACTIVE,
        },
        {
          id: 'client-2',
          name: 'Autre Client',
          slug: 'autre-client',
          role: ClientUserRole.CLIENT_USER,
          status: ClientUserStatus.SUSPENDED,
        },
      ]);
    });

    it('ignore les ClientUser sans client associé', async () => {
      prisma.clientUser.findMany.mockResolvedValue([
        {
          role: ClientUserRole.CLIENT_ADMIN,
          status: ClientUserStatus.ACTIVE,
          client: null,
        },
      ] as any);

      const result = await service.getClients('user-1');
      expect(result).toEqual([]);
    });
  });
});

