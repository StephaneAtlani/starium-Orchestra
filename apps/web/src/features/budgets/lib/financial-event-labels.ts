'use client';

const EVENT_TYPE_LABELS: Record<string, string> = {
  LINE_CREATED: 'Création de ligne',
  BUDGET_INITIALIZED: 'Initialisation budget',
  ALLOCATION_ADDED: 'Allocation ajoutée',
  ALLOCATION_UPDATED: 'Allocation mise à jour',
  COMMITMENT_REGISTERED: 'Engagement enregistré',
  CONSUMPTION_REGISTERED: 'Consommation enregistrée',
  FORECAST_UPDATED: 'Prévision mise à jour',
  REALLOCATION_DONE: 'Réallocation effectuée',
  CANCELLATION: 'Annulation',
  ADJUSTMENT: 'Ajustement',
};

export function formatFinancialEventType(eventType: string | null | undefined): string {
  if (!eventType) return '—';
  return EVENT_TYPE_LABELS[eventType] ?? eventType;
}

const SOURCE_TYPE_LABELS: Record<string, string> = {
  MANUAL: 'Saisie manuelle',
  PURCHASE_ORDER: 'Commande',
  INVOICE: 'Facture',
};

export function formatFinancialSourceType(
  sourceType: string | null | undefined,
): string {
  if (!sourceType) return '—';
  return SOURCE_TYPE_LABELS[sourceType] ?? sourceType;
}

