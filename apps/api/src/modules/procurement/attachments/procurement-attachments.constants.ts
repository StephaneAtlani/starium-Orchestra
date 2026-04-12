/**
 * Référence historique / tests — la limite effective est `PlatformUploadSettings.maxUploadBytes`
 * (réglage plateforme, défaut 15 MiB).
 */
export const MAX_PROCUREMENT_ATTACHMENT_BYTES = 15 * 1024 * 1024;

export const ALLOWED_PROCUREMENT_ATTACHMENT_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
]);

export const MIME_TO_EXT: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
};
