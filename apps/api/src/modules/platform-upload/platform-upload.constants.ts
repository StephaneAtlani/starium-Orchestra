/** Minimum configurable max upload (1 MiB). */
export const PLATFORM_UPLOAD_MIN_BYTES = 1024 * 1024;

/** Default when la ligne DB est absente (15 MiB — aligné ancienne limite pièces procurement). */
export const PLATFORM_UPLOAD_DEFAULT_BYTES = 15 * 1024 * 1024;

/** Plafond absolu par défaut si `PLATFORM_UPLOAD_MAX_BYTES_CEILING` est absent (100 MiB). */
export const PLATFORM_UPLOAD_CEILING_DEFAULT_BYTES = 100 * 1024 * 1024;
