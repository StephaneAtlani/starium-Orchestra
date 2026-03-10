import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestWithClient } from '../types/request-with-client';
import { PermissionsGuard } from './permissions.guard';

const createExecutionContext = (req: Partial<RequestWithClient>): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => req,
    }),
    getHandler: () => ((): void => undefined) as any,
    getClass: () => (class {} as any),
  } as unknown as ExecutionContext);

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let prisma: any;
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

  it('refuse si permission requise manquante', async () => {
    const req: Partial<RequestWithClient> = {
      user: { userId: 'user-1' },
      activeClient: {
        id: 'client-1',
        role: null as any,
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
        role: null as any,
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

  it('applique une stratégie AND sur plusieurs permissions', async () => {
    const req: Partial<RequestWithClient> = {
      user: { userId: 'user-1' },
      activeClient: {
        id: 'client-1',
        role: null as any,
        status: null as any,
      },
    };

    (reflector.get as jest.Mock).mockReturnValueOnce([
      'budgets.read',
      'budgets.update',
    ]);

    prisma.userRole.findMany.mockResolvedValue([
      {
        role: {
          rolePermissions: [
            { permission: { code: 'budgets.read' } },
            { permission: { code: 'budgets.update' } },
          ],
        },
      },
    ] as any);

    await expect(
      guard.canActivate(createExecutionContext(req)),
    ).resolves.toBe(true);
  });

  it('utilise le cache request (ne relance pas Prisma)', async () => {
    const req: Partial<RequestWithClient> = {
      user: { userId: 'user-1' },
      activeClient: {
        id: 'client-1',
        role: null as any,
        status: null as any,
      },
    };

    // même contexte deux fois
    (reflector.get as jest.Mock)
      .mockReturnValueOnce(['budgets.read'])
      .mockReturnValueOnce(['budgets.read']);

    prisma.userRole.findMany.mockResolvedValue([
      {
        role: {
          rolePermissions: [{ permission: { code: 'budgets.read' } }],
        },
      },
    ] as any);

    await expect(
      guard.canActivate(createExecutionContext(req)),
    ).resolves.toBe(true);
    await expect(
      guard.canActivate(createExecutionContext(req)),
    ).resolves.toBe(true);

    expect(prisma.userRole.findMany).toHaveBeenCalledTimes(1);
  });

  it('refuse si les permissions requises couvrent plusieurs modules', async () => {
    const req: Partial<RequestWithClient> = {
      user: { userId: 'user-1' },
      activeClient: {
        id: 'client-1',
        role: null as any,
        status: null as any,
      },
    };

    (reflector.get as jest.Mock).mockReturnValueOnce([
      'budgets.read',
      'contracts.read',
    ]);

    await expect(
      guard.canActivate(createExecutionContext(req)),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.userRole.findMany).not.toHaveBeenCalled();
  });
});

