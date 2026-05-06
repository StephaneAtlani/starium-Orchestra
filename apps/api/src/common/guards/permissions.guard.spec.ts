import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { REQUIRE_ANY_PERMISSIONS_KEY } from '../decorators/require-any-permissions.decorator';
import { REQUIRE_PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { EffectivePermissionsService } from '../services/effective-permissions.service';
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
  let effectivePermissions: EffectivePermissionsService;

  beforeEach(() => {
    prisma = {
      userRole: {
        findMany: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaService>;
    reflector = new Reflector();
    effectivePermissions = new EffectivePermissionsService(prisma);
    guard = new PermissionsGuard(reflector, effectivePermissions);
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

    (reflector.get as jest.Mock).mockImplementation((key: string) => {
      if (key === REQUIRE_ANY_PERMISSIONS_KEY) return undefined;
      if (key === REQUIRE_PERMISSIONS_KEY) return ['budgets.read'];
      return undefined;
    });
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

    (reflector.get as jest.Mock).mockImplementation((key: string) => {
      if (key === REQUIRE_ANY_PERMISSIONS_KEY) return undefined;
      if (key === REQUIRE_PERMISSIONS_KEY) return ['budgets.read'];
      return undefined;
    });
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

    (reflector.get as jest.Mock).mockImplementation((key: string) => {
      if (key === REQUIRE_ANY_PERMISSIONS_KEY) return undefined;
      if (key === REQUIRE_PERMISSIONS_KEY) {
        return ['budgets.read', 'budgets.update'];
      }
      return undefined;
    });

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

    (reflector.get as jest.Mock).mockImplementation((key: string) => {
      if (key === REQUIRE_ANY_PERMISSIONS_KEY) return undefined;
      if (key === REQUIRE_PERMISSIONS_KEY) return ['budgets.read'];
      return undefined;
    });

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

  it('accepte RequirePermissions sur plusieurs modules si toutes détenues', async () => {
    const req: Partial<RequestWithClient> = {
      user: { userId: 'user-1' },
      activeClient: {
        id: 'client-1',
        role: null as any,
        status: null as any,
      },
    };

    (reflector.get as jest.Mock).mockImplementation((key: string) => {
      if (key === REQUIRE_ANY_PERMISSIONS_KEY) return undefined;
      if (key === REQUIRE_PERMISSIONS_KEY) {
        return ['budgets.read', 'contracts.read'];
      }
      return undefined;
    });
    prisma.userRole.findMany.mockResolvedValue([
      {
        role: {
          rolePermissions: [
            { permission: { code: 'budgets.read' } },
            { permission: { code: 'contracts.read' } },
          ],
        },
      },
    ] as any);

    await expect(
      guard.canActivate(createExecutionContext(req)),
    ).resolves.toBe(true);
  });

  it('refuse RequireAnyPermissions si aucune alternative détenue', async () => {
    const req: Partial<RequestWithClient> = {
      user: { userId: 'user-1' },
      activeClient: {
        id: 'client-1',
        role: null as any,
        status: null as any,
      },
    };

    (reflector.get as jest.Mock).mockImplementation((key: string) => {
      if (key === REQUIRE_ANY_PERMISSIONS_KEY) {
        return ['projects.read', 'budgets.read'];
      }
      if (key === REQUIRE_PERMISSIONS_KEY) return undefined;
      return undefined;
    });
    prisma.userRole.findMany.mockResolvedValue([] as any);

    await expect(
      guard.canActivate(createExecutionContext(req)),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('accepte RequireAnyPermissions si une alternative est détenue', async () => {
    const req: Partial<RequestWithClient> = {
      user: { userId: 'user-1' },
      activeClient: {
        id: 'client-1',
        role: null as any,
        status: null as any,
      },
    };

    (reflector.get as jest.Mock).mockImplementation((key: string) => {
      if (key === REQUIRE_ANY_PERMISSIONS_KEY) {
        return ['projects.read', 'budgets.read'];
      }
      if (key === REQUIRE_PERMISSIONS_KEY) return undefined;
      return undefined;
    });
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
  });
});
