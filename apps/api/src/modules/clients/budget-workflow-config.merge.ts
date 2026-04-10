import { BudgetLineStatus, Prisma } from '@prisma/client';

/** Overrides stockables (PATCH / colonne JSON). */
export type BudgetWorkflowConfig = {
  requireEnvelopesNonDraftForBudgetValidated?: boolean;
  /** Statuts de ligne budgétaire inclus dans une version figée (whitelist). */
  snapshotIncludedBudgetLineStatuses?: BudgetLineStatus[];
};

/** Valeur effective après merge avec les défauts applicatifs. */
export type ResolvedBudgetWorkflowConfig = {
  requireEnvelopesNonDraftForBudgetValidated: boolean;
  snapshotIncludedBudgetLineStatuses: BudgetLineStatus[];
};

const DEFAULT_RESOLVED: ResolvedBudgetWorkflowConfig = {
  requireEnvelopesNonDraftForBudgetValidated: true,
  snapshotIncludedBudgetLineStatuses: defaultSnapshotIncludedLineStatuses(),
};

/** Défaut produit : tous les statuts **sauf** brouillon (le client peut ajouter DRAFT s’il le souhaite). */
export function defaultSnapshotIncludedLineStatuses(): BudgetLineStatus[] {
  return (Object.values(BudgetLineStatus) as BudgetLineStatus[]).filter(
    (s) => s !== BudgetLineStatus.DRAFT,
  );
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function statusesEqual(
  a: BudgetLineStatus[],
  b: BudgetLineStatus[],
): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}

function parseSnapshotStatuses(
  raw: unknown,
): BudgetLineStatus[] | undefined {
  if (!Array.isArray(raw)) {
    return undefined;
  }
  const allowed = new Set(Object.values(BudgetLineStatus));
  const out = raw.filter(
    (x): x is BudgetLineStatus =>
      typeof x === 'string' && allowed.has(x as BudgetLineStatus),
  );
  return out.length > 0 ? out : undefined;
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
  const snap = parseSnapshotStatuses(stored.snapshotIncludedBudgetLineStatuses);
  if (snap) {
    out.snapshotIncludedBudgetLineStatuses = snap;
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
    snapshotIncludedBudgetLineStatuses:
      partial?.snapshotIncludedBudgetLineStatuses ??
      DEFAULT_RESOLVED.snapshotIncludedBudgetLineStatuses,
  };
}

/**
 * Après fusion des overrides, produit l’objet à persister (sparse : pas de clés au défaut).
 */
export function toSparseBudgetWorkflowConfigJson(
  mergedOverrides: BudgetWorkflowConfig,
): Prisma.InputJsonValue | null {
  const sparse: Record<string, unknown> = {};
  if (
    mergedOverrides.requireEnvelopesNonDraftForBudgetValidated !== undefined &&
    mergedOverrides.requireEnvelopesNonDraftForBudgetValidated !==
      DEFAULT_RESOLVED.requireEnvelopesNonDraftForBudgetValidated
  ) {
    sparse.requireEnvelopesNonDraftForBudgetValidated =
      mergedOverrides.requireEnvelopesNonDraftForBudgetValidated;
  }
  if (mergedOverrides.snapshotIncludedBudgetLineStatuses !== undefined) {
    if (
      !statusesEqual(
        mergedOverrides.snapshotIncludedBudgetLineStatuses,
        DEFAULT_RESOLVED.snapshotIncludedBudgetLineStatuses,
      )
    ) {
      sparse.snapshotIncludedBudgetLineStatuses =
        mergedOverrides.snapshotIncludedBudgetLineStatuses;
    }
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
  if (patch.snapshotIncludedBudgetLineStatuses !== undefined) {
    next.snapshotIncludedBudgetLineStatuses =
      patch.snapshotIncludedBudgetLineStatuses;
  }
  return toSparseBudgetWorkflowConfigJson(next);
}
