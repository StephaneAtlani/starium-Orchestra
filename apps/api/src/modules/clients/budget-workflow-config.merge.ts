import { Prisma } from '@prisma/client';

/** Overrides stockables (PATCH / colonne JSON). */
export type BudgetWorkflowConfig = {
  requireEnvelopesNonDraftForBudgetValidated?: boolean;
};

/** Valeur effective après merge avec les défauts applicatifs. */
export type ResolvedBudgetWorkflowConfig = {
  requireEnvelopesNonDraftForBudgetValidated: boolean;
};

const DEFAULT_RESOLVED: ResolvedBudgetWorkflowConfig = {
  requireEnvelopesNonDraftForBudgetValidated: true,
};

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/**
 * Extrait les clés supportées depuis le JSON brut stocké.
 * Types invalides pour une clé connue → ignorés (fallback défaut au merge).
 */
export function parseStoredBudgetWorkflowConfig(
  stored: Prisma.JsonValue | null | undefined,
): BudgetWorkflowConfig | null {
  if (stored === null || stored === undefined) {
    return null;
  }
  if (!isPlainObject(stored)) {
    return null;
  }
  const out: BudgetWorkflowConfig = {};
  const raw = stored.requireEnvelopesNonDraftForBudgetValidated;
  if (typeof raw === 'boolean') {
    out.requireEnvelopesNonDraftForBudgetValidated = raw;
  }
  return Object.keys(out).length ? out : null;
}

/** Merge pur : une seule source de défauts applicatifs. */
export function mergeBudgetWorkflowConfig(
  stored: Prisma.JsonValue | null | undefined,
): ResolvedBudgetWorkflowConfig {
  const partial = parseStoredBudgetWorkflowConfig(stored);
  return {
    requireEnvelopesNonDraftForBudgetValidated:
      partial?.requireEnvelopesNonDraftForBudgetValidated ??
      DEFAULT_RESOLVED.requireEnvelopesNonDraftForBudgetValidated,
  };
}

/**
 * Après fusion des overrides, produit l’objet à persister (sparse : pas de clés au défaut).
 */
export function toSparseBudgetWorkflowConfigJson(
  mergedOverrides: BudgetWorkflowConfig,
): Prisma.InputJsonValue | null {
  const sparse: Record<string, boolean> = {};
  if (
    mergedOverrides.requireEnvelopesNonDraftForBudgetValidated !== undefined &&
    mergedOverrides.requireEnvelopesNonDraftForBudgetValidated !==
      DEFAULT_RESOLVED.requireEnvelopesNonDraftForBudgetValidated
  ) {
    sparse.requireEnvelopesNonDraftForBudgetValidated =
      mergedOverrides.requireEnvelopesNonDraftForBudgetValidated;
  }
  if (Object.keys(sparse).length === 0) {
    return null;
  }
  return sparse as Prisma.InputJsonValue;
}

/**
 * Fusionne le JSON stocké avec les champs fournis du DTO (partial update).
 */
export function mergeBudgetWorkflowPatch(
  stored: Prisma.JsonValue | null | undefined,
  patch: BudgetWorkflowConfig,
): Prisma.InputJsonValue | null {
  const current = parseStoredBudgetWorkflowConfig(stored) ?? {};
  const next: BudgetWorkflowConfig = { ...current };
  if (patch.requireEnvelopesNonDraftForBudgetValidated !== undefined) {
    next.requireEnvelopesNonDraftForBudgetValidated =
      patch.requireEnvelopesNonDraftForBudgetValidated;
  }
  return toSparseBudgetWorkflowConfigJson(next);
}
