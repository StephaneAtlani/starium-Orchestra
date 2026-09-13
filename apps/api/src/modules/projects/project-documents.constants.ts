/**
 * RFC-PROJ-DOC-002 — MIME autorisés pour upload silo ProjectDocument.
 * Plus large que procurement (pdf/jpeg/png) : livrables projet (office, zip, texte).
 */
export const PROJECT_DOCUMENT_ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/plain',
  'text/csv',
  'application/zip',
]);

export const PROJECT_DOCUMENT_MIME_TO_EXT: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    '.docx',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/vnd.ms-excel': '.xls',
  'text/plain': '.txt',
  'text/csv': '.csv',
  'application/zip': '.zip',
};

/** Cap soft liste (pas de pagination UI V1). */
export const PROJECT_DOCUMENT_LIST_TAKE = 200;
