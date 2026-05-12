import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import {
  ClientUserRole,
  ClientUserStatus,
  PlatformRole,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ActiveClientContext,
  RequestWithClient,
} from '../types/request-with-client';
import { ActiveClientCacheService } from '../cache/active-client-cache.service';

/**
 * RFC-ACL-014 Option A — mutations ACL uniquement.
 * ClientUser ACTIVE si présent ; sinon PLATFORM_ADMIN + client existant (sans exiger ClientUser).
 */
@Injectable()
export class ActiveClientOrPlatformContextGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: ActiveClientCacheService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithClient>();
    const userId = request.user?.userId;
    const clientId = request.headers['x-client-id'] as string | undefined;

    if (!userId) {
      throw new ForbiddenException('Utilisateur non authentifié');
    }
    if (!clientId || typeof clientId !== 'string') {
      throw new ForbiddenException('X-Client-Id requis');
    }

    const cached = await this.cache.get(userId, clientId);
    if (cached && cached.status === ClientUserStatus.ACTIVE) {
      request.activeClient = { ...cached, platformResolvedOnly: false };
      return true;
    }

    const clientUser = await this.prisma.clientUser.findFirst({
      where: {
        userId,
        clientId,
        status: ClientUserStatus.ACTIVE,
      },
      include: { client: true },
    });

    if (clientUser?.client) {
      const contextValue: ActiveClientContext = {
        id: clientId,
        role: clientUser.role,
        status: clientUser.status,
        platformResolvedOnly: false,
      };
      request.activeClient = contextValue;
      await this.cache.set(userId, clientId, contextValue);
      return true;
    }

    if (request.user?.platformRole !== PlatformRole.PLATFORM_ADMIN) {
      throw new ForbiddenException('Client invalide ou accès refusé');
    }

    const client = await this.prisma.client.findFirst({
      where: { id: clientId },
      select: { id: true },
    });
    if (!client) {
      throw new ForbiddenException('Client invalide ou accès refusé');
    }

    request.activeClient = {
      id: clientId,
      role: ClientUserRole.CLIENT_USER,
      status: ClientUserStatus.ACTIVE,
      platformResolvedOnly: true,
    };

    return true;
  }
}
