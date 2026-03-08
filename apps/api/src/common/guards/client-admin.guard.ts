import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ClientUserRole } from '@prisma/client';
import { Request } from 'express';

/**
 * Vérifie que request.activeClient.role === CLIENT_ADMIN.
 * À placer après ActiveClientGuard.
 */
@Injectable()
export class ClientAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const activeClient = (request as unknown as { activeClient?: { role: string } })
      .activeClient;

    if (!activeClient) {
      throw new ForbiddenException('Contexte client actif requis');
    }
    if (activeClient.role !== ClientUserRole.CLIENT_ADMIN) {
      throw new ForbiddenException('Droits administrateur client requis');
    }
    return true;
  }
}
