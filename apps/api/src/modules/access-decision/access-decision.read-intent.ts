import {
  satisfiesPermission,
  SCOPED_READ_MODULES,
} from '@starium-orchestra/rbac-permissions';

export type ReadRbacIntentResult = {
  allowed: boolean;
  orgScopeRequired: boolean;
  matchedPermission?: string;
  requiredCandidates: string[];
};

/**
 * RBAC lecture RFC-018 / RFC-015 — `orgScopeRequired` pour `read_own` / `read_scope` seuls
 * (hors `read_all` et hors `*.read` direct).
 */
export function evaluateReadRbacIntent(
  moduleCode: string,
  codes: ReadonlySet<string>,
): ReadRbacIntentResult {
  const read = `${moduleCode}.read`;
  const requiredCandidates = [
    read,
    `${moduleCode}.read_own`,
    `${moduleCode}.read_scope`,
    `${moduleCode}.read_all`,
  ];

  const hasAll = codes.has(`${moduleCode}.read_all`);
  const hasDirectRead = codes.has(read);
  const hasOwn = codes.has(`${moduleCode}.read_own`);
  const hasScope = codes.has(`${moduleCode}.read_scope`);
  const satisfiedByLegacyExpansion = satisfiesPermission(codes, read);

  const allowed =
    satisfiedByLegacyExpansion || hasOwn || hasScope || hasAll;

  if (!allowed) {
    return { allowed: false, orgScopeRequired: false, requiredCandidates };
  }

  let orgScopeRequired = false;
  if ((SCOPED_READ_MODULES as readonly string[]).includes(moduleCode)) {
    if (hasAll || hasDirectRead) {
      orgScopeRequired = false;
    } else if (hasOwn || hasScope) {
      orgScopeRequired = true;
    } else {
      orgScopeRequired = false;
    }
  }

  let matchedPermission: string | undefined;
  if (hasAll) matchedPermission = `${moduleCode}.read_all`;
  else if (hasDirectRead) matchedPermission = read;
  else if (hasScope) matchedPermission = `${moduleCode}.read_scope`;
  else if (hasOwn) matchedPermission = `${moduleCode}.read_own`;
  else if (satisfiedByLegacyExpansion) matchedPermission = read;

  return {
    allowed,
    orgScopeRequired,
    matchedPermission,
    requiredCandidates,
  };
}
