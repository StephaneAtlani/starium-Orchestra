/**
 * Filtre type document (ex. « CD 0000188999 » vs « FA 0000302487 »)
 * pour aiguiller un montant partagé vers commande ou facture.
 */

export type DocumentKind = 'ORDER' | 'INVOICE';

export interface DocumentKindFilterConfig {
  /** Colonne contenant la référence / le type (ex. « CD 0000188999 »). */
  column: string;
  /** Préfixe commande (défaut CD). */
  orderPrefix?: string;
  /** Préfixe facture (défaut FA). */
  invoicePrefix?: string;
  /**
   * Colonne montant partagée. Si absente : `fields.amount`, sinon colonne
   * commune à committedAmount/consumedAmount quand elles pointent au même endroit.
   */
  amountColumn?: string;
}

export function classifyDocumentKind(
  raw: string,
  orderPrefix = 'CD',
  invoicePrefix = 'FA',
): DocumentKind | null {
  const value = raw.trim().replace(/\s+/g, ' ').toUpperCase();
  if (!value) return null;
  const order = orderPrefix.trim().toUpperCase() || 'CD';
  const invoice = invoicePrefix.trim().toUpperCase() || 'FA';
  // Préfixe le plus long d’abord si chevauchement
  if (order.length >= invoice.length) {
    if (value.startsWith(order)) return 'ORDER';
    if (value.startsWith(invoice)) return 'INVOICE';
  } else {
    if (value.startsWith(invoice)) return 'INVOICE';
    if (value.startsWith(order)) return 'ORDER';
  }
  return null;
}
