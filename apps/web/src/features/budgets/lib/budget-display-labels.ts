/**
 * Vocabulaire financier unique de la fiche budget (RFC-FE-BUD-032 §1.2, RFC-BUD-040).
 *
 * Un seul libellé par concept partout : KPI, colonnes, alertes, exports.
 * Interdit d'introduire « Total planifié » / « Forecast » pour l'atterrissage.
 */
export const BUDGET_LABELS = {
  /** Plafond voté : montant initial + réaffectations. */
  budget: 'Budget',
  /** Onglet fiche — grille 12 mois (RFC-BUD-040 D1). */
  planningTab: 'Prévisionnel',
  /** Sous-titre obligatoire de l’onglet grille (RFC-BUD-041 D4). */
  planningTabSubtitle: 'Plan annuel (12 mois) — alimente l’atterrissage',
  /** Somme des 12 mois — répartition, pas l'atterrissage. */
  planningTotal: 'Total plan annuel',
  /** Somme des mois strictement après la date de référence. */
  remainingPlanning: 'Prévision restante',
  /** Projection fin d'exercice : consommé + engagé + prévision restante. */
  landing: 'Atterrissage',
  /** landingAmount − base effective. */
  landingGap: "Écart d'atterrissage",
  /** Rituel de gouvernance mid-year / CODIR (RFC-BUD-041). */
  landingForecastExercise: "Prévision d'atterrissage",
  landingForecastExerciseShort: 'PA',
  /** Promesse non encore facturée (commande ou engagement manuel). */
  committed: 'Engagé',
  /** Facturé / imputé. */
  consumed: 'Consommé',
  /** Budget − engagé − consommé. */
  remaining: 'Restant',
  /** Snapshot immuable (RFC-031 / RFC-033). */
  snapshot: 'Version figée',
  /** Version éditable du budget (RFC-019). */
  revision: 'Révision',
  /** @deprecated Utiliser `landing` */
  forecast: 'Atterrissage',
  /** @deprecated Utiliser `landingGap` */
  forecastGap: "Écart d'atterrissage",
} as const;

export type BudgetLabelKey = keyof typeof BUDGET_LABELS;

/**
 * Précisions métier courtes affichées sous les KPI — lève l'ambiguïté « engagé ≠ commande »
 * (RFC-FE-BUD-032 §11.2, RFC-BUD-040 §7.4).
 */
export const BUDGET_LABEL_HINTS: Record<
  'budget' | 'committed' | 'consumed' | 'landing' | 'planningTotal' | 'remainingPlanning',
  string
> = {
  budget: 'Plafond voté, réaffectations incluses',
  committed: 'Commandes et engagements manuels',
  consumed: 'Facturé ou imputé',
  landing:
    'Résultat de votre plan et de l’exécution ; ajustez via le plan 12 mois ou une PA',
  planningTotal: 'Somme des 12 mois saisis — répartition temporelle',
  remainingPlanning: 'Somme des mois à venir après la date de référence',
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
