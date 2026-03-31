import type { MappingConfigFields } from '../types/budget-imports.types';

/** Clés métier alignées sur le wizard d’import (RFC-018). */
type LogicalFieldKey =
  | 'amount'
  | 'initialAmount'
  | 'committedAmount'
  | 'consumedAmount'
  | 'name'
  | 'envelopeCode'
  | 'envelopeId'
  | 'currency'
  | 'externalId'
  | 'date';

/** Normalise un en-tête de colonne pour comparaison (casse, accents). */
function normalizeHeader(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Proposition automatique de correspondance colonnes → champs logiques,
 * à partir de la **typologie réelle** des en-têtes du fichier (FR / EN courants).
 * Une même colonne ne peut être assignée qu’à un seul champ (première règle qui matche).
 */
export function guessMappingFromColumnHeaders(columns: string[]): MappingConfigFields {
  const fields: MappingConfigFields = {};
  const used = new Set<string>();

  const pick = (logicalKey: LogicalFieldKey, test: (norm: string, original: string) => boolean) => {
    for (const col of columns) {
      if (used.has(col)) continue;
      const norm = normalizeHeader(col);
      if (test(norm, col)) {
        fields[logicalKey] = col;
        used.add(col);
        return;
      }
    }
  };

  pick('amount', (n) => {
    if (n.includes('devise') || n.includes('currency')) return false;
    return (
      n.includes('montant') ||
      n === 'amount' ||
      n.includes('total') ||
      n.includes('budget') ||
      n === 'ca'
    );
  });

  pick('initialAmount', (n) => {
    return n.includes('initial') || n.includes('revis') || n.includes('révis');
  });

  pick('consumedAmount', (n) => {
    return n.includes('consom') || n.includes('réalis') || n.includes('realis');
  });

  pick('committedAmount', (n) => {
    if (n.includes('consom')) return false;
    return (
      n.includes('engag') ||
      (n.includes('factur') && (n.includes('command') || n.includes('bc'))) ||
      (n.includes('commande') && n.includes('montant'))
    );
  });

  pick('name', (n) => {
    return (
      n.includes('libell') ||
      n.includes('intitul') ||
      n.includes('label') ||
      n.includes('designation') ||
      n.includes('description') ||
      n.includes('metier') ||
      n.includes('métier') ||
      n.includes('titre') ||
      n.includes('wording')
    );
  });

  pick('envelopeCode', (n) => {
    return (
      n.includes('enveloppe') ||
      n.includes('envelope') ||
      n.includes('code env') ||
      (n.includes('compte') && !n.includes('libell'))
    );
  });

  pick('envelopeId', (n) => {
    return (
      (n.includes('id') && n.includes('env')) ||
      n.includes('uuid') ||
      n.includes('id enveloppe')
    );
  });

  pick('currency', (n) => {
    return n.includes('devise') || n.includes('currency') || n.includes('monnaie') || n === 'iso';
  });

  pick('externalId', (n) => {
    return (
      n.includes('ref') ||
      n.includes('reference') ||
      n.includes('référence') ||
      n.includes('external') ||
      n.includes('id externe') ||
      n.includes('erp') ||
      n.includes('source')
    );
  });

  pick('date', (n) => {
    return (
      n === 'date' ||
      n.includes('date') ||
      n.includes('periode') ||
      n.includes('période') ||
      n.includes('echeance') ||
      n.includes('échéance')
    );
  });

  return fields;
}
