import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Vérifie que l'utilisateur connecté est administrateur plateforme (user.isPlatformAdmin === true).
 * À placer après JwtAuthGuard.
 */
@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const userId = (request as unknown as { user?: { userId: string } }).user
      ?.userId;

    if (!userId) {
      throw new ForbiddenException('Utilisateur non authentifié');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isPlatformAdmin: true },
    });

    if (user?.isPlatformAdmin !== true) {
      throw new ForbiddenException('Droits administrateur plateforme requis');
    }

    return true;
  }
}
