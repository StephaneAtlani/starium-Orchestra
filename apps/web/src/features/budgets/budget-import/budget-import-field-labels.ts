/**
 * Libellés français pour les champs logiques d’import (affichage UI uniquement).
 * Les clés techniques (`amount`, etc.) restent celles du backend dans `mapping.fields`.
 */

/**
 * Valeur technique réservée pour « rien de sélectionné » dans les Select (le composant UI
 * exige une chaîne par option ; ce n’est pas un libellé utilisateur).
 * L’affichage lisible (« Aucune colonne », etc.) est passé explicitement à `SelectValue`
 * car @base-ui/react/select peut sinon afficher cette chaîne brute à l’écran.
 */
export const EMPTY_SELECT_VALUE = '__import_aucune_colonne__';

/**
 * Valeur réservée pour « utiliser la devise par défaut (options / budget) » dans le Select Devise.
 * Ne doit pas être envoyée au backend : `fields.currency` reste vide.
 */
export const DEFAULT_CURRENCY_SELECT_VALUE = '__import_devise_par_defaut__';

/** Libellé pour une clé logique mappée (clés composite, checkboxes). */
export function logicalFieldLabelFr(key: string): string {
  return LOGICAL_FIELD_LABELS[key] ?? key;
}

const LOGICAL_FIELD_LABELS: Record<string, string> = {
  amount: 'Montant',
  initialAmount: 'Montant alternatif',
  name: 'Libellé',
  label: 'Libellé (second)',
  envelopeCode: 'Code enveloppe',
  envelope: 'Enveloppe',
  envelopeId: 'Référence enveloppe',
  committedAmount: 'Montant engagé / facturé (commande)',
  consumedAmount: 'Montant consommé (facture)',
  currency: 'Devise',
  externalId: 'Référence externe',
  date: 'Date',
  transactionDate: 'Date',
  effectiveDate: 'Date d’effet',
};

/** Libellés des formats date (valeurs API inchangées). */
export const DATE_FORMAT_OPTIONS: { value: string; labelFr: string }[] = [
  { value: 'DD/MM/YYYY', labelFr: 'JJ/MM/AAAA (usage courant en France)' },
  { value: 'YYYY-MM-DD', labelFr: 'AAAA-MM-JJ (ISO)' },
];
