import { getResourceDiagnosticsConfig } from '../access-diagnostics/resource-diagnostics.registry';
import type { SupportedDiagnosticResourceType } from '../access-diagnostics/resource-diagnostics.registry';
import { getFlagKeyForServiceEnforcedModule } from './access-intent.registry';
import type { FlagKey } from '../feature-flags/flag-keys';

/**
 * RFC-ACL-025 — resourceType → flag V2 client via registre diagnostic + MODULE_FLAG_KEYS.
 * Retourne `null` si resourceType ou module non mappé (→ 500 fail-fast côté guard).
 */
export function resolveV2FlagKeyForResourceType(
  resourceType: SupportedDiagnosticResourceType,
): FlagKey | null {
  const config = getResourceDiagnosticsConfig(resourceType);
  if (!config) {
    return null;
  }
  return getFlagKeyForServiceEnforcedModule(config.moduleCode);
}
