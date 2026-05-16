import { ForbiddenException, Injectable } from '@nestjs/common';
import { ClientModuleStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EffectivePermissionsService } from '../../common/services/effective-permissions.service';
import { OrganizationScopeService } from '../../common/organization/organization-scope.service';
import type { RequestWithClient } from '../../common/types/request-with-client';
import { ModuleVisibilityService } from '../module-visibility/module-visibility.service';
import { AccessControlService } from '../access-control/access-control.service';
import type {
  ResourceAccessEvaluationResult,
  ResourceAccessDecisionOperation,
} from '../access-control/resource-access-policy.decision';
import { getResourceAccessDiagnosticEntry } from '../access-diagnostics/resource-access-diagnostic.registry';
import { loadAccessResources } from './access-decision.registry';
import { evaluateLicenseGate, evaluateSubscriptionGate } from './membership-access-gates';
import { evaluateReadRbacIntent } from './access-decision.read-intent';
import {
  evaluateWriteRbacIntent,
  type WriteIntent,
} from './access-decision.write-intent';
import type {
  AccessDecisionResult,
  AccessIntent,
  AccessResourceScopeRow,
} from './access-decision.types';
import type { SupportedDiagnosticResourceType } from '../access-diagnostics/resource-diagnostics.registry';

/** Détail RBAC normalisé pour read/write/admin (forme commune des deux helpers). */
type IntentRbacResult = {
  allowed: boolean;
  orgScopeRequired: boolean;
  matchedPermission?: string;
  requiredCandidates: readonly string[];
};

/**
 * RFC-ACL-018 §4 + RFC-ACL-020 §2.0 — re-applique le plancher org **après** la décision
 * ACL/policy pour éviter qu'un `floorAllowed` permissif autorise un user `read_scope`,
 * `read_own` ou `write_scope` hors sous-arbre.
 *
 * Règle clé : la sémantique SHARING (`POLICY_SHARING_ACL_MATCH`) ne doit jamais être
 * cassée par le narrowing — une ACL explicite peut élargir au-delà du sous-arbre.
 */
function applyOrgNarrowingAfterAcl(input: {
  /** Renommé V1 → V2 : la fonction sert read / write / admin (ex-`readRbacOrgScopeRequired`). */
  orgScopeRequired: boolean;
  orgVerdictLevel: 'NONE' | 'OWN' | 'SCOPE' | 'ALL' | undefined;
  aclEval: ResourceAccessEvaluationResult;
}): boolean {
  const { orgScopeRequired, orgVerdictLevel, aclEval } = input;
  if (!orgScopeRequired || orgVerdictLevel !== 'NONE') {
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
   * RFC-ACL-018 + RFC-ACL-020 — décision unifiée read / list / write / admin.
   */
  async decide(params: {
    request?: RequestWithClient;
    clientId: string;
    userId: string;
    resourceType: SupportedDiagnosticResourceType;
    resourceId: string;
    intent: AccessIntent;
  }): Promise<AccessDecisionResult> {
    const gate = await this.runIntentGates(params);
    if (!gate.ok) {
      return gate.denied;
    }

    const resourceMap = await loadAccessResources(this.prisma, {
      clientId: params.clientId,
      resourceType: params.resourceType,
      resourceIds: [params.resourceId],
    });
    const scopeRow = resourceMap.get(params.resourceId);
    if (!scopeRow) {
      return this.deniedNotFound(params, gate.rbac);
    }

    // RFC-ACL-020 §2.3 — owner null + scope requis ⇒ refus MISSING_OWNER_ORG_UNIT.
    if (gate.rbac.orgScopeRequired && scopeRow.ownerOrgUnitId === null) {
      return {
        allowed: false,
        reasonCodes: ['MISSING_OWNER_ORG_UNIT'],
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        intent: params.intent,
        rbac: {
          allowed: gate.rbac.allowed,
          matchedPermission: gate.rbac.matchedPermission,
          requiredCandidates: [...gate.rbac.requiredCandidates],
        },
        orgScope: { required: true },
        floorAllowed: false,
      };
    }

    const { orgDetail, floorAllowed } = await this.resolveOrgAndFloor({
      request: params.request,
      clientId: params.clientId,
      userId: params.userId,
      orgScopeRequired: gate.rbac.orgScopeRequired,
      scopeRow,
    });

    const aclOperation = mapIntentToAclOperation(params.intent);
    const aclEval = await this.accessControl.evaluateResourceAccess({
      clientId: params.clientId,
      userId: params.userId,
      resourceTypeNormalized: scopeRow.aclResourceType,
      resourceId: scopeRow.aclResourceId,
      operation: aclOperation,
      sharingFloorAllows: floorAllowed,
    });

    const allowed = applyOrgNarrowingAfterAcl({
      orgScopeRequired: gate.rbac.orgScopeRequired,
      orgVerdictLevel: orgDetail?.verdict?.level,
      aclEval,
    });

    return this.composeResult({
      params,
      rbac: gate.rbac,
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
   * Liste / filtrage — même matrice que `decide`, plancher org par ressource, batch policy/ACL.
   */
  async filterResourceIdsByAccess(params: {
    request: RequestWithClient;
    clientId: string;
    userId: string;
    resourceType: SupportedDiagnosticResourceType;
    resourceIds: string[];
    intent: AccessIntent;
  }): Promise<string[]> {
    const uniqueIds = [...new Set(params.resourceIds.filter(Boolean))];
    if (uniqueIds.length === 0) {
      return [];
    }

    const gate = await this.runIntentGates({
      request: params.request,
      clientId: params.clientId,
      userId: params.userId,
      resourceType: params.resourceType,
      resourceId: uniqueIds[0]!,
      intent: params.intent,
    });
    if (!gate.ok) {
      return [];
    }

    const resourceMap = await loadAccessResources(this.prisma, {
      clientId: params.clientId,
      resourceType: params.resourceType,
      resourceIds: uniqueIds,
    });

    const aclOperation = mapIntentToAclOperation(params.intent);

    // Regrouper les ids ACL effectifs (peut compresser pour BUDGET_LINE → budgetId).
    const aclTargetByResource = new Map<
      string,
      { aclResourceId: string; row: AccessResourceScopeRow }
    >();
    const aclResourceIds = new Set<string>();
    const ownerByResource = new Map<string, string | null>();

    for (const id of uniqueIds) {
      const row = resourceMap.get(id);
      if (!row) continue;
      aclTargetByResource.set(id, { aclResourceId: row.aclResourceId, row });
      aclResourceIds.add(row.aclResourceId);
      ownerByResource.set(id, row.ownerOrgUnitId);
    }

    const floorById = new Map<string, boolean>();
    const orgLevelById = new Map<string, 'NONE' | 'OWN' | 'SCOPE' | 'ALL' | undefined>();

    for (const id of uniqueIds) {
      const row = resourceMap.get(id);
      if (!row) {
        floorById.set(id, false);
        orgLevelById.set(id, undefined);
        continue;
      }
      // Owner null + scope requis ⇒ jamais visible côté liste.
      if (gate.rbac.orgScopeRequired && row.ownerOrgUnitId === null) {
        floorById.set(id, false);
        orgLevelById.set(id, 'NONE');
        continue;
      }
      const { floorAllowed, orgDetail } = await this.resolveOrgAndFloor({
        request: params.request,
        clientId: params.clientId,
        userId: params.userId,
        orgScopeRequired: gate.rbac.orgScopeRequired,
        scopeRow: row,
      });
      floorById.set(id, floorAllowed);
      orgLevelById.set(id, orgDetail?.verdict?.level);
    }

    // ACL batch sur les ids ACL effectifs (set unique). On reporte ensuite verdict par id métier.
    // Tous les rows ont le même aclResourceType pour un resourceType donné (BUDGET_LINE → BUDGET).
    const firstRow = uniqueIds
      .map((id) => resourceMap.get(id))
      .find((r): r is AccessResourceScopeRow => Boolean(r));
    if (!firstRow) {
      return [];
    }

    // Plancher SHARING ACL : on prend le max des planchers métier dont l'aclResourceId est identique
    // (cas BUDGET_LINE plusieurs lignes partageant le même budget parent) — accordé si **au moins**
    // un id métier autorise le plancher SHARING.
    const sharingFloorByAclId = new Map<string, boolean>();
    for (const id of uniqueIds) {
      const target = aclTargetByResource.get(id);
      if (!target) continue;
      const ok = floorById.get(id) === true;
      sharingFloorByAclId.set(
        target.aclResourceId,
        sharingFloorByAclId.get(target.aclResourceId) === true || ok,
      );
    }

    const batch = await this.accessControl.evaluateResourceAccessBatch({
      clientId: params.clientId,
      userId: params.userId,
      resourceTypeNormalized: firstRow.aclResourceType,
      resourceIds: [...aclResourceIds],
      operation: aclOperation,
      sharingFloorAllowsByResourceId: sharingFloorByAclId,
    });

    return uniqueIds.filter((id) => {
      const target = aclTargetByResource.get(id);
      if (!target) return false;
      const aclEval = batch.get(target.aclResourceId);
      if (!aclEval) return false;
      // Synthèse plancher : la décision ACL utilise le plancher max ; on re-resserre par owner.
      const level = orgLevelById.get(id);
      // Owner null + scope requis ⇒ exclu silencieusement (cf. §2.3 + filter list).
      if (gate.rbac.orgScopeRequired && ownerByResource.get(id) === null) {
        return false;
      }
      return applyOrgNarrowingAfterAcl({
        orgScopeRequired: gate.rbac.orgScopeRequired,
        orgVerdictLevel: level,
        aclEval,
      });
    });
  }

  private deniedNotFound(
    params: {
      resourceType: SupportedDiagnosticResourceType;
      resourceId: string;
      intent: AccessIntent;
    },
    rbac: IntentRbacResult,
  ): AccessDecisionResult {
    return {
      allowed: false,
      reasonCodes: ['ACCESS_DENIED_RESOURCE_NOT_FOUND'],
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      intent: params.intent,
      rbac: {
        allowed: rbac.allowed,
        matchedPermission: rbac.matchedPermission,
        requiredCandidates: [...rbac.requiredCandidates],
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
    rbac: IntentRbacResult;
    orgDetail: AccessDecisionResult['orgScope'];
    floorAllowed: boolean;
    aclEval: ResourceAccessEvaluationResult;
    allowed: boolean;
  }): AccessDecisionResult {
    const { params, rbac, orgDetail, floorAllowed, aclEval, allowed } = input;
    const reasonCodes: string[] = [];

    if (!allowed) {
      if (aclEval.reasonCode.startsWith('POLICY_')) {
        reasonCodes.push('ACCESS_DENIED_ACL_POLICY');
      }
      reasonCodes.push(aclEval.reasonCode);
      if (
        rbac.orgScopeRequired &&
        orgDetail?.verdict?.level === 'NONE' &&
        aclEval.reasonCode !== 'POLICY_SHARING_ACL_MATCH'
      ) {
        reasonCodes.push('ACCESS_DENIED_ORG_SCOPE');
      }
    } else {
      const matched = rbac.matchedPermission;
      const isRead = params.intent === 'read' || params.intent === 'list';
      const isWrite = params.intent === 'write';
      const isAdmin = params.intent === 'admin';

      if (isRead) {
        if (matched?.endsWith('.read_all')) {
          reasonCodes.push('ACCESS_ALLOWED_BY_READ_ALL');
        } else if (
          matched?.endsWith('.read_scope') &&
          orgDetail?.verdict?.level === 'SCOPE'
        ) {
          reasonCodes.push('ACCESS_ALLOWED_BY_SCOPE');
        } else if (
          matched?.endsWith('.read_own') &&
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
      } else if (isWrite) {
        const orgLevel = orgDetail?.verdict?.level;
        const sharingRescue =
          orgLevel === 'NONE' && aclEval.reasonCode === 'POLICY_SHARING_ACL_MATCH';
        if (sharingRescue) {
          reasonCodes.push('ACCESS_ALLOWED_BY_SHARING_ACL');
        } else if (matched?.endsWith('.manage_all')) {
          reasonCodes.push('ACCESS_ALLOWED_BY_MANAGE_ALL');
        } else if (matched?.endsWith('.update')) {
          reasonCodes.push('ACCESS_ALLOWED_BY_LEGACY_UPDATE');
        } else if (matched?.endsWith('.write_scope')) {
          reasonCodes.push('ACCESS_ALLOWED_BY_WRITE_SCOPE');
        } else if (
          aclEval.reasonCode === 'POLICY_SHARING_ACL_MATCH' ||
          aclEval.reasonCode === 'POLICY_SHARING_ACL_NO_MATCH_FLOOR_ALLOW'
        ) {
          reasonCodes.push('ACCESS_ALLOWED_BY_SHARING_ACL');
        } else {
          reasonCodes.push('ACCESS_ALLOWED_BY_LEGACY_PERMISSION');
        }
      } else if (isAdmin) {
        if (matched?.endsWith('.manage_all')) {
          reasonCodes.push('ACCESS_ALLOWED_BY_MANAGE_ALL');
        } else if (matched?.endsWith('.delete')) {
          reasonCodes.push('ACCESS_ALLOWED_BY_LEGACY_DELETE');
        } else if (
          aclEval.reasonCode === 'POLICY_SHARING_ACL_MATCH' ||
          aclEval.reasonCode === 'POLICY_SHARING_ACL_NO_MATCH_FLOOR_ALLOW'
        ) {
          reasonCodes.push('ACCESS_ALLOWED_BY_SHARING_ACL');
        } else {
          reasonCodes.push('ACCESS_ALLOWED_BY_LEGACY_PERMISSION');
        }
      }
    }

    return {
      allowed,
      reasonCodes,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      intent: params.intent,
      rbac: {
        allowed: rbac.allowed,
        matchedPermission: rbac.matchedPermission,
        requiredCandidates: [...rbac.requiredCandidates],
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
    request?: RequestWithClient;
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

  /**
   * Garde-fous membership / licence / module / RBAC, communs aux 4 intents.
   */
  private async runIntentGates(params: {
    request?: RequestWithClient;
    clientId: string;
    userId: string;
    resourceType: SupportedDiagnosticResourceType;
    resourceId: string;
    intent: AccessIntent;
  }): Promise<
    | {
        ok: true;
        entry: NonNullable<ReturnType<typeof getResourceAccessDiagnosticEntry>>;
        rbac: IntentRbacResult;
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
          rbac: { allowed: false, requiredCandidates: [] },
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

    const licenseOp =
      params.intent === 'write' || params.intent === 'admin' ? 'write' : 'read';
    const lic = evaluateLicenseGate(membership, licenseOp);
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

    const rbac = resolveRbacForIntent(entry.moduleCode, codes, params.intent);
    if (!rbac.allowed) {
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
            requiredCandidates: [...rbac.requiredCandidates],
          },
          floorAllowed: false,
        },
      };
    }

    return { ok: true, entry, rbac };
  }
}

function resolveRbacForIntent(
  moduleCode: string,
  codes: ReadonlySet<string>,
  intent: AccessIntent,
): IntentRbacResult {
  if (intent === 'read' || intent === 'list') {
    return evaluateReadRbacIntent(moduleCode, codes);
  }
  const writeIntent: WriteIntent = intent === 'admin' ? 'admin' : 'write';
  return evaluateWriteRbacIntent(moduleCode, codes, writeIntent);
}

function mapIntentToAclOperation(intent: AccessIntent): ResourceAccessDecisionOperation {
  if (intent === 'write') return 'write';
  if (intent === 'admin') return 'admin';
  return 'read';
}
