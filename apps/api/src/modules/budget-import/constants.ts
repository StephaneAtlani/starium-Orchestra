/** Max file size for import (10 MB). */
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/** Max rows to analyze/import (MVP). */
export const MAX_ROWS = 20_000;

/** Sample rows returned by analyze. */
export const SAMPLE_ROWS_LIMIT = 20;

/** File token TTL in milliseconds (1 hour). */
export const FILE_TOKEN_TTL_MS = 60 * 60 * 1000;

export const ALLOWED_EXTENSIONS = ['.csv', '.xlsx'] as const;
export const ALLOWED_MIME_CSV = ['text/csv', 'application/csv', 'text/plain'] as const;
export const ALLOWED_MIME_XLSX = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
] as const;
