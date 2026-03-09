import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
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
    jest.spyOn(reflector, 'get').mockReturnValue(undefined);
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

    (reflector.get as jest.Mock).mockReturnValueOnce(undefined);

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

    (reflector.get as jest.Mock).mockReturnValueOnce(['budgets.read']);
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

    (reflector.get as jest.Mock).mockReturnValueOnce(['budgets.read']);
    prisma.module.findUnique.mockResolvedValue({
      isActive: true,
      clientModules: [{ status: 'ENABLED' }],
    } as any);

    await expect(
      guard.canActivate(createExecutionContext(req)),
    ).resolves.toBe(true);
  });
});

