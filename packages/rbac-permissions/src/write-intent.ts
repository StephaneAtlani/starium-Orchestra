import {
  satisfiesPermission,
  SCOPED_READ_MODULES,
  MANAGE_ALL_IMPLIES_DELETE_MODULES,
} from './catalog';

export type WriteIntent = 'write' | 'admin';

export type WriteRbacIntentResult = {
  allowed: boolean;
  orgScopeRequired: boolean;
  matchedPermission?: string;
  requiredCandidates: string[];
};

/**
 * RFC-ACL-020 §2.1 — matrice RBAC write / admin.
 */
export function evaluateWriteRbacIntent(
  moduleCode: string,
  codes: ReadonlySet<string>,
  intent: WriteIntent,
): WriteRbacIntentResult {
  const updateLegacy = `${moduleCode}.update`;
  const deleteLegacy = `${moduleCode}.delete`;
  const manageAll = `${moduleCode}.manage_all`;
  const writeScope = `${moduleCode}.write_scope`;

  if (intent === 'write') {
    const requiredCandidates = [updateLegacy, manageAll, writeScope];

    const hasUpdateLegacy = satisfiesPermission(codes, updateLegacy);
    if (codes.has(manageAll)) {
      return {
        allowed: true,
        orgScopeRequired: false,
        matchedPermission: manageAll,
        requiredCandidates,
      };
    }
    if (hasUpdateLegacy) {
      return {
        allowed: true,
        orgScopeRequired: false,
        matchedPermission: updateLegacy,
        requiredCandidates,
      };
    }
    if (codes.has(writeScope)) {
      const orgScopeRequired = (SCOPED_READ_MODULES as readonly string[]).includes(
        moduleCode,
      );
      return {
        allowed: true,
        orgScopeRequired,
        matchedPermission: writeScope,
        requiredCandidates,
      };
    }
    return {
      allowed: false,
      orgScopeRequired: false,
      requiredCandidates,
    };
  }

  const requiredCandidates = [manageAll];
  if ((MANAGE_ALL_IMPLIES_DELETE_MODULES as readonly string[]).includes(moduleCode)) {
    requiredCandidates.push(deleteLegacy);
  }

  if (codes.has(manageAll)) {
    return {
      allowed: true,
      orgScopeRequired: false,
      matchedPermission: manageAll,
      requiredCandidates,
    };
  }
  if (
    (MANAGE_ALL_IMPLIES_DELETE_MODULES as readonly string[]).includes(moduleCode) &&
    satisfiesPermission(codes, deleteLegacy)
  ) {
    return {
      allowed: true,
      orgScopeRequired: false,
      matchedPermission: deleteLegacy,
      requiredCandidates,
    };
  }
  return {
    allowed: false,
    orgScopeRequired: false,
    requiredCandidates,
  };
}
