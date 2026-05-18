import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { RequestWithClient } from '../../common/types/request-with-client';
import {
  REQUIRE_ACCESS_KEY,
  type AccessDecisionMetadata,
} from '../../common/decorators/access-decision.decorator';
import type { AccessDecisionResult } from './access-decision.types';
import { AccessDecisionService } from './access-decision.service';
import { resolveV2FlagKeyForResourceType } from './resolve-v2-flag-key';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service';

const ACCESS_DECISION_DENIED = 'ACCESS_DECISION_DENIED';

function accessDecisionCacheKey(
  resourceType: string,
  resourceId: string,
  intent: string,
): string {
  return `${resourceType}:${resourceId}:${intent}`;
}

@Injectable()
export class ResourceAccessDecisionGuard implements CanActivate {
  private readonly logger = new Logger(ResourceAccessDecisionGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly accessDecision: AccessDecisionService,
    private readonly featureFlags: FeatureFlagsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const meta = this.reflector.getAllAndOverride<AccessDecisionMetadata>(REQUIRE_ACCESS_KEY, [
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

    const flagKey = resolveV2FlagKeyForResourceType(meta.resourceType);
    if (!flagKey) {
      throw new InternalServerErrorException(
        `AccessDecision misconfiguration: unknown resourceType or flag mapping for ${meta.resourceType}`,
      );
    }

    const rawId = request.params[meta.resourceIdParam];
    if (rawId === undefined || rawId === null || String(rawId).trim() === '') {
      throw new BadRequestException(
        `Paramètre de route requis pour l’accès : ${meta.resourceIdParam}`,
      );
    }
    const resourceId = String(rawId).trim();

    const v2Enabled = await this.featureFlags.isEnabled(clientId, flagKey, request);
    if (!v2Enabled) {
      this.logger.debug(
        `AccessDecision guard skipped (flag ${flagKey} off) ${meta.resourceType} ${resourceId}`,
      );
      return true;
    }

    const cacheKey = accessDecisionCacheKey(meta.resourceType, resourceId, meta.intent);
    let result: AccessDecisionResult | undefined =
      request.accessDecisionCache?.get(cacheKey);
    if (!result) {
      result = await this.accessDecision.decide({
        request,
        clientId,
        userId,
        resourceType: meta.resourceType,
        resourceId,
        intent: meta.intent,
      });
      if (!request.accessDecisionCache) {
        request.accessDecisionCache = new Map();
      }
      request.accessDecisionCache.set(cacheKey, result);
    }

    if (!result.allowed) {
      throw new ForbiddenException({
        message: result.reasonCodes.length
          ? result.reasonCodes.join('; ')
          : 'Accès refusé',
        reasonCode: ACCESS_DECISION_DENIED,
        reasonCodes: result.reasonCodes,
      });
    }

    return true;
  }
}
