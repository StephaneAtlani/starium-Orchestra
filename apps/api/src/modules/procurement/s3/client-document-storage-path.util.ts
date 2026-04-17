import { randomUUID } from 'node:crypto';
import type { ClientDocumentStorageDomain } from './client-document-storage-domain';
import { domainToPathSegment } from './client-document-storage-domain';

/**
 * Sous la racine locale `{root}/` : `{clientId}/{Commandes|Factures|Contrats}/…`
 */
export function buildLocalClientDocumentObjectKey(
  clientId: string,
  domain: ClientDocumentStorageDomain,
  safeExt: string,
): string {
  const folder = domainToPathSegment(domain);
  const id1 = randomUUID();
  const id2 = randomUUID();
  return `${clientId}/${folder}/${id1}/${id2}${safeExt}`;
}

/**
 * Dans le **bucket S3 du client** : `{Commandes|Factures|Contrats}/{uuid}/{uuid}.ext`
 */
export function buildS3ClientDocumentObjectKey(
  domain: ClientDocumentStorageDomain,
  safeExt: string,
): string {
  const folder = domainToPathSegment(domain);
  const id1 = randomUUID();
  const id2 = randomUUID();
  return `${folder}/${id1}/${id2}${safeExt}`;
}
