import { Injectable } from '@nestjs/common';
import {
  ClientSubscriptionStatus,
  ClientUserLicenseBillingMode,
  ClientUserLicenseType,
  ClientUserStatus,
} from '@prisma/client';
import { AccessControlService } from '../access-control/access-control.service';
import { ModuleVisibilityService } from '../module-visibility/module-visibility.service';
import { EffectivePermissionsService } from '../../common/services/effective-permissions.service';
import type { RequestWithClient } from '../../common/types/request-with-client';
import { PrismaService } from '../../prisma/prisma.service';
import type { EffectiveRightsQueryDto } from './dto/effective-rights-query.dto';
import type {
  EffectiveRightsCheck,
  EffectiveRightsResponse,
} from './access-diagnostics.types';
import { getResourceDiagnosticsConfig } from './resource-diagnostics.registry';

type DenialLayer = EffectiveRightsResponse['denialReasons'][number]['layer'];

const CHECK_ORDER: DenialLayer[] = [
  'licenseCheck',
  'subscriptionCheck',
  'moduleActivationCheck',
  'moduleVisibilityCheck',
  'rbacCheck',
  'aclCheck',
];

@Injectable()
export class AccessDiagnosticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessControl: AccessControlService,
    private readonly moduleVisibility: ModuleVisibilityService,
    private readonly effectivePermissions: EffectivePermissionsService,
  ) {}

  async computeEffectiveRights(params: {
    clientId: string;
    userId: string;
    resourceType: EffectiveRightsQueryDto['resourceType'];
    resourceId: string;
    operation: EffectiveRightsQueryDto['operation'];
  }): Promise<EffectiveRightsResponse> {
    const cfg = getResourceDiagnosticsConfig(params.resourceType);
    if (!cfg) {
      return this.buildUnsupportedTypeResponse();
    }

    const [membership, resource] = await Promise.all([
      this.prisma.clientUser.findFirst({
        where: { clientId: params.clientId, userId: params.userId },
        include: { subscription: true },
      }),
      cfg.resolveResourceForClient(this.prisma, {
        clientId: params.clientId,
        resourceId: params.resourceId,
      }),
    ]);

    if (!membership || !resource) {
      return this.buildOutOfScopeResponse();
    }

    const licenseCheck = this.evaluateLicenseCheck(membership, params.operation);
    const subscriptionCheck = this.evaluateSubscriptionCheck(membership);
    const moduleActivationCheck = await this.evaluateModuleActivationCheck(
      params.clientId,
      cfg.moduleCode,
    );
    const moduleVisibilityCheck = await this.evaluateModuleVisibilityCheck(
      params.userId,
      params.clientId,
      cfg.moduleVisibilityScope,
    );
    const rbacCheck = await this.evaluateRbacCheck({
      userId: params.userId,
      clientId: params.clientId,
      operation: params.operation,
      requiredPermission: cfg.permissions[params.operation],
    });
    const aclCheck = await this.evaluateAclCheck({
      clientId: params.clientId,
      userId: params.userId,
      operation: params.operation,
      resourceType: cfg.aclResourceType,
      resourceId: params.resourceId,
    });

    return this.buildResponse({
      licenseCheck,
      subscriptionCheck,
      moduleActivationCheck,
      moduleVisibilityCheck,
      rbacCheck,
      aclCheck,
    });
  }

  private evaluateLicenseCheck(
    membership: {
      status: ClientUserStatus;
      licenseType: ClientUserLicenseType;
      licenseEndsAt: Date | null;
    },
    operation: EffectiveRightsQueryDto['operation'],
  ): EffectiveRightsCheck {
    if (membership.status !== ClientUserStatus.ACTIVE) {
      return this.failCheck('USER_NOT_ACTIVE', 'Utilisateur non actif sur ce client.');
    }
    if (
      (operation === 'write' || operation === 'admin') &&
      membership.licenseType !== ClientUserLicenseType.READ_WRITE
    ) {
      return this.failCheck(
        'LICENSE_READ_ONLY',
        "Licence insuffisante pour l'opération demandée.",
      );
    }
    if (
      membership.licenseEndsAt instanceof Date &&
      membership.licenseEndsAt.getTime() < Date.now()
    ) {
      return this.failCheck('LICENSE_EXPIRED', 'Licence expirée.');
    }
    return this.passCheck('Licence compatible avec l’opération demandée.');
  }

  private evaluateSubscriptionCheck(membership: {
    licenseBillingMode: ClientUserLicenseBillingMode;
    subscriptionId: string | null;
    subscription: {
      status: ClientSubscriptionStatus;
      graceEndsAt: Date | null;
    } | null;
  }): EffectiveRightsCheck {
    if (
      membership.licenseBillingMode !== ClientUserLicenseBillingMode.CLIENT_BILLABLE
    ) {
      return this.naCheck("Aucun contrôle d'abonnement requis pour ce mode de licence.");
    }
    if (!membership.subscriptionId || !membership.subscription) {
      return this.failCheck('SUBSCRIPTION_REQUIRED', 'Abonnement requis introuvable.');
    }
    const now = Date.now();
    const sub = membership.subscription;
    const inGrace =
      sub.graceEndsAt instanceof Date && sub.graceEndsAt.getTime() >= now;
    if (
      sub.status === ClientSubscriptionStatus.ACTIVE ||
      (sub.status === ClientSubscriptionStatus.EXPIRED && inGrace)
    ) {
      return this.passCheck('Abonnement valide pour la licence facturable.');
    }
    return this.failCheck(
      'SUBSCRIPTION_INACTIVE',
      "Abonnement non valide pour l'utilisation demandée.",
    );
  }

  private async evaluateModuleActivationCheck(
    clientId: string,
    moduleCode: string,
  ): Promise<EffectiveRightsCheck> {
    const module = await this.prisma.module.findFirst({
      where: {
        code: moduleCode,
        isActive: true,
        clientModules: { some: { clientId, status: 'ENABLED' } },
      },
      select: { id: true },
    });
    if (!module) {
      return this.failCheck(
        'MODULE_NOT_ACTIVE_OR_ENABLED',
        'Module inactif ou non activé pour le client.',
      );
    }
    return this.passCheck('Module actif et activé pour le client.');
  }

  private async evaluateModuleVisibilityCheck(
    userId: string,
    clientId: string,
    moduleCode: string,
  ): Promise<EffectiveRightsCheck> {
    const visible = await this.moduleVisibility.isVisibleForUser(
      userId,
      clientId,
      moduleCode,
    );
    if (!visible) {
      return this.failCheck(
        'MODULE_NOT_VISIBLE_FOR_USER',
        'Module masqué pour ce profil utilisateur.',
      );
    }
    return this.passCheck('Module visible pour ce profil utilisateur.');
  }

  private async evaluateRbacCheck(params: {
    userId: string;
    clientId: string;
    operation: EffectiveRightsQueryDto['operation'];
    requiredPermission: string | null;
  }): Promise<EffectiveRightsCheck> {
    if (!params.requiredPermission) {
      return this.failCheck(
        'RBAC_PERMISSION_MAPPING_MISSING',
        `Mapping permission indisponible pour l'opération ${params.operation}.`,
      );
    }
    const permissionCodes =
      await this.effectivePermissions.resolvePermissionCodesForRequest({
        userId: params.userId,
        clientId: params.clientId,
        request: {} as RequestWithClient,
      });
    if (!permissionCodes.has(params.requiredPermission)) {
      return this.failCheck(
        'RBAC_PERMISSION_MISSING',
        'Permission RBAC manquante pour cette opération.',
      );
    }
    return this.passCheck('Permission RBAC valide.');
  }

  private async evaluateAclCheck(params: {
    clientId: string;
    userId: string;
    operation: EffectiveRightsQueryDto['operation'];
    resourceType: 'PROJECT' | 'BUDGET' | 'CONTRACT' | 'SUPPLIER' | 'STRATEGIC_OBJECTIVE';
    resourceId: string;
  }): Promise<EffectiveRightsCheck> {
    let allowed = false;
    if (params.operation === 'read') {
      allowed = await this.accessControl.canReadResource({
        clientId: params.clientId,
        userId: params.userId,
        resourceTypeNormalized: params.resourceType,
        resourceId: params.resourceId,
      });
    } else if (params.operation === 'write') {
      allowed = await this.accessControl.canWriteResource({
        clientId: params.clientId,
        userId: params.userId,
        resourceTypeNormalized: params.resourceType,
        resourceId: params.resourceId,
      });
    } else {
      allowed = await this.accessControl.canAdminResource({
        clientId: params.clientId,
        userId: params.userId,
        resourceTypeNormalized: params.resourceType,
        resourceId: params.resourceId,
      });
    }
    if (!allowed) {
      return this.failCheck('ACL_DENIED', 'Accès ACL refusé pour cette ressource.');
    }
    return this.passCheck('ACL valide pour cette ressource.');
  }

  private buildUnsupportedTypeResponse(): EffectiveRightsResponse {
    return this.buildResponse({
      licenseCheck: this.naCheck('Contrôle non exécuté.'),
      subscriptionCheck: this.naCheck('Contrôle non exécuté.'),
      moduleActivationCheck: this.failCheck(
        'RESOURCE_TYPE_UNSUPPORTED',
        'Type de ressource non supporté par le diagnostic V1.',
      ),
      moduleVisibilityCheck: this.naCheck('Contrôle non exécuté.'),
      rbacCheck: this.naCheck('Contrôle non exécuté.'),
      aclCheck: this.naCheck('Contrôle non exécuté.'),
    });
  }

  private buildOutOfScopeResponse(): EffectiveRightsResponse {
    return this.buildResponse({
      licenseCheck: this.failCheck(
        'DIAGNOSTIC_SCOPE_MISMATCH',
        'Diagnostic refusé pour ce périmètre client.',
      ),
      subscriptionCheck: this.naCheck('Contrôle non exécuté.'),
      moduleActivationCheck: this.naCheck('Contrôle non exécuté.'),
      moduleVisibilityCheck: this.naCheck('Contrôle non exécuté.'),
      rbacCheck: this.naCheck('Contrôle non exécuté.'),
      aclCheck: this.naCheck('Contrôle non exécuté.'),
    });
  }

  private buildResponse(checks: {
    licenseCheck: EffectiveRightsCheck;
    subscriptionCheck: EffectiveRightsCheck;
    moduleActivationCheck: EffectiveRightsCheck;
    moduleVisibilityCheck: EffectiveRightsCheck;
    rbacCheck: EffectiveRightsCheck;
    aclCheck: EffectiveRightsCheck;
  }): EffectiveRightsResponse {
    const denialReasons = CHECK_ORDER.flatMap((layer) => {
      const check = checks[layer];
      if (check.status !== 'fail' || !check.reasonCode) return [];
      return [{ layer, reasonCode: check.reasonCode, message: check.message }];
    });
    return {
      ...checks,
      finalDecision: denialReasons.length > 0 ? 'denied' : 'allowed',
      denialReasons,
      computedAt: new Date().toISOString(),
    };
  }

  private passCheck(message: string): EffectiveRightsCheck {
    return { status: 'pass', reasonCode: null, message };
  }

  private failCheck(reasonCode: string, message: string): EffectiveRightsCheck {
    return { status: 'fail', reasonCode, message };
  }

  private naCheck(message: string): EffectiveRightsCheck {
    return { status: 'not_applicable', reasonCode: null, message };
  }
}
