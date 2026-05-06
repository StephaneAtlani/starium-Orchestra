import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AccessControlService } from '../access-control.service';
import {
  RESOURCE_ACL_METADATA_KEY,
  ResourceAclRequirement,
} from '../decorators/require-resource-acl.decorator';
import { RequestWithClient } from '../../../common/types/request-with-client';

/**
 * Surcouche ACL ressource (RFC-ACL-005). Sans décorateur sur le handler : no-op.
 * Mode strict : pas de bypass CLIENT_ADMIN.
 */
@Injectable()
export class ResourceAclGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly accessControl: AccessControlService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requirement = this.reflector.getAllAndOverride<ResourceAclRequirement>(
      RESOURCE_ACL_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requirement) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithClient>();
    const userId = request.user?.userId;
    const clientId = request.activeClient?.id;
    if (!userId || !clientId) {
      throw new ForbiddenException('Contexte client ou utilisateur manquant');
    }

    const typeParam = requirement.resourceTypeParam ?? 'resourceType';
    const idParam = requirement.resourceIdParam ?? 'resourceId';
    const rawType = request.params[typeParam];
    const rawId = request.params[idParam];
    if (rawType === undefined || rawId === undefined) {
      throw new BadRequestException(
        `Paramètres de route requis pour l’ACL : ${typeParam}, ${idParam}`,
      );
    }

    const { resourceType: resourceTypeNormalized, resourceId } =
      this.accessControl.resolveResourceAclRoute(rawType, rawId);

    let allowed = false;
    switch (requirement.operation) {
      case 'read':
        allowed = await this.accessControl.canReadResource({
          clientId,
          userId,
          resourceTypeNormalized,
          resourceId,
        });
        break;
      case 'write':
        allowed = await this.accessControl.canWriteResource({
          clientId,
          userId,
          resourceTypeNormalized,
          resourceId,
        });
        break;
      case 'admin':
        allowed = await this.accessControl.canAdminResource({
          clientId,
          userId,
          resourceTypeNormalized,
          resourceId,
        });
        break;
      default:
        throw new ForbiddenException('Opération ACL inconnue');
    }

    if (!allowed) {
      throw new ForbiddenException('Accès refusé par ACL ressource');
    }
    return true;
  }
}
