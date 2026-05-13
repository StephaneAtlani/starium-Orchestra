import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ClientModuleStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EffectivePermissionsService } from '../../common/services/effective-permissions.service';
import { OrganizationScopeService } from '../../common/organization/organization-scope.service';
import type { RequestWithClient } from '../../common/types/request-with-client';
import { ModuleVisibilityService } from '../module-visibility/module-visibility.service';
import { AccessControlService } from '../access-control/access-control.service';
import {
  RESOURCE_ACL_RESOURCE_TYPES,
  type ResourceAclCanonicalResourceType,
} from '../access-control/resource-acl.constants';
import type { ResourceAccessEvaluationResult } from '../access-control/resource-access-policy.decision';
import { getResourceAccessDiagnosticEntry } from '../access-diagnostics/resource-access-diagnostic.registry';
import { loadAccessResources } from './access-decision.registry';
import { evaluateLicenseGate, evaluateSubscriptionGate } from './membership-access-gates';
import { evaluateReadRbacIntent } from './access-decision.read-intent';
import type { AccessDecisionResult, AccessIntent } from './access-decision.types';
import type { SupportedDiagnosticResourceType } from '../access-diagnostics/resource-diagnostics.registry';

/**
 * RFC-017 ignore le plancher pour DEFAULT sans ACL — on ré-applique le périmètre org
 * pour `read_own` / `read_scope`, sauf **SHARING** avec entrée ACL explicite qui matche.
 */
function applyOrgNarrowingAfterAcl(input: {
  readRbacOrgScopeRequired: boolean;
  orgVerdictLevel: 'NONE' | 'OWN' | 'SCOPE' | 'ALL' | undefined;
  aclEval: ResourceAccessEvaluationResult;
}): boolean {
  const { readRbacOrgScopeRequired: orgReq, orgVerdictLevel, aclEval } = input;
  if (!orgReq || orgVerdictLevel !== 'NONE') {
    return aclEval.allowed;
  }
  if (aclEval.reasonCode === 'POLICY_SHARING_ACL_MATCH') {
    return aclEval.allowed;
  }
  return false;
}

@Injectable()
export class AccessDecisionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly effectivePermissions: EffectivePermissionsService,
    private readonly organizationScope: OrganizationScopeService,
    private readonly moduleVisibility: ModuleVisibilityService,
    private readonly accessControl: AccessControlService,
  ) {}

  /**
   * RFC-ACL-018 — lecture / liste uniquement en V1 (`write` / `admin` → erreur explicite).
   */
  async decide(params: {
    request: RequestWithClient;
    clientId: string;
    userId: string;
    resourceType: SupportedDiagnosticResourceType;
    resourceId: string;
    intent: AccessIntent;
  }): Promise<AccessDecisionResult> {
    if (params.intent === 'write' || params.intent === 'admin') {
      throw new BadRequestException(
        'RFC-ACL-018 V1 : intents write/admin non branchés sur le moteur (attendre RFC-020).',
      );
    }

    const gate = await this.runReadGates(params);
    if (!gate.ok) {
      return gate.denied;
    }

    const aclType = RESOURCE_ACL_RESOURCE_TYPES[
      gate.entry.aclResourceType as keyof typeof RESOURCE_ACL_RESOURCE_TYPES
    ] as ResourceAclCanonicalResourceType;

    const resourceMap = await loadAccessResources(this.prisma, {
      clientId: params.clientId,
      resourceType: params.resourceType,
      resourceIds: [params.resourceId],
    });
    const scopeRow = resourceMap.get(params.resourceId);
    if (!scopeRow) {
      return this.deniedNotFound(params, gate.readRbac);
    }

    const { orgDetail, floorAllowed } = await this.resolveOrgAndFloor({
      request: params.request,
      clientId: params.clientId,
      userId: params.userId,
      orgScopeRequired: gate.readRbac.orgScopeRequired,
      scopeRow,
    });

    const aclEval = await this.accessControl.evaluateResourceAccess({
      clientId: params.clientId,
      userId: params.userId,
      resourceTypeNormalized: aclType,
      resourceId: params.resourceId,
      operation: 'read',
      sharingFloorAllows: floorAllowed,
    });

    const allowed = applyOrgNarrowingAfterAcl({
      readRbacOrgScopeRequired: gate.readRbac.orgScopeRequired,
      orgVerdictLevel: orgDetail?.verdict?.level,
      aclEval,
    });

    return this.composeResult({
      params,
      readRbac: gate.readRbac,
      orgDetail,
      floorAllowed,
      aclEval,
      allowed,
    });
  }

  async assertAllowed(params: Parameters<AccessDecisionService['decide']>[0]): Promise<void> {
    const r = await this.decide(params);
    if (!r.allowed) {
      throw new ForbiddenException(
        r.reasonCodes.length ? r.reasonCodes.join('; ') : 'Accès refusé',
      );
    }
  }

  /**
   * Liste — même matrice que `decide`, plancher org **par ressource**, batch policy/ACL.
   */
  async filterResourceIdsByAccess(params: {
    request: RequestWithClient;
    clientId: string;
    userId: string;
    resourceType: SupportedDiagnosticResourceType;
    resourceIds: string[];
    intent: AccessIntent;
  }): Promise<string[]> {
    if (params.intent === 'write' || params.intent === 'admin') {
      throw new BadRequestException(
        'RFC-ACL-018 V1 : intents write/admin non branchés sur le moteur (attendre RFC-020).',
      );
    }

    const uniqueIds = [...new Set(params.resourceIds.filter(Boolean))];
    if (uniqueIds.length === 0) {
      return [];
    }

    const gate = await this.runReadGates({
      request: params.request,
      clientId: params.clientId,
      userId: params.userId,
      resourceType: params.resourceType,
      resourceId: uniqueIds[0]!,
      intent: params.intent === 'list' ? 'list' : 'read',
    });
    if (!gate.ok) {
      return [];
    }

    const aclType = RESOURCE_ACL_RESOURCE_TYPES[
      gate.entry.aclResourceType as keyof typeof RESOURCE_ACL_RESOURCE_TYPES
    ] as ResourceAclCanonicalResourceType;

    const resourceMap = await loadAccessResources(this.prisma, {
      clientId: params.clientId,
      resourceType: params.resourceType,
      resourceIds: uniqueIds,
    });

    const floorById = new Map<string, boolean>();
    const orgLevelById = new Map<string, 'NONE' | 'OWN' | 'SCOPE' | 'ALL' | undefined>();

    for (const id of uniqueIds) {
      const row = resourceMap.get(id);
      if (!row) {
        floorById.set(id, false);
        orgLevelById.set(id, undefined);
        continue;
      }
      const { floorAllowed, orgDetail } = await this.resolveOrgAndFloor({
        request: params.request,
        clientId: params.clientId,
        userId: params.userId,
        orgScopeRequired: gate.readRbac.orgScopeRequired,
        scopeRow: row,
      });
      floorById.set(id, floorAllowed);
      orgLevelById.set(id, orgDetail?.verdict?.level);
    }

    const batch = await this.accessControl.evaluateResourceAccessBatch({
      clientId: params.clientId,
      userId: params.userId,
      resourceTypeNormalized: aclType,
      resourceIds: uniqueIds,
      operation: 'read',
      sharingFloorAllowsByResourceId: floorById,
    });

    return uniqueIds.filter((id) => {
      const aclEval = batch.get(id);
      if (!aclEval) return false;
      return applyOrgNarrowingAfterAcl({
        readRbacOrgScopeRequired: gate.readRbac.orgScopeRequired,
        orgVerdictLevel: orgLevelById.get(id),
        aclEval,
      });
    });
  }

  private deniedNotFound(
    params: { resourceType: SupportedDiagnosticResourceType; resourceId: string; intent: AccessIntent },
    readRbac: ReturnType<typeof evaluateReadRbacIntent>,
  ): AccessDecisionResult {
    return {
      allowed: false,
      reasonCodes: ['ACCESS_DENIED_RESOURCE_NOT_FOUND'],
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      intent: params.intent,
      rbac: {
        allowed: readRbac.allowed,
        matchedPermission: readRbac.matchedPermission,
        requiredCandidates: [...readRbac.requiredCandidates],
      },
      floorAllowed: false,
    };
  }

  private composeResult(input: {
    params: {
      resourceType: SupportedDiagnosticResourceType;
      resourceId: string;
      intent: AccessIntent;
    };
    readRbac: ReturnType<typeof evaluateReadRbacIntent>;
    orgDetail: AccessDecisionResult['orgScope'];
    floorAllowed: boolean;
    aclEval: ResourceAccessEvaluationResult;
    allowed: boolean;
  }): AccessDecisionResult {
    const { params, readRbac, orgDetail, floorAllowed, aclEval, allowed } = input;
    const reasonCodes: string[] = [];

    if (!allowed) {
      if (aclEval.reasonCode.startsWith('POLICY_')) {
        reasonCodes.push('ACCESS_DENIED_ACL_POLICY');
      }
      reasonCodes.push(aclEval.reasonCode);
      if (
        readRbac.orgScopeRequired &&
        orgDetail?.verdict?.level === 'NONE' &&
        aclEval.reasonCode !== 'POLICY_SHARING_ACL_MATCH'
      ) {
        reasonCodes.push('ACCESS_DENIED_ORG_SCOPE');
      }
    } else {
      if (readRbac.matchedPermission?.endsWith('.read_all')) {
        reasonCodes.push('ACCESS_ALLOWED_BY_READ_ALL');
      } else if (
        readRbac.matchedPermission?.endsWith('.read_scope') &&
        orgDetail?.verdict?.level === 'SCOPE'
      ) {
        reasonCodes.push('ACCESS_ALLOWED_BY_SCOPE');
      } else if (
        readRbac.matchedPermission?.endsWith('.read_own') &&
        orgDetail?.verdict?.level === 'OWN'
      ) {
        reasonCodes.push('ACCESS_ALLOWED_BY_OWN');
      } else if (
        aclEval.reasonCode === 'POLICY_SHARING_ACL_MATCH' ||
        aclEval.reasonCode === 'POLICY_SHARING_ACL_NO_MATCH_FLOOR_ALLOW'
      ) {
        reasonCodes.push('ACCESS_ALLOWED_BY_SHARING_ACL');
      } else {
        reasonCodes.push('ACCESS_ALLOWED_BY_LEGACY_PERMISSION');
      }
    }

    return {
      allowed,
      reasonCodes,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      intent: params.intent,
      rbac: {
        allowed: readRbac.allowed,
        matchedPermission: readRbac.matchedPermission,
        requiredCandidates: [...readRbac.requiredCandidates],
      },
      orgScope: orgDetail,
      acl: {
        allowed: aclEval.allowed,
        reasonCode: aclEval.reasonCode,
        mode: aclEval.mode,
        effectiveAccessMode: aclEval.effectiveAccessMode,
        aclRank: aclEval.aclRank,
      },
      floorAllowed,
    };
  }

  private async resolveOrgAndFloor(input: {
    request: RequestWithClient;
    clientId: string;
    userId: string;
    orgScopeRequired: boolean;
    scopeRow: { ownerOrgUnitId: string | null; ownHints?: { subjectResourceId?: string | null } };
  }): Promise<{
    orgDetail: AccessDecisionResult['orgScope'];
    floorAllowed: boolean;
  }> {
    if (!input.orgScopeRequired) {
      const verdict = await this.organizationScope.resolveOrgScope({
        clientId: input.clientId,
        userId: input.userId,
        resource: {
          ownerOrgUnitId: input.scopeRow.ownerOrgUnitId,
          ownHints: input.scopeRow.ownHints,
        },
        hasAllOverride: true,
        allReasonCode: 'ALL_RBAC_OVERRIDE',
        request: input.request,
      });
      return {
        orgDetail: { required: false, verdict },
        floorAllowed: true,
      };
    }

    const verdict = await this.organizationScope.resolveOrgScope({
      clientId: input.clientId,
      userId: input.userId,
      resource: {
        ownerOrgUnitId: input.scopeRow.ownerOrgUnitId,
        ownHints: input.scopeRow.ownHints,
      },
      request: input.request,
    });
    const floorAllowed = verdict.level !== 'NONE';
    return {
      orgDetail: { required: true, verdict },
      floorAllowed,
    };
  }

  private async runReadGates(params: {
    request: RequestWithClient;
    clientId: string;
    userId: string;
    resourceType: SupportedDiagnosticResourceType;
    resourceId: string;
    intent: AccessIntent;
  }): Promise<
    | {
        ok: true;
        entry: NonNullable<ReturnType<typeof getResourceAccessDiagnosticEntry>>;
        readRbac: ReturnType<typeof evaluateReadRbacIntent>;
      }
    | { ok: false; denied: AccessDecisionResult }
  > {
    const entry = getResourceAccessDiagnosticEntry(params.resourceType);
    if (!entry) {
      return {
        ok: false,
        denied: {
          allowed: false,
          reasonCodes: ['ACCESS_DENIED_RESOURCE_NOT_FOUND'],
          resourceType: params.resourceType,
          resourceId: params.resourceId,
          intent: params.intent,
          rbac: {
            allowed: false,
            requiredCandidates: [],
          },
          floorAllowed: false,
        },
      };
    }

    const membership = await this.prisma.clientUser.findFirst({
      where: { clientId: params.clientId, userId: params.userId },
      include: { subscription: true },
    });

    if (!membership) {
      return {
        ok: false,
        denied: {
          allowed: false,
          reasonCodes: ['ACCESS_DENIED_RBAC'],
          resourceType: params.resourceType,
          resourceId: params.resourceId,
          intent: params.intent,
          rbac: { allowed: false, requiredCandidates: [] },
          floorAllowed: false,
        },
      };
    }

    const lic = evaluateLicenseGate(membership, 'read');
    if (!lic.ok) {
      return {
        ok: false,
        denied: {
          allowed: false,
          reasonCodes: ['ACCESS_DENIED_LICENSE', lic.reasonCode],
          resourceType: params.resourceType,
          resourceId: params.resourceId,
          intent: params.intent,
          rbac: { allowed: false, requiredCandidates: [] },
          floorAllowed: false,
        },
      };
    }

    const sub = evaluateSubscriptionGate(membership);
    if (!sub.ok) {
      return {
        ok: false,
        denied: {
          allowed: false,
          reasonCodes: ['ACCESS_DENIED_LICENSE', sub.reasonCode],
          resourceType: params.resourceType,
          resourceId: params.resourceId,
          intent: params.intent,
          rbac: { allowed: false, requiredCandidates: [] },
          floorAllowed: false,
        },
      };
    }

    const modOk = await this.prisma.module.findFirst({
      where: {
        code: entry.moduleCode,
        isActive: true,
        clientModules: {
          some: { clientId: params.clientId, status: ClientModuleStatus.ENABLED },
        },
      },
      select: { id: true },
    });
    if (!modOk) {
      return {
        ok: false,
        denied: {
          allowed: false,
          reasonCodes: ['ACCESS_DENIED_MODULE_DISABLED'],
          resourceType: params.resourceType,
          resourceId: params.resourceId,
          intent: params.intent,
          rbac: { allowed: false, requiredCandidates: [] },
          floorAllowed: false,
        },
      };
    }

    const visible = await this.moduleVisibility.isVisibleForUser(
      params.userId,
      params.clientId,
      entry.moduleVisibilityScope,
    );
    if (!visible) {
      return {
        ok: false,
        denied: {
          allowed: false,
          reasonCodes: ['ACCESS_DENIED_MODULE_DISABLED'],
          resourceType: params.resourceType,
          resourceId: params.resourceId,
          intent: params.intent,
          rbac: { allowed: false, requiredCandidates: [] },
          floorAllowed: false,
        },
      };
    }

    const codes = await this.effectivePermissions.resolvePermissionCodesForRequest({
      userId: params.userId,
      clientId: params.clientId,
      request: params.request,
    });

    const readRbac = evaluateReadRbacIntent(entry.moduleCode, codes);
    if (!readRbac.allowed) {
      return {
        ok: false,
        denied: {
          allowed: false,
          reasonCodes: ['ACCESS_DENIED_RBAC'],
          resourceType: params.resourceType,
          resourceId: params.resourceId,
          intent: params.intent,
          rbac: {
            allowed: false,
            requiredCandidates: [...readRbac.requiredCandidates],
          },
          floorAllowed: false,
        },
      };
    }

    return {
      ok: true,
      entry,
      readRbac,
    };
  }
}
