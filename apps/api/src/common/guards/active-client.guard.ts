import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ClientUserStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ActiveClientContext,
  RequestWithClient,
} from '../types/request-with-client';
import { ActiveClientCacheService } from '../cache/active-client-cache.service';

/**
 * Vérifie la présence de X-Client-Id et qu’un ClientUser ACTIVE existe pour (userId, clientId).
 * Attache request.activeClient (id, role, status). À placer après JwtAuthGuard.
 */
@Injectable()
export class ActiveClientGuard implements CanActivate {
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
      request.activeClient = cached;
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

    if (!clientUser || !clientUser.client) {
      throw new ForbiddenException('Client invalide ou accès refusé');
    }

    const contextValue: ActiveClientContext = {
      id: clientId,
      role: clientUser.role,
      status: clientUser.status,
    };

    request.activeClient = contextValue;
    await this.cache.set(userId, clientId, contextValue);
    return true;
  }
}
