import { satisfiesPermission } from '@starium-orchestra/rbac-permissions';
import type { AccessIntentKind } from '../decorators/require-access-intent.decorator';
import {
  ACCESS_DECISION_V2_SERVICE_ENFORCED_MODULES,
  buildHandlerKey,
  evaluateAccessIntentRbac,
  getFlagKeyForServiceEnforcedModule,
  inferIntentFromLegacyPermission,
  isRouteServiceEnforced,
} from '../../modules/access-decision/access-intent.registry';

export type ResolveRoutePermissionInput = {
  permissionCodes: ReadonlySet<string>;
  handlerKey: string;
  v2EnabledByModule: ReadonlyMap<string, boolean>;
};

export function resolveLegacyPermissionAllowed(
  codes: ReadonlySet<string>,
  requiredCode: string,
  input: ResolveRoutePermissionInput,
): boolean {
  if (satisfiesPermission(codes, requiredCode)) {
    return true;
  }

  const inferred = inferIntentFromLegacyPermission(requiredCode);
  if (!inferred) {
    return false;
  }

  const { module, intent } = inferred;
  if (
    !(ACCESS_DECISION_V2_SERVICE_ENFORCED_MODULES as readonly string[]).includes(
      module,
    )
  ) {
    return false;
  }

  const v2Enabled = input.v2EnabledByModule.get(module) ?? false;
  const serviceEnforced = isRouteServiceEnforced(input.handlerKey, intent);
  if (!v2Enabled || !serviceEnforced) {
    return false;
  }

  return evaluateAccessIntentRbac(module, intent, codes, {
    v2Enabled: true,
    serviceEnforced: true,
  }).allowed;
}

export function resolveAccessIntentAllowed(
  moduleCode: string,
  intent: AccessIntentKind,
  codes: ReadonlySet<string>,
  input: ResolveRoutePermissionInput,
): boolean {
  const v2Enabled = input.v2EnabledByModule.get(moduleCode) ?? false;
  const handlerKey = input.handlerKey;
  const serviceEnforced = isRouteServiceEnforced(handlerKey, intent);

  return evaluateAccessIntentRbac(moduleCode, intent, codes, {
    v2Enabled,
    serviceEnforced,
  }).allowed;
}

export function resolveHandlerKeyFromContext(
  controllerClassName: string,
  handlerMethodName: string,
  overrideHandlerKey?: string,
): string {
  return overrideHandlerKey ?? buildHandlerKey(controllerClassName, handlerMethodName);
}

export async function buildV2EnabledByModuleMap(
  clientId: string,
  modules: readonly string[],
  isEnabled: (clientId: string, flagKey: string) => Promise<boolean>,
): Promise<Map<string, boolean>> {
  const out = new Map<string, boolean>();
  for (const moduleCode of modules) {
    const flagKey = getFlagKeyForServiceEnforcedModule(moduleCode);
    if (!flagKey) continue;
    out.set(moduleCode, await isEnabled(clientId, flagKey));
  }
  return out;
}
