import {
  evaluateReadRbacIntent,
  evaluateWriteRbacIntent,
  satisfiesPermission,
  type WriteIntent,
} from '@starium-orchestra/rbac-permissions';
import { FLAG_KEYS, type FlagKey } from '../feature-flags/flag-keys';
import type { AccessIntentKind } from '../../common/decorators/require-access-intent.decorator';
import { SERVICE_ENFORCED_REGISTRY } from './access-intent-enforced-handlers';

export const ACCESS_DECISION_V2_SERVICE_ENFORCED_MODULES = [
  'projects',
  'budgets',
  'contracts',
  'procurement',
  'strategic_vision',
] as const;

export type ServiceEnforcedModule =
  (typeof ACCESS_DECISION_V2_SERVICE_ENFORCED_MODULES)[number];

const MODULE_FLAG_KEYS: Record<ServiceEnforcedModule, FlagKey> = {
  projects: FLAG_KEYS.ACCESS_DECISION_V2_PROJECTS,
  budgets: FLAG_KEYS.ACCESS_DECISION_V2_BUDGETS,
  contracts: FLAG_KEYS.ACCESS_DECISION_V2_CONTRACTS,
  procurement: FLAG_KEYS.ACCESS_DECISION_V2_PROCUREMENT,
  strategic_vision: FLAG_KEYS.ACCESS_DECISION_V2_STRATEGIC_VISION,
};

export type AccessIntentModuleEntry = {
  moduleCode: ServiceEnforcedModule;
  flagKey: FlagKey;
};

const SERVICE_ENFORCED_LOOKUP = new Map<string, true>(
  SERVICE_ENFORCED_REGISTRY.map((e) => [
    `${e.handlerKey}\0${e.intent}`,
    true,
  ]),
);

export function buildHandlerKey(controllerClassName: string, handlerMethodName: string): string {
  return `${controllerClassName}.${handlerMethodName}`;
}

export function getAccessIntentModuleEntry(
  moduleCode: string,
): AccessIntentModuleEntry | null {
  if (
    !(ACCESS_DECISION_V2_SERVICE_ENFORCED_MODULES as readonly string[]).includes(
      moduleCode,
    )
  ) {
    return null;
  }
  const mod = moduleCode as ServiceEnforcedModule;
  return { moduleCode: mod, flagKey: MODULE_FLAG_KEYS[mod] };
}

export function getFlagKeyForServiceEnforcedModule(moduleCode: string): FlagKey | null {
  return getAccessIntentModuleEntry(moduleCode)?.flagKey ?? null;
}

export function legacyPermissionForIntent(
  moduleCode: string,
  intent: AccessIntentKind,
): string | null {
  switch (intent) {
    case 'read':
    case 'list':
      return `${moduleCode}.read`;
    case 'write':
      return `${moduleCode}.update`;
    case 'admin':
      return `${moduleCode}.delete`;
    case 'create':
      return `${moduleCode}.create`;
    default:
      return null;
  }
}

export function inferIntentFromLegacyPermission(
  permissionCode: string,
): { module: string; intent: AccessIntentKind } | null {
  const m = /^([a-z0-9_]+)\.(read|update|delete|create)$/.exec(permissionCode);
  if (!m) return null;
  const [, module, suffix] = m;
  const intentMap: Record<string, AccessIntentKind> = {
    read: 'read',
    update: 'write',
    delete: 'admin',
    create: 'create',
  };
  const intent = intentMap[suffix!];
  if (!intent) return null;
  return { module: module!, intent };
}

export function isRouteServiceEnforced(
  handlerKey: string,
  intent: AccessIntentKind,
): boolean {
  return SERVICE_ENFORCED_LOOKUP.has(`${handlerKey}\0${intent}`);
}

export type EvaluateAccessIntentRbacOptions = {
  v2Enabled: boolean;
  serviceEnforced: boolean;
};

export type EvaluateAccessIntentRbacResult = {
  allowed: boolean;
  orgScopeRequired: boolean;
  requiredCandidates: string[];
};

export function evaluateAccessIntentRbac(
  moduleCode: string,
  intent: AccessIntentKind,
  codes: ReadonlySet<string>,
  options: EvaluateAccessIntentRbacOptions,
): EvaluateAccessIntentRbacResult {
  if (intent === 'create') {
    const createCode = `${moduleCode}.create`;
    const manageAll = `${moduleCode}.manage_all`;
    const allowed =
      satisfiesPermission(codes, createCode) || codes.has(manageAll);
    return {
      allowed,
      orgScopeRequired: false,
      requiredCandidates: [createCode, manageAll],
    };
  }

  const rbac =
    intent === 'read' || intent === 'list'
      ? evaluateReadRbacIntent(moduleCode, codes)
      : evaluateWriteRbacIntent(
          moduleCode,
          codes,
          (intent === 'admin' ? 'admin' : 'write') as WriteIntent,
        );

  if (!rbac.allowed) {
    return {
      allowed: false,
      orgScopeRequired: false,
      requiredCandidates: [...rbac.requiredCandidates],
    };
  }

  if (
    rbac.orgScopeRequired &&
    (!options.v2Enabled || !options.serviceEnforced)
  ) {
    return {
      allowed: false,
      orgScopeRequired: true,
      requiredCandidates: [...rbac.requiredCandidates],
    };
  }

  return {
    allowed: true,
    orgScopeRequired: rbac.orgScopeRequired,
    requiredCandidates: [...rbac.requiredCandidates],
  };
}

/** Liste des modules avec au moins une route service-enforced (informatif UI / diagnostics). */
export function listServiceEnforcedModules(): ServiceEnforcedModule[] {
  return [...ACCESS_DECISION_V2_SERVICE_ENFORCED_MODULES];
}
