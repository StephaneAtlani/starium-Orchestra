import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';

/**
 * Vérifie que l'utilisateur connecté est administrateur plateforme
 * via req.user.platformRole === 'PLATFORM_ADMIN'. À placer après JwtAuthGuard.
 */
@Injectable()
export class PlatformAdminGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as unknown as {
      user?: { userId: string; platformRole?: string | null };
    }).user;

    if (!user?.userId) {
      throw new ForbiddenException('Utilisateur non authentifié');
    }

    if (user.platformRole !== 'PLATFORM_ADMIN') {
      throw new ForbiddenException('Droits administrateur plateforme requis');
    }

    return true;
  }
}
