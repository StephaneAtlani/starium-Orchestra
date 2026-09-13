/** Aligné sur `PROJECT_DOCUMENT_ALLOWED_MIME` API (RFC-PROJ-DOC-002). */
export const PROJECT_DOCUMENT_INPUT_ACCEPT = [
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.docx',
  '.doc',
  '.xlsx',
  '.xls',
  '.txt',
  '.csv',
  '.zip',
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
].join(',');

const ALLOWED_MIME = new Set([
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

const ALLOWED_EXT = new Set([
  'pdf',
  'jpg',
  'jpeg',
  'png',
  'webp',
  'docx',
  'doc',
  'xlsx',
  'xls',
  'txt',
  'csv',
  'zip',
]);

export function isAcceptedProjectDocumentFile(file: File): boolean {
  const mime = (file.type || '').toLowerCase();
  if (mime && ALLOWED_MIME.has(mime)) return true;
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return ALLOWED_EXT.has(ext);
}

export function projectDocumentTypeLabel(doc: {
  extension?: string | null;
  mimeType?: string | null;
  name?: string;
}): string {
  const ext = (doc.extension ?? doc.name?.split('.').pop() ?? '')
    .replace(/^\./, '')
    .toUpperCase();
  if (ext) return ext;
  if (doc.mimeType?.includes('pdf')) return 'PDF';
  if (doc.mimeType?.includes('sheet') || doc.mimeType?.includes('excel')) return 'XLSX';
  if (doc.mimeType?.includes('word')) return 'DOCX';
  if (doc.mimeType?.startsWith('image/')) return 'IMG';
  return 'FICHIER';
}
