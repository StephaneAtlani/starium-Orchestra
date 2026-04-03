import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { REQUIRE_ANY_PERMISSIONS_KEY } from '../decorators/require-any-permissions.decorator';
import { REQUIRE_PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
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

  beforeEach(() => {
    prisma = {
      module: {
        findUnique: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaService>;
    reflector = new Reflector();
    guard = new ModuleAccessGuard(prisma, reflector);
    jest.spyOn(reflector, 'get').mockImplementation((metadataKey: unknown) => {
      if (metadataKey === REQUIRE_PERMISSIONS_KEY || metadataKey === REQUIRE_ANY_PERMISSIONS_KEY) {
        return undefined;
      }
      return undefined;
    });
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
    expect(prisma.module.findUnique).not.toHaveBeenCalled();
  });

  it('refuse si module inexistant ou inactif', async () => {
    const req: Partial<RequestWithClient> = {
      user: { userId: 'user-1' },
      activeClient: {
        id: 'client-1',
        role: null as any,
        status: null as any,
      },
    };

    (reflector.get as jest.Mock).mockImplementation((metadataKey: unknown) => {
      if (metadataKey === REQUIRE_PERMISSIONS_KEY) return ['budgets.read'];
      return undefined;
    });
    prisma.module.findUnique.mockResolvedValue(null as any);

    await expect(
      guard.canActivate(createExecutionContext(req)),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('accepte si module actif et activé pour le client', async () => {
    const req: Partial<RequestWithClient> = {
      user: { userId: 'user-1' },
      activeClient: {
        id: 'client-1',
        role: null as any,
        status: null as any,
      },
    };

    (reflector.get as jest.Mock).mockImplementation((metadataKey: unknown) => {
      if (metadataKey === REQUIRE_PERMISSIONS_KEY) return ['budgets.read'];
      return undefined;
    });
    prisma.module.findUnique.mockResolvedValue({
      isActive: true,
      clientModules: [{ status: 'ENABLED' }],
    } as any);

    await expect(
      guard.canActivate(createExecutionContext(req)),
    ).resolves.toBe(true);
  });

  it('déduit le module depuis @RequireAnyPermissions si pas de @RequirePermissions', async () => {
    const req: Partial<RequestWithClient> = {
      user: { userId: 'user-1' },
      activeClient: {
        id: 'client-1',
        role: null as any,
        status: null as any,
      },
    };

    (reflector.get as jest.Mock).mockImplementation((metadataKey: unknown) => {
      if (metadataKey === REQUIRE_PERMISSIONS_KEY) return undefined;
      if (metadataKey === REQUIRE_ANY_PERMISSIONS_KEY) {
        return ['collaborators.read', 'collaborators.create'];
      }
      return undefined;
    });
    prisma.module.findUnique.mockResolvedValue({
      isActive: true,
      clientModules: [{ id: 'cm-1' }],
    } as any);

    await expect(
      guard.canActivate(createExecutionContext(req)),
    ).resolves.toBe(true);

    expect(prisma.module.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { code: 'collaborators' },
      }),
    );
  });
});

