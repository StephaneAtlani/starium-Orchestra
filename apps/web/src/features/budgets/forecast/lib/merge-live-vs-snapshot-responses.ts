import type {
  BudgetComparisonResponse,
  ForecastLineStatus,
} from '@/features/budgets/types/budget-forecast.types';

export type MergedLiveVsManySnapshotsRow = {
  lineKey: string;
  name: string;
  leftRevised: number;
  rightRevised: number[];
  /** Écart prévisionnel (1ʳᵉ cible) : droite − gauche, même logique que la comparaison paire. */
  forecastDiffFirst: number;
  status: ForecastLineStatus;
};

export type MergedLiveVsManySnapshots = {
  currency: string | null;
  leftLabel: string;
  /** Libellés colonnes droite (une par snapshot, ordre = requêtes). */
  rightLabels: string[];
  lines: MergedLiveVsManySnapshotsRow[];
  totalsLeft: number;
  totalsRight: number[];
  /** 1ʳᵉ réponse : sous-totaux agrégés (footer détail). */
  primaryResponse: BudgetComparisonResponse;
};

/**
 * Fusionne N réponses « budget actuel vs snapshot_i » (même budget, même périmètre ligne).
 * Variance / statut : issus de la comparaison avec le **premier** snapshot sélectionné.
 */
export function mergeLiveVsManySnapshotResponses(
  responses: BudgetComparisonResponse[],
): MergedLiveVsManySnapshots | null {
  if (responses.length === 0) return null;

  const currency = responses[0].currency;
  const leftLabel =
    responses[0].leftLabel?.trim() || 'Référence (actuel)';
  const rightLabels = responses.map(
    (r, i) => r.rightLabel?.trim() || `Snapshot ${i + 1}`,
  );
  const primaryResponse = responses[0];

  const keyOrder: string[] = [];
  const seen = new Set<string>();
  for (const r of responses) {
    for (const line of r.lines) {
      if (!seen.has(line.lineKey)) {
        seen.add(line.lineKey);
        keyOrder.push(line.lineKey);
      }
    }
  }

  const lines: MergedLiveVsManySnapshotsRow[] = keyOrder.flatMap((lineKey) => {
    const perResp = responses.map((r) =>
      r.lines.find((l) => l.lineKey === lineKey),
    );
    const first = perResp.find(Boolean);
    if (!first) {
      return [];
    }
    const rightRevised = perResp.map((row) => row?.right.budgetAmount ?? 0);
    const primary = perResp[0]!;
    return [
      {
        lineKey,
        name: first.name,
        leftRevised: first.left.budgetAmount,
        rightRevised,
        forecastDiffFirst:
          primary.right.forecastAmount - primary.left.forecastAmount,
        status: primary.status,
      },
    ];
  });

  const totalsLeft = lines.reduce((s, l) => s + l.leftRevised, 0);
  const totalsRight = responses.map((_, col) =>
    lines.reduce((s, l) => s + (l.rightRevised[col] ?? 0), 0),
  );

  return {
    currency,
    leftLabel,
    rightLabels,
    lines,
    totalsLeft,
    totalsRight,
    primaryResponse,
  };
}
