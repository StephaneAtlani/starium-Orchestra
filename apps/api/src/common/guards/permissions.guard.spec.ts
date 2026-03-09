import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ClientUserRole } from '@prisma/client';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestWithClient } from '../types/request-with-client';
import { PermissionsGuard } from './permissions.guard';

const createExecutionContext = (req: Partial<RequestWithClient>): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => req,
    }),
  } as unknown as ExecutionContext);

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let prisma: jest.Mocked<PrismaService>;
  let reflector: Reflector;

  beforeEach(() => {
    prisma = {
      userRole: {
        findMany: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaService>;
    reflector = new Reflector();
    guard = new PermissionsGuard(prisma, reflector);
    jest.spyOn(reflector, 'get').mockReturnValue(undefined);
  });

  it('refuse si utilisateur ou client actif absent', async () => {
    const req: Partial<RequestWithClient> = {};
    await expect(
      guard.canActivate(createExecutionContext(req)),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('court-circuite pour un CLIENT_ADMIN', async () => {
    const req: Partial<RequestWithClient> = {
      user: { userId: 'user-1' },
      activeClient: {
        id: 'client-1',
        role: ClientUserRole.CLIENT_ADMIN,
        status: null as any,
      },
    };

    (reflector.get as jest.Mock).mockReturnValueOnce(['budgets.read']);

    await expect(
      guard.canActivate(createExecutionContext(req)),
    ).resolves.toBe(true);
    expect(prisma.userRole.findMany).not.toHaveBeenCalled();
  });

  it('refuse si permission requise manquante', async () => {
    const req: Partial<RequestWithClient> = {
      user: { userId: 'user-1' },
      activeClient: {
        id: 'client-1',
        role: ClientUserRole.CLIENT_USER,
        status: null as any,
      },
    };

    (reflector.get as jest.Mock).mockReturnValueOnce(['budgets.read']);
    prisma.userRole.findMany.mockResolvedValue([] as any);

    await expect(
      guard.canActivate(createExecutionContext(req)),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('accepte si toutes les permissions requises sont présentes', async () => {
    const req: Partial<RequestWithClient> = {
      user: { userId: 'user-1' },
      activeClient: {
        id: 'client-1',
        role: ClientUserRole.CLIENT_USER,
        status: null as any,
      },
    };

    (reflector.get as jest.Mock).mockReturnValueOnce(['budgets.read']);
    prisma.userRole.findMany.mockResolvedValue([
      {
        role: {
          rolePermissions: [
            { permission: { code: 'budgets.read' } },
          ],
        },
      },
    ] as any);

    await expect(
      guard.canActivate(createExecutionContext(req)),
    ).resolves.toBe(true);
  });
});

