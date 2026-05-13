import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ClientSubscriptionStatus,
  ClientUserLicenseBillingMode,
  ClientUserLicenseType,
  ClientUserStatus,
  OrgUnitStatus,
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
import { OrganizationScopeService } from '../../common/organization/organization-scope.service';
import type { RequestWithClient } from '../../common/types/request-with-client';
import { PrismaService } from '../../prisma/prisma.service';
import type { EffectiveRightsQueryDto } from './dto/effective-rights-query.dto';
import type {
  EffectiveRightsCheck,
  EffectiveRightsDenialLayer,
  EffectiveRightsResponse,
  EnrichedDiagnosticCheck,
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
import {
  getResourceDiagnosticsConfig,
  type SupportedDiagnosticResourceType,
} from './resource-diagnostics.registry';
import { loadAccessResources } from '../access-decision/access-decision.registry';
import { AccessDecisionService } from '../access-decision/access-decision.service';
import type { AccessDecisionResult } from '../access-decision/access-decision.types';
import { RESOURCE_ACL_RESOURCE_TYPES } from '../access-control/resource-acl.constants';
import { parseAccessDiagnosticsEnrichedFlag } from './access-diagnostics-enriched.config';
import {
  joinAccessDecisionReasonsFr,
  messageForAccessDecisionReasonCode,
  messageForOrgScopeReason,
} from './access-diagnostics-reason-messages.fr';

type DenialLayer = EffectiveRightsDenialLayer;

const CHECK_ORDER: DenialLayer[] = [
  'licenseCheck',
  'subscriptionCheck',
  'moduleActivationCheck',
  'moduleVisibilityCheck',
  'rbacCheck',
  'aclCheck',
];

const SELF_CONTROL_ORDER_BASE: ReadonlyArray<{
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

const SELF_CONTROL_ORDER_ENRICHED: ReadonlyArray<{
  id: SelfEffectiveControlId;
  layer?: DenialLayer;
  enrichedKey?: 'organizationScopeCheck' | 'resourceOwnershipCheck' | 'resourceAccessPolicyCheck';
}> = [
  { id: 'USER_LICENSE', layer: 'licenseCheck' },
  { id: 'CLIENT_SUBSCRIPTION', layer: 'subscriptionCheck' },
  { id: 'CLIENT_MODULE_ENABLED', layer: 'moduleActivationCheck' },
  { id: 'USER_MODULE_VISIBLE', layer: 'moduleVisibilityCheck' },
  { id: 'RBAC_PERMISSION', layer: 'rbacCheck' },
  { id: 'ORGANIZATION_SCOPE', enrichedKey: 'organizationScopeCheck' },
  { id: 'RESOURCE_OWNERSHIP', enrichedKey: 'resourceOwnershipCheck' },
  { id: 'RESOURCE_ACCESS_POLICY', enrichedKey: 'resourceAccessPolicyCheck' },
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
    private readonly config: ConfigService,
    @Inject(forwardRef(() => AccessDecisionService))
    private readonly accessDecision: AccessDecisionService,
    private readonly organizationScope: OrganizationScopeService,
  ) {}

  private isEnrichedFlagOn(): boolean {
    return parseAccessDiagnosticsEnrichedFlag(
      this.config.get<string>('ACCESS_DIAGNOSTICS_ENRICHED'),
    );
  }

  async computeEffectiveRights(params: {
    clientId: string;
    userId: string;
    resourceType: EffectiveRightsQueryDto['resourceType'];
    resourceId: string;
    operation: EffectiveRightsQueryDto['operation'];
    rbacRequiredPermissionCodes?: readonly string[];
    aclRowsOverride?: Array<{
      subjectType: import('@prisma/client').ResourceAclSubjectType;
      subjectId: string;
      permission: import('@prisma/client').ResourceAclPermission;
    }>;
    /** Requête HTTP réelle uniquement ; jamais d’objet casté vide pour le moteur RFC-018. */
    httpRequest?: RequestWithClient;
  }): Promise<EffectiveRightsResponse> {
    const cfg = getResourceDiagnosticsConfig(params.resourceType);
    if (!cfg) {
      return this.stripUndefinedEnriched(this.buildUnsupportedTypeResponse());
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
      return this.stripUndefinedEnriched(this.buildOutOfScopeResponse());
    }

    if (resource.clientId !== params.clientId) {
      return this.stripUndefinedEnriched(this.buildOutOfScopeResponse());
    }

    const enrichedOn = this.isEnrichedFlagOn();
    const canUseReadEngine =
      enrichedOn && params.operation === 'read' && !params.aclRowsOverride;

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
            httpRequest: params.httpRequest,
          })
        : await this.evaluateRbacCheck({
            userId: params.userId,
            clientId: params.clientId,
            operation: params.operation,
            requiredPermission: cfg.permissions[params.operation],
            httpRequest: params.httpRequest,
          });
    const aclCheck = await this.evaluateAclCheck({
      clientId: params.clientId,
      userId: params.userId,
      operation: params.operation,
      resourceType: cfg.aclResourceType,
      resourceId: params.resourceId,
      aclRowsOverride: params.aclRowsOverride,
    });

    let response = this.buildResponse({
      licenseCheck,
      subscriptionCheck,
      moduleActivationCheck,
      moduleVisibilityCheck,
      rbacCheck,
      aclCheck,
    });

    if (!enrichedOn) {
      return this.stripUndefinedEnriched(response);
    }

    if (canUseReadEngine) {
      const engine = await this.accessDecision.decide({
        request: params.httpRequest,
        clientId: params.clientId,
        userId: params.userId,
        resourceType: cfg.resourceType,
        resourceId: params.resourceId,
        intent: 'read',
      });
      const engineAllowed = engine.allowed;
      const harmonized = {
        licenseCheck: this.harmonizeLegacyCheck(licenseCheck, engineAllowed),
        subscriptionCheck: this.harmonizeLegacyCheck(subscriptionCheck, engineAllowed),
        moduleActivationCheck: this.harmonizeLegacyCheck(moduleActivationCheck, engineAllowed),
        moduleVisibilityCheck: this.harmonizeLegacyCheck(moduleVisibilityCheck, engineAllowed),
        rbacCheck: this.harmonizeLegacyCheck(rbacCheck, engineAllowed),
        aclCheck: this.harmonizeLegacyCheck(aclCheck, engineAllowed),
      };
      const denialReasons = engineAllowed
        ? []
        : this.buildEngineDenialReasons(engine);
      const enriched = await this.buildReadEnrichedChecks({
        clientId: params.clientId,
        userId: params.userId,
        resourceType: cfg.resourceType,
        resourceId: params.resourceId,
        engine,
        httpRequest: params.httpRequest,
      });
      response = {
        ...harmonized,
        finalDecision: engineAllowed ? 'allowed' : 'denied',
        denialReasons,
        computedAt: new Date().toISOString(),
        ...enriched,
      };
      return this.stripUndefinedEnriched(response);
    }

    if (params.operation === 'write' || params.operation === 'admin') {
      const info = await this.buildWriteAdminInformationalChecks({
        clientId: params.clientId,
        userId: params.userId,
        resourceType: cfg.resourceType,
        resourceId: params.resourceId,
        operation: params.operation,
        aclResourceType: cfg.aclResourceType,
        httpRequest: params.httpRequest,
      });
      response = {
        ...response,
        ...info,
      };
    }

    return this.stripUndefinedEnriched(response);
  }

  private stripUndefinedEnriched(r: EffectiveRightsResponse): EffectiveRightsResponse {
    const out = { ...r };
    if (out.organizationScopeCheck === undefined) {
      delete out.organizationScopeCheck;
    }
    if (out.resourceOwnershipCheck === undefined) {
      delete out.resourceOwnershipCheck;
    }
    if (out.resourceAccessPolicyCheck === undefined) {
      delete out.resourceAccessPolicyCheck;
    }
    return out;
  }

  private harmonizeLegacyCheck(
    check: EffectiveRightsCheck,
    engineAllowed: boolean,
  ): EffectiveRightsCheck {
    const legacyFail = check.status === 'fail';
    const legacyAllow = check.status === 'pass' || check.status === 'not_applicable';
    if (engineAllowed && legacyFail) {
      return {
        ...check,
        status: 'pass',
        reasonCode: null,
        message:
          'Ce contrôle pris isolément serait en échec ; la décision finale de lecture suit le moteur RFC-018.',
        evaluationMode: 'superseded_by_decision_engine',
      };
    }
    if (!engineAllowed && legacyAllow) {
      return {
        ...check,
        status: 'pass',
        reasonCode: null,
        message:
          'Ce critère est satisfait, mais la lecture est refusée par le moteur RFC-018 (consolidation licence, RBAC, organisation et politique d’accès).',
        evaluationMode: 'informational',
      };
    }
    return { ...check, evaluationMode: 'enforced' };
  }

  private mapEngineReasonToLayer(code: string): EffectiveRightsDenialLayer {
    if (code.includes('SUBSCRIPTION')) {
      return 'subscriptionCheck';
    }
    if (code.includes('LICENSE')) {
      return 'licenseCheck';
    }
    if (code.includes('MODULE')) {
      return 'moduleActivationCheck';
    }
    if (code.includes('RBAC') || code.includes('ORG') || code.includes('SCOPE')) {
      return 'rbacCheck';
    }
    return 'aclCheck';
  }

  private buildEngineDenialReasons(engine: AccessDecisionResult): Array<{
    layer: EffectiveRightsDenialLayer;
    reasonCode: string;
    message: string;
  }> {
    return engine.reasonCodes.map((reasonCode) => ({
      layer: this.mapEngineReasonToLayer(reasonCode),
      reasonCode,
      message: messageForAccessDecisionReasonCode(reasonCode),
    }));
  }

  private async buildReadEnrichedChecks(input: {
    clientId: string;
    userId: string;
    resourceType: SupportedDiagnosticResourceType;
    resourceId: string;
    engine: AccessDecisionResult;
    httpRequest?: RequestWithClient;
  }): Promise<{
    organizationScopeCheck: EnrichedDiagnosticCheck;
    resourceOwnershipCheck: EnrichedDiagnosticCheck;
    resourceAccessPolicyCheck: EnrichedDiagnosticCheck;
  }> {
    const org = input.engine.orgScope;
    let orgStatus: EffectiveRightsCheck['status'] = 'pass';
    let orgReason: string | null = null;
    let orgMsg = 'Périmètre organisationnel compatible avec la décision de lecture.';
    if (org?.required && org.verdict?.level === 'NONE') {
      orgStatus = 'fail';
      orgReason = 'ACCESS_DENIED_ORG_SCOPE';
      orgMsg = joinAccessDecisionReasonsFr(input.engine.reasonCodes);
    } else if (org?.required && org.verdict) {
      orgMsg = `Périmètre organisationnel : ${org.verdict.level}. ${(org.verdict.reasonCodes ?? [])
        .map((c) => messageForOrgScopeReason(c))
        .join(' ')}`;
    } else if (!org?.required) {
      orgMsg =
        'Périmètre organisationnel non exigé pour cette combinaison permission / ressource (ex. lecture élargie).';
    }

    const ownership = await this.buildOwnershipCheck({
      clientId: input.clientId,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      enforcedForIntent: true,
    });

    const acl = input.engine.acl;
    const polStatus: EffectiveRightsCheck['status'] = acl?.allowed ? 'pass' : 'fail';
    const polMsg = acl
      ? `Politique / ACL : mode ${acl.mode}, effectif ${acl.effectiveAccessMode}. ${messageForAccessDecisionReasonCode(acl.reasonCode)}`
      : 'Politique d’accès : non résolue.';

    return {
      organizationScopeCheck: {
        status: orgStatus,
        reasonCode: orgReason,
        message: orgMsg,
        enforcedForIntent: true,
        details: org?.verdict
          ? { level: org.verdict.level, reasonCodes: org.verdict.reasonCodes }
          : { required: org?.required ?? false },
      },
      resourceOwnershipCheck: ownership,
      resourceAccessPolicyCheck: {
        status: polStatus,
        reasonCode: acl?.reasonCode ?? null,
        message: polMsg,
        enforcedForIntent: true,
        details: acl
          ? {
              mode: acl.mode,
              effectiveAccessMode: acl.effectiveAccessMode,
              aclRank: acl.aclRank,
              floorAllowed: input.engine.floorAllowed,
            }
          : undefined,
      },
    };
  }

  private async buildOwnershipCheck(input: {
    clientId: string;
    resourceType: SupportedDiagnosticResourceType;
    resourceId: string;
    enforcedForIntent: boolean;
  }): Promise<EnrichedDiagnosticCheck> {
    const map = await loadAccessResources(this.prisma, {
      clientId: input.clientId,
      resourceType: input.resourceType,
      resourceIds: [input.resourceId],
    });
    const row = map.get(input.resourceId);
    if (!row) {
      return {
        status: 'not_applicable',
        reasonCode: null,
        message: 'Propriété organisationnelle : ressource hors registre de diagnostic.',
        enforcedForIntent: input.enforcedForIntent,
      };
    }
    if (row.ownerOrgUnitId === null) {
      return {
        status: 'fail',
        reasonCode: 'MISSING_OWNER_ORG_UNIT',
        message: 'Aucune unité organisationnelle propriétaire n’est définie sur cette ressource.',
        enforcedForIntent: input.enforcedForIntent,
      };
    }
    const unit = await this.prisma.orgUnit.findFirst({
      where: { id: row.ownerOrgUnitId, clientId: input.clientId },
      select: { name: true, code: true, status: true, archivedAt: true },
    });
    if (
      !unit ||
      unit.status !== OrgUnitStatus.ACTIVE ||
      unit.archivedAt !== null
    ) {
      return {
        status: 'fail',
        reasonCode: 'SCOPE_OWNER_ORG_UNIT_INACTIVE',
        message:
          'L’unité organisationnelle propriétaire est absente, inactive ou archivée pour ce client.',
        enforcedForIntent: input.enforcedForIntent,
        details: { ownerOrgUnitId: row.ownerOrgUnitId },
      };
    }
    const label = unit.code ? `${unit.name} (${unit.code})` : unit.name;
    return {
      status: 'pass',
      reasonCode: null,
      message: `Unité propriétaire : ${label}.`,
      enforcedForIntent: input.enforcedForIntent,
      details: { ownerOrgUnitLabel: label },
    };
  }

  private async buildWriteAdminInformationalChecks(input: {
    clientId: string;
    userId: string;
    resourceType: SupportedDiagnosticResourceType;
    resourceId: string;
    operation: 'write' | 'admin';
    aclResourceType: keyof typeof RESOURCE_ACL_RESOURCE_TYPES;
    httpRequest?: RequestWithClient;
  }): Promise<{
    organizationScopeCheck: EnrichedDiagnosticCheck;
    resourceOwnershipCheck: EnrichedDiagnosticCheck;
    resourceAccessPolicyCheck: EnrichedDiagnosticCheck;
  }> {
    const map = await loadAccessResources(this.prisma, {
      clientId: input.clientId,
      resourceType: input.resourceType,
      resourceIds: [input.resourceId],
    });
    const row = map.get(input.resourceId);
    const cu = await this.prisma.clientUser.findFirst({
      where: { clientId: input.clientId, userId: input.userId },
      select: { resourceId: true },
    });
    const verdict = await this.organizationScope.resolveOrgScope({
      clientId: input.clientId,
      userId: input.userId,
      resource: {
        ownerOrgUnitId: row?.ownerOrgUnitId ?? null,
        ownHints: { subjectResourceId: cu?.resourceId ?? null },
      },
      request: input.httpRequest,
    });
    const aclType = RESOURCE_ACL_RESOURCE_TYPES[input.aclResourceType];
    const aclEval = await this.accessControl.evaluateResourceAccess({
      clientId: input.clientId,
      userId: input.userId,
      resourceTypeNormalized: aclType,
      resourceId: input.resourceId,
      operation: input.operation,
      sharingFloorAllows: true,
    });
    const ownership = await this.buildOwnershipCheck({
      clientId: input.clientId,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      enforcedForIntent: false,
    });
    return {
      organizationScopeCheck: {
        status: 'pass',
        reasonCode: null,
        message: `Aperçu organisationnel (informatif) : verdict ${verdict.level}. ${verdict.reasonCodes.map((c) => messageForOrgScopeReason(c)).join(' ')}`,
        enforcedForIntent: false,
        details: { level: verdict.level, reasonCodes: verdict.reasonCodes },
      },
      resourceOwnershipCheck: ownership,
      resourceAccessPolicyCheck: {
        status: aclEval.allowed ? 'pass' : 'fail',
        reasonCode: aclEval.reasonCode,
        message: `Aperçu politique / ACL pour l’opération « ${input.operation} » (informatif, non contractuel tant que RFC-020 n’est pas livré) : ${messageForAccessDecisionReasonCode(aclEval.reasonCode)}`,
        enforcedForIntent: false,
        details: {
          mode: aclEval.mode,
          effectiveAccessMode: aclEval.effectiveAccessMode,
        },
      },
    };
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
    httpRequest?: RequestWithClient;
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
        request: params.httpRequest,
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
    httpRequest?: RequestWithClient;
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
        request: params.httpRequest,
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
    httpRequest?: RequestWithClient;
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
      httpRequest: params.httpRequest,
    });

    const out = this.mapRawToMyRights(raw, resource.label);
    await this.auditMyDiagnostic(params, out, raw);
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
    const useEnrichedControls =
      r.organizationScopeCheck !== undefined ||
      r.resourceOwnershipCheck !== undefined ||
      r.resourceAccessPolicyCheck !== undefined;

    const order = useEnrichedControls ? SELF_CONTROL_ORDER_ENRICHED : SELF_CONTROL_ORDER_BASE;

    const controls: SelfEffectiveControl[] = order.map((row) => {
      if ('enrichedKey' in row && row.enrichedKey) {
        const b = r[row.enrichedKey]!;
        return {
          id: row.id,
          status: b.status,
          reasonCode: b.reasonCode,
          message: b.message,
          enforcedForIntent: b.enforcedForIntent,
        };
      }
      const layer = (row as { layer: DenialLayer }).layer;
      const c = r[layer];
      return {
        id: row.id,
        status:
          c.status === 'pass' ? 'pass' : c.status === 'fail' ? 'fail' : 'not_applicable',
        reasonCode: c.reasonCode,
        message: c.message,
        evaluationMode: c.evaluationMode,
      };
    });

    const denied = r.finalDecision === 'denied';
    const firstBlocking = order
      .map((row) => {
        if ('enrichedKey' in row && row.enrichedKey) {
          const b = r[row.enrichedKey]!;
          if (b.status === 'fail') {
            return { reasonCode: b.reasonCode, message: b.message };
          }
          return null;
        }
        const layer = (row as { layer: DenialLayer }).layer;
        const c = r[layer];
        if (c.status === 'fail') {
          return { reasonCode: c.reasonCode, message: c.message };
        }
        return null;
      })
      .find(Boolean);

    const safeMessage = denied
      ? (firstBlocking?.message ??
          r.denialReasons[0]?.message ??
          'Accès refusé pour cette intention.')
      : 'Accès autorisé pour cette intention.';

    return {
      finalDecision: denied ? 'DENIED' : 'ALLOWED',
      reasonCode: denied
        ? (firstBlocking?.reasonCode ??
            r.denialReasons[0]?.reasonCode ??
            'ACCESS_DENIED')
        : null,
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
    const controls: SelfEffectiveControl[] = SELF_CONTROL_ORDER_BASE.map(({ id }) => ({
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
    raw?: EffectiveRightsResponse,
  ): Promise<void> {
    if (out.finalDecision === 'ALLOWED') {
      return;
    }
    try {
      const engineCodes =
        raw?.denialReasons?.map((d) => d.reasonCode).filter(Boolean) ?? [];
      const orgLevel =
        raw?.organizationScopeCheck?.details &&
        typeof (raw.organizationScopeCheck.details as { level?: string }).level ===
          'string'
          ? (raw.organizationScopeCheck.details as { level: string }).level
          : undefined;
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
          decisionReasonCodesPreview: engineCodes.slice(0, 8),
          orgVerdictLevel: orgLevel,
        },
        ipAddress: params.meta?.ipAddress,
        userAgent: params.meta?.userAgent,
        requestId: params.meta?.requestId,
      });
    } catch {
      /* best-effort */
    }
  }

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
