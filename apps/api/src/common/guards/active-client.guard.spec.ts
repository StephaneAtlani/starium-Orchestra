import { ForbiddenException } from '@nestjs/common';
import { ClientUserRole, ClientUserStatus } from '@prisma/client';
import { ExecutionContext } from '@nestjs/common';
import { ActiveClientGuard } from './active-client.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { ActiveClientCacheService } from '../cache/active-client-cache.service';
import { RequestWithClient } from '../types/request-with-client';

const createExecutionContext = (req: Partial<RequestWithClient>): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => req,
    }),
  } as unknown as ExecutionContext);

describe('ActiveClientGuard', () => {
  let guard: ActiveClientGuard;
  let prisma: jest.Mocked<PrismaService>;
  let cache: ActiveClientCacheService;

  beforeEach(() => {
    prisma = {
      clientUser: {
        findFirst: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaService>;
    cache = new ActiveClientCacheService();
    guard = new ActiveClientGuard(prisma, cache);
  });

  it('refuse si userId absent', async () => {
    const req: Partial<RequestWithClient> = {
      headers: { 'x-client-id': 'client-1' } as any,
    };
    await expect(
      guard.canActivate(createExecutionContext(req)),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('refuse si X-Client-Id absent', async () => {
    const req: Partial<RequestWithClient> = {
      user: { userId: 'user-1' },
      headers: {} as any,
    };
    await expect(
      guard.canActivate(createExecutionContext(req)),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('refuse si aucun ClientUser actif trouvé', async () => {
    const req: Partial<RequestWithClient> = {
      user: { userId: 'user-1' },
      headers: { 'x-client-id': 'client-1' } as any,
    };
    prisma.clientUser.findFirst.mockResolvedValue(null);

    await expect(
      guard.canActivate(createExecutionContext(req)),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('accepte si ClientUser actif trouvé et remplit le contexte + cache', async () => {
    const req: Partial<RequestWithClient> = {
      user: { userId: 'user-1' },
      headers: { 'x-client-id': 'client-1' } as any,
    };
    prisma.clientUser.findFirst.mockResolvedValue({
      role: ClientUserRole.CLIENT_ADMIN,
      status: ClientUserStatus.ACTIVE,
      client: { id: 'client-1' },
    } as any);

    const result = await guard.canActivate(createExecutionContext(req));

    expect(result).toBe(true);
    expect(req.activeClient).toEqual({
      id: 'client-1',
      role: ClientUserRole.CLIENT_ADMIN,
      status: ClientUserStatus.ACTIVE,
    });

    // deuxième appel : doit passer par le cache et ne plus appeler Prisma
    prisma.clientUser.findFirst.mockClear();
    const req2: Partial<RequestWithClient> = {
      user: { userId: 'user-1' },
      headers: { 'x-client-id': 'client-1' } as any,
    };
    const result2 = await guard.canActivate(createExecutionContext(req2));
    expect(result2).toBe(true);
    expect(prisma.clientUser.findFirst).not.toHaveBeenCalled();
    expect(req2.activeClient).toEqual(req.activeClient);
  });
});

