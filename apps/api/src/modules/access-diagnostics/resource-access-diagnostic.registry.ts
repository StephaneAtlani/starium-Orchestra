import type { SupportedDiagnosticResourceType } from './resource-diagnostics.registry';

/** Intent aligné RFC-ACL-014 §1 (query `intent` sur effective-rights/me). */
export type ResourceAccessIntent = 'READ' | 'WRITE' | 'ADMIN';

/**
 * Registre canonique RFC-ACL-014 §1 — codes permission alignés seed / guards métier.
 * ADMIN vide = fallback documenté : RBAC porté sur WRITE pour le diagnostic ; gestion ACL = guards §0.
 */
export type ResourceAccessDiagnosticRegistryEntry = {
  moduleCode: string;
  moduleVisibilityScope: string;
  aclResourceType: SupportedDiagnosticResourceType;
  intents: Record<ResourceAccessIntent, readonly string[]>;
};

export const RESOURCE_ACCESS_DIAGNOSTIC_REGISTRY: Record<
  SupportedDiagnosticResourceType,
  ResourceAccessDiagnosticRegistryEntry
> = {
  PROJECT: {
    moduleCode: 'projects',
    moduleVisibilityScope: 'projects',
    aclResourceType: 'PROJECT',
    intents: {
      READ: ['projects.read'],
      WRITE: ['projects.update'],
      ADMIN: ['projects.delete'],
    },
  },
  BUDGET: {
    moduleCode: 'budgets',
    moduleVisibilityScope: 'budgets',
    aclResourceType: 'BUDGET',
    intents: {
      READ: ['budgets.read'],
      WRITE: ['budgets.update'],
      /** Pas de permission RBAC « delete budget » fine V1 — fallback WRITE pour diagnostic / lockout. */
      ADMIN: [],
    },
  },
  CONTRACT: {
    moduleCode: 'contracts',
    moduleVisibilityScope: 'contracts',
    aclResourceType: 'CONTRACT',
    intents: {
      READ: ['contracts.read'],
      WRITE: ['contracts.update'],
      ADMIN: ['contracts.delete'],
    },
  },
  SUPPLIER: {
    moduleCode: 'procurement',
    moduleVisibilityScope: 'procurement',
    aclResourceType: 'SUPPLIER',
    intents: {
      READ: ['procurement.read'],
      WRITE: ['procurement.update'],
      /** Pas de permission RBAC ADMIN dédiée fournisseur V1 — fallback WRITE. */
      ADMIN: [],
    },
  },
  STRATEGIC_OBJECTIVE: {
    moduleCode: 'strategic_vision',
    moduleVisibilityScope: 'strategic_vision',
    aclResourceType: 'STRATEGIC_OBJECTIVE',
    intents: {
      READ: ['strategic_vision.read'],
      WRITE: ['strategic_vision.update'],
      ADMIN: ['strategic_vision.delete'],
    },
  },
};

export function getResourceAccessDiagnosticEntry(
  resourceType: string,
): ResourceAccessDiagnosticRegistryEntry | null {
  if (resourceType in RESOURCE_ACCESS_DIAGNOSTIC_REGISTRY) {
    return RESOURCE_ACCESS_DIAGNOSTIC_REGISTRY[
      resourceType as SupportedDiagnosticResourceType
    ];
  }
  return null;
}

/** Codes RBAC exigés pour un intent (ADMIN vide → WRITE). */
export function resolveRbacCodesForIntent(
  entry: ResourceAccessDiagnosticRegistryEntry,
  intent: ResourceAccessIntent,
): readonly string[] {
  const direct = entry.intents[intent];
  if (intent === 'ADMIN' && direct.length === 0) {
    return entry.intents.WRITE;
  }
  return direct;
}
