import { BudgetImportMode } from '@prisma/client';

/** Logical field name → source column name. */
export type MappingConfigFields = Record<string, string>;

export type MatchingStrategy = 'EXTERNAL_ID' | 'COMPOSITE';

export interface MappingMatchingConfig {
  strategy: MatchingStrategy;
  /** For COMPOSITE: ordered list of logical field names. */
  keys?: string[];
}

export interface BudgetImportOptionsConfig {
  defaultEnvelopeId?: string;
  defaultGeneralLedgerAccountId?: string;
  defaultCurrency?: string;
  importMode?: BudgetImportMode;
  ignoreEmptyRows?: boolean;
  trimValues?: boolean;
  dateFormat?: string;
  decimalSeparator?: ',' | '.';
}

export interface MappingConfig {
  fields: MappingConfigFields;
  matching?: MappingMatchingConfig;
  defaults?: Record<string, string>;
}

/** Minimal structure for BudgetImportJob.summary (RFC-018). */
export interface BudgetImportJobSummary {
  warningsCount: number;
  errorsByType: Record<string, number>;
}

export type BudgetImportPreviewStatus = 'CREATE' | 'UPDATE' | 'SKIP' | 'ERROR';

export const PREVIEW_REASONS = [
  'MATCHED_BY_EXTERNAL_ID',
  'MATCHED_BY_COMPOSITE_KEY',
  'NO_MATCH_CREATE',
  'NO_MATCH_UPDATE_ONLY',
  'MISSING_ENVELOPE',
  'INVALID_AMOUNT',
  'INVALID_DATE',
  'MISSING_REQUIRED_FIELD',
  'DUPLICATE_SOURCE_KEY',
  'AMBIGUOUS_MATCH',
] as const;

export type PreviewReason = (typeof PREVIEW_REASONS)[number];

export interface PreviewRowResult {
  rowIndex: number;
  status: BudgetImportPreviewStatus;
  reason?: PreviewReason;
  data?: Record<string, unknown>;
  errorMessage?: string;
}
