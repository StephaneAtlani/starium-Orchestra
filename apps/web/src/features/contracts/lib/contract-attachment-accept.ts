const ACCEPT_EXT = /\.(pdf|png|jpe?g)$/i;
const ACCEPT_MIME = new Set(['application/pdf', 'image/png', 'image/jpeg']);

/** Valeur `accept` pour les inputs fichier (contrat / pièces). */
export const CONTRACT_ATTACHMENT_INPUT_ACCEPT =
  'application/pdf,image/png,image/jpeg,.pdf,.png,.jpg,.jpeg';

export function isAcceptedContractAttachmentFile(file: File): boolean {
  if (file.type && ACCEPT_MIME.has(file.type)) return true;
  if (file.type === 'application/octet-stream' && ACCEPT_EXT.test(file.name)) return true;
  if (!file.type && ACCEPT_EXT.test(file.name)) return true;
  return ACCEPT_EXT.test(file.name);
}
