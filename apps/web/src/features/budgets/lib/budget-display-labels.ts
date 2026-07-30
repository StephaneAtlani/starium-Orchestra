/**
 * Vocabulaire financier unique de la fiche budget (RFC-FE-BUD-032 §1.2).
 *
 * Un seul libellé par concept partout : KPI, colonnes, alertes, exports.
 * Interdit d'introduire « Total planifié » / « Forecast » pour le même champ que « Prévision ».
 */
export const BUDGET_LABELS = {
  /** Plafond voté : montant initial + réaffectations. */
  budget: 'Budget',
  /** Plan de dépense : allocations FORECAST / planning 12 mois. */
  forecast: 'Prévision',
  /** Promesse non encore facturée (commande ou engagement manuel). */
  committed: 'Engagé',
  /** Facturé / imputé. */
  consumed: 'Consommé',
  /** Budget − engagé − consommé. */
  remaining: 'Restant',
  /** Prévision − budget. */
  forecastGap: 'Écart prévision',
  /** Snapshot immuable (RFC-031 / RFC-033). */
  snapshot: 'Version figée',
  /** Version éditable du budget (RFC-019). */
  revision: 'Révision',
} as const;

export type BudgetLabelKey = keyof typeof BUDGET_LABELS;

/**
 * Précisions métier courtes affichées sous les KPI — lève l'ambiguïté « engagé ≠ commande »
 * (RFC-FE-BUD-032 §11.2).
 */
export const BUDGET_LABEL_HINTS: Record<
  'budget' | 'committed' | 'consumed' | 'forecast',
  string
> = {
  budget: 'Plafond voté, réaffectations incluses',
  committed: 'Commandes et engagements manuels',
  consumed: 'Facturé ou imputé',
  forecast: 'Plan de dépense saisi',
};

/** Segment de 8 caractères ou plus mêlant lettres et chiffres — signature d'un CUID / UUID tronqué. */
const TECHNICAL_SEGMENT = /[a-z0-9]{8,}/i;

/**
 * Un code est « humain » s'il ne contient aucun segment technique (fragment de CUID).
 * Les segments alphabétiques ou numériques purs restent acceptés (`BUD`, `2025`, `SI-RUN`).
 */
export function isHumanBudgetCode(code: string | null | undefined): boolean {
  const trimmed = code?.trim();
  if (!trimmed) return false;

  return trimmed.split(/[^a-z0-9]+/i).every((segment) => {
    if (segment.length === 0) return true;
    if (!TECHNICAL_SEGMENT.test(segment)) return true;
    const hasLetter = /[a-z]/i.test(segment);
    const hasDigit = /\d/.test(segment);
    return !(hasLetter && hasDigit);
  });
}

/**
 * Libellé d'un budget dans un select / breadcrumb : nom seul si le code embarque un fragment
 * technique, afin de ne jamais exposer d'identifiant en UI.
 */
export function formatBudgetSelectLabel(
  name: string,
  code: string | null | undefined,
): string {
  return isHumanBudgetCode(code) ? `${name} (${code!.trim()})` : name;
}
