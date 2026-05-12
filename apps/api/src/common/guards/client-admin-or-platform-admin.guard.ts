import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ClientUserRole, PlatformRole } from '@prisma/client';
import { RequestWithClient } from '../types/request-with-client';

/**
 * RFC-ACL-014 Option A — mutations ACL uniquement.
 * CLIENT_ADMIN (ClientUser actif) ou PLATFORM_ADMIN avec contexte client résolu (y compris platformResolvedOnly).
 */
@Injectable()
export class ClientAdminOrPlatformAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithClient>();
    const ac = request.activeClient;
    const platformRole = request.user?.platformRole ?? null;

    if (!ac) {
      throw new ForbiddenException('Contexte client actif requis');
    }

    if (ac.role === ClientUserRole.CLIENT_ADMIN) {
      return true;
    }

    if (platformRole === PlatformRole.PLATFORM_ADMIN) {
      return true;
    }

    throw new ForbiddenException('Droits administrateur client requis');
  }
}
