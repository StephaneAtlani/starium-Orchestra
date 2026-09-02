/**
 * Contrats alignés sur le backend RFC-018 / RFC-BUD-043.
 * @see apps/api/src/modules/budget-import/
 */

/** Aligné sur `BudgetImportSourceType` Prisma / JSON. */
export type BudgetImportSourceType = 'CSV' | 'XLSX';

/** Aligné sur `BudgetImportMode` Prisma. */
export type BudgetImportMode = 'CREATE_ONLY' | 'UPSERT' | 'UPDATE_ONLY';

/** Aligné sur `BudgetImportPurpose` Prisma — RFC-BUD-043. */
export type BudgetImportPurpose = 'STRUCTURE' | 'REALITY' | 'MIXED';

/** Aligné sur `BudgetImportJobStatus` Prisma. */
export type BudgetImportJobStatus =
  | 'ANALYZED'
  | 'PREVIEWED'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED';

export type MatchingStrategy = 'EXTERNAL_ID' | 'COMPOSITE';

export interface MappingMatchingConfig {
  strategy: MatchingStrategy;
  keys?: string[];
}

export type MappingConfigFields = Record<string, string>;

/** Aligné sur `MappingConfig` backend. */
export interface MappingConfig {
  fields: MappingConfigFields;
  matching?: MappingMatchingConfig;
  defaults?: Record<string, string>;
}

/** Aligné sur `BudgetImportOptionsConfig` backend. */
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

/** `AnalyzeResult` — réponse POST /api/budget-imports/analyze | analyze-sheet */
export interface AnalyzeResult {
  fileToken: string;
  sourceType: BudgetImportSourceType;
  sheetNames?: string[];
  /** Onglet Excel utilisé pour colonnes / comptage (CSV : absent). */
  activeSheetName?: string;
  columns: string[];
  sampleRows: Record<string, string>[];
  rowCount: number;
}

/** Alias 1:1 autorisé par le plan. */
export type AnalyzeImportResult = AnalyzeResult;

export type BudgetImportPreviewStatus = 'CREATE' | 'UPDATE' | 'SKIP' | 'ERROR';

export type PreviewReason =
  | 'MATCHED_BY_EXTERNAL_ID'
  | 'MATCHED_BY_COMPOSITE_KEY'
  | 'NO_MATCH_CREATE'
  | 'NO_MATCH_UPDATE_ONLY'
  | 'MISSING_ENVELOPE'
  | 'INVALID_AMOUNT'
  | 'INVALID_DATE'
  | 'MISSING_REQUIRED_FIELD'
  | 'DUPLICATE_SOURCE_KEY'
  | 'AMBIGUOUS_MATCH';

/** Élément de `previewRows` — `PreviewRowResult` backend. */
export interface PreviewRowResult {
  rowIndex: number;
  status: BudgetImportPreviewStatus;
  reason?: PreviewReason;
  data?: Record<string, unknown>;
  errorMessage?: string;
}

/** `PreviewResult` — réponse POST /api/budget-imports/preview */
export interface PreviewResult {
  stats: {
    totalRows: number;
    createRows: number;
    updateRows: number;
    skipRows: number;
    errorRows: number;
  };
  previewRows: PreviewRowResult[];
  warnings: string[];
  errors: string[];
}

export type PreviewImportResult = PreviewResult;

/** `ExecuteResult` — réponse POST /api/budget-imports/execute */
export interface ExecuteResult {
  jobId: string;
  status: string;
  totalRows: number;
  createdRows: number;
  updatedRows: number;
  skippedRows: number;
  errorRows: number;
}

export type ExecuteImportResult = ExecuteResult;

export interface BudgetImportJobSummary {
  warningsCount: number;
  errorsByType: Record<string, number>;
}

/** Aligné sur `BudgetImportJobListItem` backend — RFC-BUD-043. */
export interface BudgetImportJobDto {
  id: string;
  budgetId: string;
  budgetLabel: string;
  exerciseLabel: string | null;
  fileName: string;
  sourceType: BudgetImportSourceType;
  status: BudgetImportJobStatus;
  importMode: BudgetImportMode;
  mappingId: string | null;
  mappingName: string | null;
  totalRows: number;
  createdRows: number;
  updatedRows: number;
  skippedRows: number;
  errorRows: number;
  summary: BudgetImportJobSummary | null;
  createdByLabel: string | null;
  createdAt: string;
}

export interface ListBudgetImportJobsResult {
  items: BudgetImportJobDto[];
  total: number;
  limit: number;
  offset: number;
}

export interface ListBudgetImportJobsParams {
  budgetId?: string;
  status?: BudgetImportJobStatus;
  mappingId?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

/** Aligné sur `BudgetImportMappingResponse` backend. */
export interface BudgetImportMappingDto {
  id: string;
  clientId: string;
  name: string;
  description: string | null;
  sourceType: BudgetImportSourceType;
  entityType: string;
  sheetName: string | null;
  headerRowIndex: number;
  mappingConfig: MappingConfig;
  optionsConfig: Record<string, unknown> | null;
  importPurpose: BudgetImportPurpose;
  defaultBudgetId: string | null;
  defaultBudgetLabel: string | null;
  lastUsedAt: string | null;
  jobCount: number;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListBudgetImportMappingsResult {
  items: BudgetImportMappingDto[];
  total: number;
  limit: number;
  offset: number;
}

export interface ListBudgetImportMappingsParams {
  limit?: number;
  offset?: number;
  importPurpose?: BudgetImportPurpose;
  sourceType?: BudgetImportSourceType;
  search?: string;
  defaultBudgetId?: string;
}

export interface CreateBudgetImportMappingPayload {
  name: string;
  description?: string;
  sourceType: BudgetImportSourceType;
  entityType?: string;
  sheetName?: string;
  headerRowIndex?: number;
  mappingConfig: MappingConfig;
  optionsConfig?: Record<string, unknown>;
  importPurpose?: BudgetImportPurpose;
  defaultBudgetId?: string | null;
}

export interface UpdateBudgetImportMappingPayload {
  name?: string;
  description?: string;
  sheetName?: string;
  headerRowIndex?: number;
  mappingConfig?: MappingConfig;
  optionsConfig?: Record<string, unknown>;
  importPurpose?: BudgetImportPurpose;
  defaultBudgetId?: string | null;
}
