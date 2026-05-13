import type { ResourceAccessPolicyMode } from '@prisma/client';

/** RFC-ACL-017 — codes stables pour diagnostics, tests et documentation. */
export const RESOURCE_ACCESS_POLICY_REASON_CODES = [
  'POLICY_DEFAULT_NO_ACL_PUBLIC',
  'POLICY_DEFAULT_ACL_MATCH',
  'POLICY_DEFAULT_ACL_NO_MATCH',
  'POLICY_RESTRICTIVE_EMPTY_DENY',
  'POLICY_RESTRICTIVE_ACL_MATCH',
  'POLICY_RESTRICTIVE_ACL_NO_MATCH',
  'POLICY_SHARING_NO_ACL_FLOOR_ALLOW',
  'POLICY_SHARING_NO_ACL_FLOOR_DENY',
  'POLICY_SHARING_ACL_MATCH',
  'POLICY_SHARING_ACL_NO_MATCH_FLOOR_ALLOW',
  'POLICY_SHARING_ACL_NO_MATCH_FLOOR_DENY',
] as const;

export type ResourceAccessPolicyReasonCode =
  (typeof RESOURCE_ACCESS_POLICY_REASON_CODES)[number];

/** RFC-ACL-017 — libellé UX/API dérivé (hors Prisma). */
export type EffectiveResourceAccessMode =
  | 'PUBLIC_DEFAULT'
  | 'ACL_RESTRICTED'
  | 'RESTRICTIVE_EMPTY_DENY'
  | 'SHARING_FLOOR_ALLOW'
  | 'SHARING_FLOOR_DENY'
  | 'SHARING_ACL_PLUS_FLOOR';

export type ResourceAccessDecisionOperation = 'read' | 'write' | 'admin';

const OP_MIN_RANK: Record<ResourceAccessDecisionOperation, number> = {
  read: 1,
  write: 2,
  admin: 3,
};

export type ResourceAccessEvaluationResult = {
  allowed: boolean;
  reasonCode: ResourceAccessPolicyReasonCode;
  effectiveAccessMode: EffectiveResourceAccessMode;
  aclRank: number;
  mode: ResourceAccessPolicyMode;
};

/**
 * Matrice RFC-ACL-017 — entrée unique pour can*, filter batch et diagnostics.
 *
 * @param input.sharingFloorAllows — Ne jamais utiliser comme bypass. Réservé au plancher
 *   déjà validé par le guard appelant pour la même opération (read / write / admin). Défaut false.
 */
export function evaluateResourceAccessDecision(input: {
  mode: ResourceAccessPolicyMode;
  operation: ResourceAccessDecisionOperation;
  aclEntryCount: number;
  /** Rang ACL max applicable au sujet (0 si aucune entrée ne couvre l’utilisateur). */
  maxRankForSubject: number;
  /**
   * Ne jamais utiliser comme bypass. Uniquement si l’autorisation métier de la même opération
   * a déjà été validée par RBAC avant l’appel. Défaut : traité comme false si omis / undefined.
   */
  sharingFloorAllows?: boolean;
}): ResourceAccessEvaluationResult {
  const minRank = OP_MIN_RANK[input.operation];
  const { mode, aclEntryCount, maxRankForSubject: maxRank } = input;
  const floor = input.sharingFloorAllows === true;

  if (aclEntryCount === 0) {
    if (mode === 'DEFAULT') {
      return {
        allowed: true,
        reasonCode: 'POLICY_DEFAULT_NO_ACL_PUBLIC',
        effectiveAccessMode: 'PUBLIC_DEFAULT',
        aclRank: maxRank,
        mode,
      };
    }
    if (mode === 'RESTRICTIVE') {
      return {
        allowed: false,
        reasonCode: 'POLICY_RESTRICTIVE_EMPTY_DENY',
        effectiveAccessMode: 'RESTRICTIVE_EMPTY_DENY',
        aclRank: 0,
        mode,
      };
    }
    if (floor) {
      return {
        allowed: true,
        reasonCode: 'POLICY_SHARING_NO_ACL_FLOOR_ALLOW',
        effectiveAccessMode: 'SHARING_FLOOR_ALLOW',
        aclRank: 0,
        mode,
      };
    }
    return {
      allowed: false,
      reasonCode: 'POLICY_SHARING_NO_ACL_FLOOR_DENY',
      effectiveAccessMode: 'SHARING_FLOOR_DENY',
      aclRank: 0,
      mode,
    };
  }

  const meets = maxRank >= minRank;

  if (mode === 'DEFAULT') {
    if (meets) {
      return {
        allowed: true,
        reasonCode: 'POLICY_DEFAULT_ACL_MATCH',
        effectiveAccessMode: 'ACL_RESTRICTED',
        aclRank: maxRank,
        mode,
      };
    }
    return {
      allowed: false,
      reasonCode: 'POLICY_DEFAULT_ACL_NO_MATCH',
      effectiveAccessMode: 'ACL_RESTRICTED',
      aclRank: maxRank,
      mode,
    };
  }

  if (mode === 'RESTRICTIVE') {
    if (meets) {
      return {
        allowed: true,
        reasonCode: 'POLICY_RESTRICTIVE_ACL_MATCH',
        effectiveAccessMode: 'ACL_RESTRICTED',
        aclRank: maxRank,
        mode,
      };
    }
    return {
      allowed: false,
      reasonCode: 'POLICY_RESTRICTIVE_ACL_NO_MATCH',
      effectiveAccessMode: 'ACL_RESTRICTED',
      aclRank: maxRank,
      mode,
    };
  }

  if (meets) {
    return {
      allowed: true,
      reasonCode: 'POLICY_SHARING_ACL_MATCH',
      effectiveAccessMode: 'SHARING_ACL_PLUS_FLOOR',
      aclRank: maxRank,
      mode,
    };
  }
  if (floor) {
    return {
      allowed: true,
      reasonCode: 'POLICY_SHARING_ACL_NO_MATCH_FLOOR_ALLOW',
      effectiveAccessMode: 'SHARING_ACL_PLUS_FLOOR',
      aclRank: maxRank,
      mode,
    };
  }
  return {
    allowed: false,
    reasonCode: 'POLICY_SHARING_ACL_NO_MATCH_FLOOR_DENY',
    effectiveAccessMode: 'SHARING_ACL_PLUS_FLOOR',
    aclRank: maxRank,
    mode,
  };
}
