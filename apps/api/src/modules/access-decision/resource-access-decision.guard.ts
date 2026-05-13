import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { RequestWithClient } from '../../common/types/request-with-client';
import { AccessDecisionService } from './access-decision.service';
import { REQUIRE_ACCESS_KEY, type RequireAccessMetadata } from './require-access.decorator';

@Injectable()
export class ResourceAccessDecisionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly accessDecision: AccessDecisionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const meta = this.reflector.getAllAndOverride<RequireAccessMetadata>(REQUIRE_ACCESS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!meta) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithClient>();
    const userId = request.user?.userId;
    const clientId = request.activeClient?.id;
    if (!userId || !clientId) {
      throw new ForbiddenException('Contexte client ou utilisateur manquant');
    }

    const rawId = request.params[meta.resourceIdParam];
    if (rawId === undefined || rawId === null || String(rawId).trim() === '') {
      throw new BadRequestException(
        `Paramètre de route requis pour l’accès : ${meta.resourceIdParam}`,
      );
    }

    await this.accessDecision.assertAllowed({
      request,
      clientId,
      userId,
      resourceType: meta.resourceType,
      resourceId: String(rawId).trim(),
      intent: meta.intent,
    });
    return true;
  }
}
