import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ClientUserStatus } from '@prisma/client';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

export interface ActiveClientContext {
  id: string;
  role: string;
  status: ClientUserStatus;
}

declare global {
  namespace Express {
    interface Request {
      activeClient?: ActiveClientContext;
    }
  }
}

@Injectable()
export class ActiveClientGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const userId = (request as unknown as { user?: { userId: string } }).user
      ?.userId;
    const clientId = request.headers['x-client-id'] as string | undefined;

    if (!userId) {
      throw new ForbiddenException('Utilisateur non authentifié');
    }
    if (!clientId || typeof clientId !== 'string') {
      throw new ForbiddenException('X-Client-Id requis');
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

    request.activeClient = {
      id: clientId,
      role: clientUser.role,
      status: clientUser.status,
    };
    return true;
  }
}
