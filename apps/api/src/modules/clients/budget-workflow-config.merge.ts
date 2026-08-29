import { BudgetEnvelopeStatus, BudgetLineStatus, Prisma } from '@prisma/client';

/** Overrides stockables (PATCH / colonne JSON). */
export type BudgetWorkflowConfig = {
  requireEnvelopesNonDraftForBudgetValidated?: boolean;
  /** Statuts de ligne budgétaire inclus dans une version figée (whitelist). */
  snapshotIncludedBudgetLineStatuses?: BudgetLineStatus[];
  /** RFC-BUD-041 — rituel Prévision d'atterrissage. */
  landingForecastEnabled?: boolean;
  midYearDefaultLineStatus?:
    | typeof BudgetLineStatus.PENDING_VALIDATION
    | typeof BudgetLineStatus.DRAFT;
  midYearDefaultEnvelopeStatus?:
    | typeof BudgetEnvelopeStatus.PENDING_VALIDATION
    | typeof BudgetEnvelopeStatus.DRAFT;
  midYearRequireJustification?: boolean;
};

/** Valeur effective après merge avec les défauts applicatifs. */
export type ResolvedBudgetWorkflowConfig = {
  requireEnvelopesNonDraftForBudgetValidated: boolean;
  snapshotIncludedBudgetLineStatuses: BudgetLineStatus[];
  landingForecastEnabled: boolean;
  midYearDefaultLineStatus:
    | typeof BudgetLineStatus.PENDING_VALIDATION
    | typeof BudgetLineStatus.DRAFT;
  midYearDefaultEnvelopeStatus:
    | typeof BudgetEnvelopeStatus.PENDING_VALIDATION
    | typeof BudgetEnvelopeStatus.DRAFT;
  midYearRequireJustification: boolean;
};

const DEFAULT_RESOLVED: ResolvedBudgetWorkflowConfig = {
  requireEnvelopesNonDraftForBudgetValidated: true,
  snapshotIncludedBudgetLineStatuses: defaultSnapshotIncludedLineStatuses(),
  landingForecastEnabled: true,
  midYearDefaultLineStatus: BudgetLineStatus.PENDING_VALIDATION,
  midYearDefaultEnvelopeStatus: BudgetEnvelopeStatus.PENDING_VALIDATION,
  midYearRequireJustification: true,
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

function parseMidYearLineStatus(
  raw: unknown,
):
  | typeof BudgetLineStatus.PENDING_VALIDATION
  | typeof BudgetLineStatus.DRAFT
  | undefined {
  if (raw === BudgetLineStatus.PENDING_VALIDATION || raw === BudgetLineStatus.DRAFT) {
    return raw;
  }
  return undefined;
}

function parseMidYearEnvelopeStatus(
  raw: unknown,
):
  | typeof BudgetEnvelopeStatus.PENDING_VALIDATION
  | typeof BudgetEnvelopeStatus.DRAFT
  | undefined {
  if (
    raw === BudgetEnvelopeStatus.PENDING_VALIDATION ||
    raw === BudgetEnvelopeStatus.DRAFT
  ) {
    return raw;
  }
  return undefined;
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
  if (typeof stored.landingForecastEnabled === 'boolean') {
    out.landingForecastEnabled = stored.landingForecastEnabled;
  }
  const midLine = parseMidYearLineStatus(stored.midYearDefaultLineStatus);
  if (midLine) {
    out.midYearDefaultLineStatus = midLine;
  }
  const midEnv = parseMidYearEnvelopeStatus(stored.midYearDefaultEnvelopeStatus);
  if (midEnv) {
    out.midYearDefaultEnvelopeStatus = midEnv;
  }
  if (typeof stored.midYearRequireJustification === 'boolean') {
    out.midYearRequireJustification = stored.midYearRequireJustification;
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
    landingForecastEnabled:
      partial?.landingForecastEnabled ?? DEFAULT_RESOLVED.landingForecastEnabled,
    midYearDefaultLineStatus:
      partial?.midYearDefaultLineStatus ?? DEFAULT_RESOLVED.midYearDefaultLineStatus,
    midYearDefaultEnvelopeStatus:
      partial?.midYearDefaultEnvelopeStatus ??
      DEFAULT_RESOLVED.midYearDefaultEnvelopeStatus,
    midYearRequireJustification:
      partial?.midYearRequireJustification ??
      DEFAULT_RESOLVED.midYearRequireJustification,
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
  if (
    mergedOverrides.landingForecastEnabled !== undefined &&
    mergedOverrides.landingForecastEnabled !== DEFAULT_RESOLVED.landingForecastEnabled
  ) {
    sparse.landingForecastEnabled = mergedOverrides.landingForecastEnabled;
  }
  if (
    mergedOverrides.midYearDefaultLineStatus !== undefined &&
    mergedOverrides.midYearDefaultLineStatus !==
      DEFAULT_RESOLVED.midYearDefaultLineStatus
  ) {
    sparse.midYearDefaultLineStatus = mergedOverrides.midYearDefaultLineStatus;
  }
  if (
    mergedOverrides.midYearDefaultEnvelopeStatus !== undefined &&
    mergedOverrides.midYearDefaultEnvelopeStatus !==
      DEFAULT_RESOLVED.midYearDefaultEnvelopeStatus
  ) {
    sparse.midYearDefaultEnvelopeStatus =
      mergedOverrides.midYearDefaultEnvelopeStatus;
  }
  if (
    mergedOverrides.midYearRequireJustification !== undefined &&
    mergedOverrides.midYearRequireJustification !==
      DEFAULT_RESOLVED.midYearRequireJustification
  ) {
    sparse.midYearRequireJustification =
      mergedOverrides.midYearRequireJustification;
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
  if (patch.landingForecastEnabled !== undefined) {
    next.landingForecastEnabled = patch.landingForecastEnabled;
  }
  if (patch.midYearDefaultLineStatus !== undefined) {
    next.midYearDefaultLineStatus = patch.midYearDefaultLineStatus;
  }
  if (patch.midYearDefaultEnvelopeStatus !== undefined) {
    next.midYearDefaultEnvelopeStatus = patch.midYearDefaultEnvelopeStatus;
  }
  if (patch.midYearRequireJustification !== undefined) {
    next.midYearRequireJustification = patch.midYearRequireJustification;
  }
  return toSparseBudgetWorkflowConfigJson(next);
}
