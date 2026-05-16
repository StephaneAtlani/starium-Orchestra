import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { ACCESS_ENFORCED_HANDLERS } from '../../modules/access-decision/access-intent-enforced-handlers';
import { FeatureFlagsService } from '../../modules/feature-flags/feature-flags.service';
import { REQUIRE_ACCESS_INTENT_KEY } from '../decorators/require-access-intent.decorator';
import { REQUIRE_ANY_PERMISSIONS_KEY } from '../decorators/require-any-permissions.decorator';
import { REQUIRE_PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { EffectivePermissionsService } from '../services/effective-permissions.service';
import { RequestWithClient } from '../types/request-with-client';
import { PermissionsGuard } from './permissions.guard';

const createExecutionContext = (
  req: Partial<RequestWithClient>,
  className = 'ProjectsController',
  handlerName = 'list',
): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => req,
    }),
    getHandler: () => ({ name: handlerName }) as any,
    getClass: () => ({ name: className }) as any,
  }) as unknown as ExecutionContext;

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let prisma: any;
  let reflector: Reflector;
  let effectivePermissions: EffectivePermissionsService;
  let featureFlags: jest.Mocked<Pick<FeatureFlagsService, 'isEnabled'>>;

  beforeEach(() => {
    prisma = {
      userRole: { findMany: jest.fn() },
      clientFeatureFlag: { findUnique: jest.fn() },
    } as unknown as jest.Mocked<PrismaService>;
    reflector = new Reflector();
    effectivePermissions = new EffectivePermissionsService(prisma);
    featureFlags = { isEnabled: jest.fn().mockResolvedValue(false) };
    guard = new PermissionsGuard(reflector, effectivePermissions, featureFlags as FeatureFlagsService);
    jest.spyOn(reflector, 'get').mockReturnValue(undefined);
  });

  it('refuse si utilisateur ou client actif absent', async () => {
    await expect(guard.canActivate(createExecutionContext({}))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('refuse si permission requise manquante', async () => {
    const req: Partial<RequestWithClient> = {
      user: { userId: 'user-1' },
      activeClient: { id: 'client-1', role: null as any, status: null as any },
    };
    (reflector.get as jest.Mock).mockImplementation((key: string) => {
      if (key === REQUIRE_ANY_PERMISSIONS_KEY) return undefined;
      if (key === REQUIRE_PERMISSIONS_KEY) return ['budgets.read'];
      return undefined;
    });
    prisma.userRole.findMany.mockResolvedValue([]);

    await expect(guard.canActivate(createExecutionContext(req))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('accepte si toutes les permissions requises sont présentes', async () => {
    const req: Partial<RequestWithClient> = {
      user: { userId: 'user-1' },
      activeClient: { id: 'client-1', role: null as any, status: null as any },
    };
    (reflector.get as jest.Mock).mockImplementation((key: string) => {
      if (key === REQUIRE_PERMISSIONS_KEY) return ['budgets.read'];
      return undefined;
    });
    prisma.userRole.findMany.mockResolvedValue([
      { role: { rolePermissions: [{ permission: { code: 'budgets.read' } }] } },
    ]);

    await expect(guard.canActivate(createExecutionContext(req))).resolves.toBe(true);
  });

  it('accepte budgets.read_all (RFC-ACL-015)', async () => {
    const req: Partial<RequestWithClient> = {
      user: { userId: 'user-1' },
      activeClient: { id: 'client-1', role: null as any, status: null as any },
    };
    (reflector.get as jest.Mock).mockImplementation((key: string) => {
      if (key === REQUIRE_PERMISSIONS_KEY) return ['budgets.read'];
      return undefined;
    });
    prisma.userRole.findMany.mockResolvedValue([
      { role: { rolePermissions: [{ permission: { code: 'budgets.read_all' } }] } },
    ]);

    await expect(guard.canActivate(createExecutionContext(req))).resolves.toBe(true);
  });

  it('read_scope + flag V2 on + route migrée → OK', async () => {
    featureFlags.isEnabled.mockResolvedValue(true);
    const req: Partial<RequestWithClient> = {
      user: { userId: 'user-1' },
      activeClient: { id: 'client-1', role: null as any, status: null as any },
    };
    (reflector.get as jest.Mock).mockImplementation((key: string) => {
      if (key === REQUIRE_ACCESS_INTENT_KEY) {
        return { module: 'projects', intent: 'read' };
      }
      return undefined;
    });
    prisma.userRole.findMany.mockResolvedValue([
      { role: { rolePermissions: [{ permission: { code: 'projects.read_scope' } }] } },
    ]);

    await expect(
      guard.canActivate(
        createExecutionContext(req, 'ProjectsController', 'list'),
      ),
    ).resolves.toBe(true);
    expect(featureFlags.isEnabled).toHaveBeenCalled();
  });

  it('read_scope + flag V2 on + route non migrée → refuse', async () => {
    featureFlags.isEnabled.mockResolvedValue(true);
    const req: Partial<RequestWithClient> = {
      user: { userId: 'user-1' },
      activeClient: { id: 'client-1', role: null as any, status: null as any },
    };
    (reflector.get as jest.Mock).mockImplementation((key: string) => {
      if (key === REQUIRE_PERMISSIONS_KEY) return ['projects.read'];
      return undefined;
    });
    prisma.userRole.findMany.mockResolvedValue([
      { role: { rolePermissions: [{ permission: { code: 'projects.read_scope' } }] } },
    ]);

    await expect(
      guard.canActivate(
        createExecutionContext(req, 'ProjectsController', 'portfolioSummary'),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('read_scope + flag V2 off → refuse (RequireAccessIntent)', async () => {
    featureFlags.isEnabled.mockResolvedValue(false);
    const req: Partial<RequestWithClient> = {
      user: { userId: 'user-1' },
      activeClient: { id: 'client-1', role: null as any, status: null as any },
    };
    (reflector.get as jest.Mock).mockImplementation((key: string) => {
      if (key === REQUIRE_ACCESS_INTENT_KEY) {
        return { module: 'projects', intent: 'read' };
      }
      return undefined;
    });
    prisma.userRole.findMany.mockResolvedValue([
      { role: { rolePermissions: [{ permission: { code: 'projects.read_scope' } }] } },
    ]);

    await expect(
      guard.canActivate(createExecutionContext(req, 'ProjectsController', 'list')),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('pont legacy : read_scope + V2 on sur handler enregistré', async () => {
    featureFlags.isEnabled.mockResolvedValue(true);
    const req: Partial<RequestWithClient> = {
      user: { userId: 'user-1' },
      activeClient: { id: 'client-1', role: null as any, status: null as any },
    };
    (reflector.get as jest.Mock).mockImplementation((key: string) => {
      if (key === REQUIRE_PERMISSIONS_KEY) return ['projects.read'];
      return undefined;
    });
    prisma.userRole.findMany.mockResolvedValue([
      { role: { rolePermissions: [{ permission: { code: 'projects.read_scope' } }] } },
    ]);

    await expect(
      guard.canActivate(createExecutionContext(req, 'ProjectsController', 'list')),
    ).resolves.toBe(true);
    expect(ACCESS_ENFORCED_HANDLERS.ProjectsController.list).toBe('ProjectsController.list');
  });

  it('create : write_scope ne suffit pas', async () => {
    featureFlags.isEnabled.mockResolvedValue(true);
    const req: Partial<RequestWithClient> = {
      user: { userId: 'user-1' },
      activeClient: { id: 'client-1', role: null as any, status: null as any },
    };
    (reflector.get as jest.Mock).mockImplementation((key: string) => {
      if (key === REQUIRE_ACCESS_INTENT_KEY) {
        return { module: 'projects', intent: 'create' };
      }
      return undefined;
    });
    prisma.userRole.findMany.mockResolvedValue([
      { role: { rolePermissions: [{ permission: { code: 'projects.write_scope' } }] } },
    ]);

    await expect(
      guard.canActivate(createExecutionContext(req, 'ProjectsController', 'create')),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('create : projects.create OK', async () => {
    const req: Partial<RequestWithClient> = {
      user: { userId: 'user-1' },
      activeClient: { id: 'client-1', role: null as any, status: null as any },
    };
    (reflector.get as jest.Mock).mockImplementation((key: string) => {
      if (key === REQUIRE_ACCESS_INTENT_KEY) {
        return { module: 'projects', intent: 'create' };
      }
      return undefined;
    });
    prisma.userRole.findMany.mockResolvedValue([
      { role: { rolePermissions: [{ permission: { code: 'projects.create' } }] } },
    ]);

    await expect(
      guard.canActivate(createExecutionContext(req, 'ProjectsController', 'create')),
    ).resolves.toBe(true);
  });
});
