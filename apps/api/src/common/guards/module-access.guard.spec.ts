import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { ModuleVisibilityService } from '../../modules/module-visibility/module-visibility.service';
import { REQUIRE_ANY_PERMISSIONS_KEY } from '../decorators/require-any-permissions.decorator';
import { REQUIRE_PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import type { EffectivePermissionsService } from '../services/effective-permissions.service';
import { RequestWithClient } from '../types/request-with-client';
import { ModuleAccessGuard } from './module-access.guard';

const createExecutionContext = (req: Partial<RequestWithClient>): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => req,
    }),
    getHandler: () => ((): void => undefined) as any,
    getClass: () => (class {} as any),
  } as unknown as ExecutionContext);

describe('ModuleAccessGuard', () => {
  let guard: ModuleAccessGuard;
  let prisma: any;
  let reflector: Reflector;
  let moduleVisibility: jest.Mocked<
    Pick<ModuleVisibilityService, 'getVisibilityMap'>
  >;
  let effectivePermissions: {
    resolvePermissionCodesForRequest: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      module: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaService>;
    reflector = new Reflector();
    moduleVisibility = {
      getVisibilityMap: jest.fn(),
    };
    effectivePermissions = {
      resolvePermissionCodesForRequest: jest.fn(),
    };
    guard = new ModuleAccessGuard(
      prisma,
      reflector,
      moduleVisibility as unknown as ModuleVisibilityService,
      effectivePermissions as unknown as EffectivePermissionsService,
    );
    jest.spyOn(reflector, 'get').mockReturnValue(undefined);
    prisma.module.findMany.mockResolvedValue([]);
  });

  it('refuse si contexte client actif absent', async () => {
    const req: Partial<RequestWithClient> = {
      user: { userId: 'user-1' },
    };

    await expect(
      guard.canActivate(createExecutionContext(req)),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('laisse passer si aucune permission requise', async () => {
    const req: Partial<RequestWithClient> = {
      user: { userId: 'user-1' },
      activeClient: {
        id: 'client-1',
        role: null as any,
        status: null as any,
      },
    };

    await expect(
      guard.canActivate(createExecutionContext(req)),
    ).resolves.toBe(true);
    expect(prisma.module.findMany).not.toHaveBeenCalled();
  });

  it('RequirePermissions : refuse si permission non détenue', async () => {
    const req: Partial<RequestWithClient> = {
      user: { userId: 'user-1' },
      activeClient: { id: 'client-1', role: null as any, status: null as any },
    };
    (reflector.get as jest.Mock).mockImplementation((key: string) => {
      if (key === REQUIRE_ANY_PERMISSIONS_KEY) return undefined;
      if (key === REQUIRE_PERMISSIONS_KEY) return ['budgets.read'];
      return undefined;
    });
    effectivePermissions.resolvePermissionCodesForRequest.mockResolvedValue(
      new Set(),
    );

    await expect(
      guard.canActivate(createExecutionContext(req)),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('RequirePermissions : refuse si module masqué', async () => {
    const req: Partial<RequestWithClient> = {
      user: { userId: 'user-1' },
      activeClient: { id: 'client-1', role: null as any, status: null as any },
    };
    (reflector.get as jest.Mock).mockImplementation((key: string) => {
      if (key === REQUIRE_ANY_PERMISSIONS_KEY) return undefined;
      if (key === REQUIRE_PERMISSIONS_KEY) return ['budgets.read'];
      return undefined;
    });
    effectivePermissions.resolvePermissionCodesForRequest.mockResolvedValue(
      new Set(['budgets.read']),
    );
    moduleVisibility.getVisibilityMap.mockResolvedValue(
      new Map([['budgets', false]]),
    );
    prisma.module.findMany.mockResolvedValue([
      {
        code: 'budgets',
        isActive: true,
        clientModules: [{ id: 'cm-1' }],
      },
    ] as any);

    await expect(
      guard.canActivate(createExecutionContext(req)),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('RequirePermissions : accepte si détenu, activé et visible', async () => {
    const req: Partial<RequestWithClient> = {
      user: { userId: 'user-1' },
      activeClient: { id: 'client-1', role: null as any, status: null as any },
    };
    (reflector.get as jest.Mock).mockImplementation((key: string) => {
      if (key === REQUIRE_ANY_PERMISSIONS_KEY) return undefined;
      if (key === REQUIRE_PERMISSIONS_KEY) return ['budgets.read'];
      return undefined;
    });
    effectivePermissions.resolvePermissionCodesForRequest.mockResolvedValue(
      new Set(['budgets.read']),
    );
    moduleVisibility.getVisibilityMap.mockResolvedValue(
      new Map([['budgets', true]]),
    );
    prisma.module.findMany.mockResolvedValue([
      {
        code: 'budgets',
        isActive: true,
        clientModules: [{ id: 'cm-1' }],
      },
    ] as any);

    await expect(
      guard.canActivate(createExecutionContext(req)),
    ).resolves.toBe(true);
  });

  it('RequireAnyPermissions : projects visible non détenu + budgets détenu hidden => refus', async () => {
    const req: Partial<RequestWithClient> = {
      user: { userId: 'user-1' },
      activeClient: { id: 'client-1', role: null as any, status: null as any },
    };
    (reflector.get as jest.Mock).mockImplementation((key: string) => {
      if (key === REQUIRE_ANY_PERMISSIONS_KEY) {
        return ['projects.read', 'budgets.read'];
      }
      if (key === REQUIRE_PERMISSIONS_KEY) return undefined;
      return undefined;
    });
    effectivePermissions.resolvePermissionCodesForRequest.mockResolvedValue(
      new Set(['budgets.read']),
    );
    moduleVisibility.getVisibilityMap.mockResolvedValue(
      new Map([
        ['projects', true],
        ['budgets', false],
      ]),
    );
    prisma.module.findMany.mockResolvedValue([
      {
        code: 'projects',
        isActive: true,
        clientModules: [{ id: 'cm-p' }],
      },
      {
        code: 'budgets',
        isActive: true,
        clientModules: [{ id: 'cm-b' }],
      },
    ] as any);

    await expect(
      guard.canActivate(createExecutionContext(req)),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('RequireAnyPermissions : accepte si une alternative détenue + activée + visible', async () => {
    const req: Partial<RequestWithClient> = {
      user: { userId: 'user-1' },
      activeClient: { id: 'client-1', role: null as any, status: null as any },
    };
    (reflector.get as jest.Mock).mockImplementation((key: string) => {
      if (key === REQUIRE_ANY_PERMISSIONS_KEY) {
        return ['projects.read', 'budgets.read'];
      }
      if (key === REQUIRE_PERMISSIONS_KEY) return undefined;
      return undefined;
    });
    effectivePermissions.resolvePermissionCodesForRequest.mockResolvedValue(
      new Set(['budgets.read']),
    );
    moduleVisibility.getVisibilityMap.mockResolvedValue(
      new Map([
        ['projects', true],
        ['budgets', true],
      ]),
    );
    prisma.module.findMany.mockResolvedValue([
      {
        code: 'projects',
        isActive: true,
        clientModules: [{ id: 'cm-p' }],
      },
      {
        code: 'budgets',
        isActive: true,
        clientModules: [{ id: 'cm-b' }],
      },
    ] as any);

    await expect(
      guard.canActivate(createExecutionContext(req)),
    ).resolves.toBe(true);
  });

  it('RequireAnyPermissions : déduit le module depuis la première alternative valide', async () => {
    const req: Partial<RequestWithClient> = {
      user: { userId: 'user-1' },
      activeClient: { id: 'client-1', role: null as any, status: null as any },
    };
    (reflector.get as jest.Mock).mockImplementation((key: string) => {
      if (key === REQUIRE_ANY_PERMISSIONS_KEY) {
        return ['collaborators.read', 'collaborators.create'];
      }
      if (key === REQUIRE_PERMISSIONS_KEY) return undefined;
      return undefined;
    });
    effectivePermissions.resolvePermissionCodesForRequest.mockResolvedValue(
      new Set(['collaborators.read']),
    );
    moduleVisibility.getVisibilityMap.mockResolvedValue(
      new Map([['collaborators', true]]),
    );
    prisma.module.findMany.mockResolvedValue([
      {
        code: 'collaborators',
        isActive: true,
        clientModules: [{ id: 'cm-1' }],
      },
    ] as any);

    await expect(
      guard.canActivate(createExecutionContext(req)),
    ).resolves.toBe(true);
  });
});
