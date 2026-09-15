import type { StrategicDirectionStrategyStatus } from '../types/strategic-direction-strategy.types';

export type SchemaActionCapsInput = {
  status: StrategicDirectionStrategyStatus | null | undefined;
  canUpdateStrategy?: boolean;
  canCreateStrategy?: boolean;
  isSponsor?: boolean;
  hasReview?: boolean;
  hasManageDirection?: boolean;
  /** Flags API dérivés (prioritaires si présents). */
  canEditContent?: boolean;
  canSubmit?: boolean;
  canAdaptVersion?: boolean;
  canArchive?: boolean;
};

export type SchemaActionCaps = {
  canWrite: boolean;
  canEditContent: boolean;
  canSubmit: boolean;
  canDecide: boolean;
  canAdaptVersion: boolean;
  canArchive: boolean;
  canShare: boolean;
  canExport: boolean;
  canManageDirection: boolean;
  showReviewEntry: boolean;
  isSponsor: boolean;
  canCreateStrategy: boolean;
};

/**
 * Caps d’action fiche / portfolio — RBAC|sponsor (via flags API) × statut.
 * Les flags API dérivés priment quand fournis.
 */
export function resolveSchemaActionCaps(input: SchemaActionCapsInput): SchemaActionCaps {
  const canWrite = Boolean(input.canUpdateStrategy);
  const status = input.status ?? null;
  const editable = status === 'DRAFT' || status === 'REJECTED';
  const approved = status === 'APPROVED';
  const submitted = status === 'SUBMITTED';

  const canEditContent =
    input.canEditContent !== undefined ? Boolean(input.canEditContent) : canWrite && editable;
  const canSubmit =
    input.canSubmit !== undefined ? Boolean(input.canSubmit) : canWrite && editable;
  const canAdaptVersion =
    input.canAdaptVersion !== undefined
      ? Boolean(input.canAdaptVersion)
      : canWrite && approved;
  const canArchive =
    input.canArchive !== undefined ? Boolean(input.canArchive) : canWrite && approved;
  const canDecide = Boolean(input.hasReview) && submitted;

  return {
    canWrite,
    canEditContent,
    canSubmit,
    canDecide,
    canAdaptVersion,
    canArchive,
    canShare: true,
    canExport: true,
    canManageDirection: Boolean(input.hasManageDirection),
    showReviewEntry: canSubmit || canDecide,
    isSponsor: Boolean(input.isSponsor),
    canCreateStrategy: Boolean(input.canCreateStrategy),
  };
}
