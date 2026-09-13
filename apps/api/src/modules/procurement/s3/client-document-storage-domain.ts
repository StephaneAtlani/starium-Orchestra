/** Domaines métier pour l’arborescence fichiers (préfixes lisibles). */
export const CLIENT_DOCUMENT_STORAGE_DOMAINS = [
  'commandes',
  'factures',
  'contrats',
  'projets',
] as const;

export type ClientDocumentStorageDomain = (typeof CLIENT_DOCUMENT_STORAGE_DOMAINS)[number];

export function domainToPathSegment(domain: ClientDocumentStorageDomain): string {
  switch (domain) {
    case 'commandes':
      return 'Commandes';
    case 'factures':
      return 'Factures';
    case 'contrats':
      return 'Contrats';
    case 'projets':
      return 'Projets';
    default: {
      const _x: never = domain;
      return _x;
    }
  }
}
