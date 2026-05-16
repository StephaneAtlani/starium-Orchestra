import { satisfiesPermission } from './catalog';
import { evaluateReadRbacIntent } from './read-intent';
import { evaluateWriteRbacIntent } from './write-intent';

export type AccessIntentKindUi = 'read' | 'list' | 'write' | 'admin' | 'create';

export type EvaluateAccessIntentForUiOptions = {
  /** Flag client `ACCESS_DECISION_V2_*` — informatif UI, le backend reste source de vérité. */
  v2Enabled: boolean;
  /**
   * Route / écran cible déjà migré côté service (RFC-ACL-024).
   * Sans cela, l’UI reste conservative (legacy) même si v2Enabled.
   */
  serviceEnforced?: boolean;
};

export type AccessIntentUiResult = {
  allowed: boolean;
  requiredCandidates: string[];
};

/** Codes candidats pour affichage / debug UI (ordre documenté RFC-015). */
export function getIntentPermissionCandidates(
  moduleCode: string,
  intent: AccessIntentKindUi,
): string[] {
  if (intent === 'create') {
    return [`${moduleCode}.create`, `${moduleCode}.manage_all`];
  }
  if (intent === 'read' || intent === 'list') {
    return evaluateReadRbacIntent(moduleCode, new Set()).requiredCandidates;
  }
  if (intent === 'write') {
    return evaluateWriteRbacIntent(moduleCode, new Set(), 'write').requiredCandidates;
  }
  return evaluateWriteRbacIntent(moduleCode, new Set(), 'admin').requiredCandidates;
}

/**
 * RFC-ACL-024 — évaluation RBAC intent pour l’UI uniquement (pas une preuve d’autorisation API).
 * Alignée sur le guard backend : scoped (`orgScopeRequired`) exige v2Enabled + serviceEnforced.
 */
export function evaluateAccessIntentForUi(
  moduleCode: string,
  intent: AccessIntentKindUi,
  codes: ReadonlySet<string>,
  options: EvaluateAccessIntentForUiOptions,
): AccessIntentUiResult {
  if (intent === 'create') {
    const createCode = `${moduleCode}.create`;
    const manageAll = `${moduleCode}.manage_all`;
    const allowed =
      satisfiesPermission(codes, createCode) || codes.has(manageAll);
    return {
      allowed,
      requiredCandidates: [createCode, manageAll],
    };
  }

  const rbac =
    intent === 'read' || intent === 'list'
      ? evaluateReadRbacIntent(moduleCode, codes)
      : evaluateWriteRbacIntent(
          moduleCode,
          codes,
          intent === 'admin' ? 'admin' : 'write',
        );

  if (!rbac.allowed) {
    return { allowed: false, requiredCandidates: [...rbac.requiredCandidates] };
  }

  if (
    rbac.orgScopeRequired &&
    (!options.v2Enabled || options.serviceEnforced !== true)
  ) {
    return { allowed: false, requiredCandidates: [...rbac.requiredCandidates] };
  }

  return { allowed: true, requiredCandidates: [...rbac.requiredCandidates] };
}
