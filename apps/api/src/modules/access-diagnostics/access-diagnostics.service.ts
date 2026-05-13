import { forwardRef, Inject, Injectable } from '@nestjs/common';
import {
  ClientSubscriptionStatus,
  ClientUserLicenseBillingMode,
  ClientUserLicenseType,
  ClientUserStatus,
  ResourceAclPermission,
  ResourceAclSubjectType,
} from '@prisma/client';
import { AccessControlService } from '../access-control/access-control.service';
import { ModuleVisibilityService } from '../module-visibility/module-visibility.service';
import {
  satisfiesPermission,
  SCOPED_READ_MODULES,
} from '@starium-orchestra/rbac-permissions';
import { EffectivePermissionsService } from '../../common/services/effective-permissions.service';
import type { RequestWithClient } from '../../common/types/request-with-client';
import { PrismaService } from '../../prisma/prisma.service';
import type { EffectiveRightsQueryDto } from './dto/effective-rights-query.dto';
import type {
  EffectiveRightsCheck,
  EffectiveRightsResponse,
  MyEffectiveRightsResponse,
  SelfEffectiveControl,
  SelfEffectiveControlId,
} from './access-diagnostics.types';
import { MyEffectiveRightsQueryDto } from './dto/my-effective-rights-query.dto';
import type { ResourceAccessIntent } from './resource-access-diagnostic.registry';
import { RequestMeta } from '../../common/decorators/request-meta.decorator';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import {
  getResourceAccessDiagnosticEntry,
  resolveRbacCodesForIntent,
} from './resource-access-diagnostic.registry';
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

const SELF_CONTROL_ORDER: ReadonlyArray<{
  id: SelfEffectiveControlId;
  layer: DenialLayer;
}> = [
  { id: 'USER_LICENSE', layer: 'licenseCheck' },
  { id: 'CLIENT_SUBSCRIPTION', layer: 'subscriptionCheck' },
  { id: 'CLIENT_MODULE_ENABLED', layer: 'moduleActivationCheck' },
  { id: 'USER_MODULE_VISIBLE', layer: 'moduleVisibilityCheck' },
  { id: 'RBAC_PERMISSION', layer: 'rbacCheck' },
  { id: 'RESOURCE_ACL', layer: 'aclCheck' },
];

@Injectable()
export class AccessDiagnosticsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => AccessControlService))
    private readonly accessControl: AccessControlService,
    private readonly moduleVisibility: ModuleVisibilityService,
    private readonly effectivePermissions: EffectivePermissionsService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async computeEffectiveRights(params: {
    clientId: string;
    userId: string;
    resourceType: EffectiveRightsQueryDto['resourceType'];
    resourceId: string;
    operation: EffectiveRightsQueryDto['operation'];
    /** Si défini (y compris []), remplace le mapping RBAC unique issu de `cfg.permissions`. */
    rbacRequiredPermissionCodes?: readonly string[];
    /** Si défini, ACL évaluée sur ce snapshot (lockout) au lieu de la base. */
    aclRowsOverride?: Array<{
      subjectType: import('@prisma/client').ResourceAclSubjectType;
      subjectId: string;
      permission: import('@prisma/client').ResourceAclPermission;
    }>;
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
    const rbacCheck =
      params.rbacRequiredPermissionCodes !== undefined
        ? await this.evaluateRbacCheckWithCodes({
            userId: params.userId,
            clientId: params.clientId,
            requiredCodes: params.rbacRequiredPermissionCodes,
          })
        : await this.evaluateRbacCheck({
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
      aclRowsOverride: params.aclRowsOverride,
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

  private async evaluateRbacCheckWithCodes(params: {
    userId: string;
    clientId: string;
    requiredCodes: readonly string[];
  }): Promise<EffectiveRightsCheck> {
    if (params.requiredCodes.length === 0) {
      return this.naCheck(
        'Aucune permission RBAC fine pour cet intent ; contrôle porté sur ACL et garde-fous métier.',
      );
    }
    const permissionCodes =
      await this.effectivePermissions.resolvePermissionCodesForRequest({
        userId: params.userId,
        clientId: params.clientId,
        request: {} as RequestWithClient,
      });
    for (const code of params.requiredCodes) {
      if (!satisfiesPermission(permissionCodes, code)) {
        return this.failCheck(
          'RBAC_PERMISSION_MISSING',
          'Permission RBAC manquante pour cette intention.',
          this.rbacAcl015DetailsIfRelevant(permissionCodes, code),
        );
      }
    }
    return this.passCheck('Permissions RBAC requises présentes.');
  }

  /** Détail diagnostic quand un code scoped existe sans ouvrir le legacy (RFC-ACL-015). */
  private rbacAcl015DetailsIfRelevant(
    userCodes: ReadonlySet<string>,
    requiredCode: string,
  ): Record<string, unknown> | undefined {
    const m = /^([a-z0-9_]+)\.read$/.exec(requiredCode);
    if (!m) return undefined;
    const mod = m[1];
    if (!(SCOPED_READ_MODULES as readonly string[]).includes(mod)) return undefined;
    if (userCodes.has(`${mod}.read_scope`) || userCodes.has(`${mod}.read_own`)) {
      return {
        seededNotEnforced: true,
        note:
          'Permission scoped présente (read_scope/read_own) ; filtrage organisationnel non actif (RFC-ACL-016/018). Aucun accès legacy lecture inféré.',
      };
    }
    return undefined;
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
    if (!satisfiesPermission(permissionCodes, params.requiredPermission)) {
      return this.failCheck(
        'RBAC_PERMISSION_MISSING',
        'Permission RBAC manquante pour cette opération.',
        this.rbacAcl015DetailsIfRelevant(permissionCodes, params.requiredPermission),
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
    aclRowsOverride?: Array<{
      subjectType: import('@prisma/client').ResourceAclSubjectType;
      subjectId: string;
      permission: import('@prisma/client').ResourceAclPermission;
    }>;
  }): Promise<EffectiveRightsCheck> {
    let allowed = false;
    if (params.aclRowsOverride) {
      if (params.operation === 'read') {
        allowed = await this.accessControl.canReadResourceWithSimulatedAcl({
          clientId: params.clientId,
          userId: params.userId,
          resourceTypeNormalized: params.resourceType,
          resourceId: params.resourceId,
          aclRows: params.aclRowsOverride,
          sharingFloorAllows: true,
        });
      } else if (params.operation === 'write') {
        allowed = await this.accessControl.canWriteResourceWithSimulatedAcl({
          clientId: params.clientId,
          userId: params.userId,
          resourceTypeNormalized: params.resourceType,
          resourceId: params.resourceId,
          aclRows: params.aclRowsOverride,
          sharingFloorAllows: true,
        });
      } else {
        allowed = await this.accessControl.canAdminResourceWithSimulatedAcl({
          clientId: params.clientId,
          userId: params.userId,
          resourceTypeNormalized: params.resourceType,
          resourceId: params.resourceId,
          aclRows: params.aclRowsOverride,
          sharingFloorAllows: true,
        });
      }
    } else if (params.operation === 'read') {
      allowed = await this.accessControl.canReadResource({
        clientId: params.clientId,
        userId: params.userId,
        resourceTypeNormalized: params.resourceType,
        resourceId: params.resourceId,
        sharingFloorAllows: true,
      });
    } else if (params.operation === 'write') {
      allowed = await this.accessControl.canWriteResource({
        clientId: params.clientId,
        userId: params.userId,
        resourceTypeNormalized: params.resourceType,
        resourceId: params.resourceId,
        sharingFloorAllows: true,
      });
    } else {
      allowed = await this.accessControl.canAdminResource({
        clientId: params.clientId,
        userId: params.userId,
        resourceTypeNormalized: params.resourceType,
        resourceId: params.resourceId,
        sharingFloorAllows: true,
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

  private failCheck(
    reasonCode: string,
    message: string,
    details?: Record<string, unknown>,
  ): EffectiveRightsCheck {
    return { status: 'fail', reasonCode, message, ...(details ? { details } : {}) };
  }

  private naCheck(message: string): EffectiveRightsCheck {
    return { status: 'not_applicable', reasonCode: null, message };
  }

  async computeMyEffectiveRights(params: {
    clientId: string;
    userId: string;
    query: MyEffectiveRightsQueryDto;
    meta?: RequestMeta;
  }): Promise<MyEffectiveRightsResponse> {
    const rt = params.query.resourceType.trim().toUpperCase();
    const entry = getResourceAccessDiagnosticEntry(rt);
    const cfg = getResourceDiagnosticsConfig(rt as EffectiveRightsQueryDto['resourceType']);
    if (!entry || !cfg) {
      const out = this.buildMyUnsafeResponse(
        "Impossible d'évaluer cet accès dans ce contexte.",
        'DIAGNOSTIC_UNSAFE_CONTEXT',
      );
      await this.auditMyDiagnostic(params, out);
      return out;
    }

    const [membership, resource] = await Promise.all([
      this.prisma.clientUser.findFirst({
        where: { clientId: params.clientId, userId: params.userId },
        include: { subscription: true },
      }),
      cfg.resolveResourceForClient(this.prisma, {
        clientId: params.clientId,
        resourceId: params.query.resourceId,
      }),
    ]);

    if (!membership || !resource || resource.clientId !== params.clientId) {
      const out = this.buildMyUnsafeResponse(
        "Impossible d'évaluer cet accès dans ce contexte.",
        'DIAGNOSTIC_UNSAFE_CONTEXT',
      );
      await this.auditMyDiagnostic(params, out);
      return out;
    }

    const operation = this.intentToOperation(params.query.intent);
    const rbacCodes = resolveRbacCodesForIntent(entry, params.query.intent);

    const raw = await this.computeEffectiveRights({
      clientId: params.clientId,
      userId: params.userId,
      resourceType: cfg.resourceType,
      resourceId: params.query.resourceId,
      operation,
      rbacRequiredPermissionCodes: [...rbacCodes],
    });

    const out = this.mapRawToMyRights(raw, resource.label);
    await this.auditMyDiagnostic(params, out);
    return out;
  }

  private intentToOperation(
    intent: ResourceAccessIntent,
  ): EffectiveRightsQueryDto['operation'] {
    if (intent === 'READ') return 'read';
    if (intent === 'WRITE') return 'write';
    return 'admin';
  }

  private mapRawToMyRights(
    r: EffectiveRightsResponse,
    resourceLabel: string,
  ): MyEffectiveRightsResponse {
    const controls: SelfEffectiveControl[] = SELF_CONTROL_ORDER.map(({ id, layer }) => {
      const c = r[layer];
      return {
        id,
        status:
          c.status === 'pass'
            ? 'pass'
            : c.status === 'fail'
              ? 'fail'
              : 'not_applicable',
        reasonCode: c.reasonCode,
        message: c.message,
      };
    });
    const denied = r.finalDecision === 'denied';
    const firstFail = SELF_CONTROL_ORDER.map((x) => r[x.layer]).find(
      (c) => c.status === 'fail',
    );
    const safeMessage = denied
      ? (firstFail?.message ?? 'Accès refusé pour cette intention.')
      : 'Accès autorisé pour cette intention.';
    return {
      finalDecision: denied ? 'DENIED' : 'ALLOWED',
      reasonCode: denied ? (firstFail?.reasonCode ?? 'ACCESS_DENIED') : null,
      resourceLabel,
      controls,
      safeMessage,
      computedAt: r.computedAt,
    };
  }

  private buildMyUnsafeResponse(
    safeMessage: string,
    reasonCode: string,
  ): MyEffectiveRightsResponse {
    const controls: SelfEffectiveControl[] = SELF_CONTROL_ORDER.map(({ id }) => ({
      id,
      status: 'fail' as const,
      reasonCode,
      message: safeMessage,
    }));
    return {
      finalDecision: 'UNSAFE_CONTEXT',
      reasonCode,
      resourceLabel: null,
      controls,
      safeMessage,
      computedAt: new Date().toISOString(),
    };
  }

  private async auditMyDiagnostic(
    params: {
      clientId: string;
      userId: string;
      query: MyEffectiveRightsQueryDto;
      meta?: RequestMeta;
    },
    out: MyEffectiveRightsResponse,
  ): Promise<void> {
    if (out.finalDecision === 'ALLOWED') {
      return;
    }
    try {
      await this.auditLogs.create({
        clientId: params.clientId,
        userId: params.userId,
        action: 'access_diagnostic.self_outcome',
        resourceType: 'access_diagnostic',
        resourceId: params.query.resourceId,
        oldValue: null,
        newValue: {
          intent: params.query.intent,
          resourceType: params.query.resourceType,
          finalDecision: out.finalDecision,
          reasonCode: out.reasonCode,
        },
        ipAddress: params.meta?.ipAddress,
        userAgent: params.meta?.userAgent,
        requestId: params.meta?.requestId,
      });
    } catch {
      /* best-effort */
    }
  }

  /**
   * RFC-ACL-014 §2 — après simulation des lignes ACL finales, existe-t-il au moins un
   * utilisateur actif qui passe les six contrôles avec intention ADMIN (RBAC registre + ACL simulée).
   */
  async hasEffectiveAdminSuccessorAfterSimulation(params: {
    clientId: string;
    resourceType: string;
    resourceId: string;
    simulatedRows: Array<{
      subjectType: ResourceAclSubjectType;
      subjectId: string;
      permission: ResourceAclPermission;
    }>;
  }): Promise<boolean> {
    if (params.simulatedRows.length === 0) {
      return true;
    }
    const cfg = getResourceDiagnosticsConfig(params.resourceType);
    if (!cfg) {
      return true;
    }
    const entry = getResourceAccessDiagnosticEntry(params.resourceType);
    if (!entry) {
      return true;
    }

    const adminCandidates = await this.collectCandidateUserIdsForAdminAcl(
      params.clientId,
      params.simulatedRows,
    );
    const rbacCodes = resolveRbacCodesForIntent(entry, 'ADMIN');

    for (const uid of adminCandidates) {
      const cu = await this.prisma.clientUser.findFirst({
        where: {
          userId: uid,
          clientId: params.clientId,
          status: ClientUserStatus.ACTIVE,
        },
      });
      if (!cu) {
        continue;
      }

      const rights = await this.computeEffectiveRights({
        clientId: params.clientId,
        userId: uid,
        resourceType: cfg.resourceType,
        resourceId: params.resourceId,
        operation: 'admin',
        rbacRequiredPermissionCodes: [...rbacCodes],
        aclRowsOverride: params.simulatedRows,
      });
      if (rights.finalDecision === 'allowed') {
        return true;
      }
    }
    return false;
  }

  private async collectCandidateUserIdsForAdminAcl(
    clientId: string,
    rows: Array<{
      subjectType: ResourceAclSubjectType;
      subjectId: string;
      permission: ResourceAclPermission;
    }>,
  ): Promise<string[]> {
    const userIds = new Set<string>();
    const adminGroupIds: string[] = [];
    for (const r of rows) {
      if (r.permission !== ResourceAclPermission.ADMIN) continue;
      if (r.subjectType === ResourceAclSubjectType.USER) {
        userIds.add(r.subjectId);
      } else {
        adminGroupIds.push(r.subjectId);
      }
    }
    if (adminGroupIds.length > 0) {
      const members = await this.prisma.accessGroupMember.findMany({
        where: { clientId, groupId: { in: adminGroupIds } },
        select: { userId: true },
      });
      for (const m of members) {
        userIds.add(m.userId);
      }
    }
    return [...userIds];
  }
}
