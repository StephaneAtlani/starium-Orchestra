import { randomUUID } from 'node:crypto';
import type { ClientDocumentStorageDomain } from './client-document-storage-domain';
import { domainToPathSegment } from './client-document-storage-domain';

/**
 * Clé objet relative : `{clientId}/{Commandes|Factures|Contrats}/{uuid}/{uuid}.ext`
 * — disque (racine locale) ou S3 (bucket plateforme unique, « dossier » = préfixe client).
 */
export function buildClientDocumentObjectKey(
  clientId: string,
  domain: ClientDocumentStorageDomain,
  safeExt: string,
): string {
  const folder = domainToPathSegment(domain);
  const id1 = randomUUID();
  const id2 = randomUUID();
  return `${clientId}/${folder}/${id1}/${id2}${safeExt}`;
}
