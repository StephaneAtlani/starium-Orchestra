/**
 * Export CSV de la structure d'un budget (RFC-FE-BUD-032 §5.1, décision D2 : génération client).
 *
 * L'export reprend l'arbre déjà chargé par la fiche — aucun appel API supplémentaire, donc aucune
 * donnée qui ne soit pas déjà autorisée pour l'utilisateur dans le client actif.
 * Aucun identifiant technique n'est exporté : uniquement des libellés métier.
 */
import { BUDGET_LABELS } from './budget-display-labels';
import type {
  BudgetEnvelope,
  BudgetLine,
} from '../types/budget-management.types';

export const BUDGET_DETAIL_CSV_HEADERS = [
  'Type',
  'Enveloppe',
  'Ligne',
  'Code',
  'Nature',
  `${BUDGET_LABELS.budget} HT`,
  `${BUDGET_LABELS.landing} HT`,
  `${BUDGET_LABELS.committed} HT`,
  `${BUDGET_LABELS.consumed} HT`,
  `${BUDGET_LABELS.remaining} HT`,
  'TVA %',
  `${BUDGET_LABELS.budget} TTC`,
];

const ENVELOPE_TYPE_LABEL: Record<string, string> = {
  RUN: 'RUN',
  BUILD: 'BUILD',
  TRANSVERSE: 'Transverse',
};

function escapeCsv(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

/** Nombre décimal au format français (virgule) — sans symbole, pour rester exploitable en tableur. */
function formatCsvAmount(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '';
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: false,
  }).format(value);
}

function formatCsvRate(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '';
  return new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 2,
    useGrouping: false,
  }).format(value);
}

function sumOrNull(values: (number | null | undefined)[]): number | null {
  if (values.length === 0 || values.some((value) => value == null)) return null;
  return values.reduce<number>((acc, value) => acc + (value ?? 0), 0);
}

export interface BuildBudgetDetailCsvParams {
  envelopes: BudgetEnvelope[];
  lines: BudgetLine[];
}

export function buildBudgetDetailCsvContent({
  envelopes,
  lines,
}: BuildBudgetDetailCsvParams): string {
  const orderedEnvelopes = [...envelopes].sort((a, b) => {
    const orderA = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
    const orderB = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) return orderA - orderB;
    return a.name.localeCompare(b.name, 'fr');
  });

  const rows: string[][] = [];

  for (const envelope of orderedEnvelopes) {
    const envelopeLines = lines.filter((line) => line.envelopeId === envelope.id);

    rows.push([
      'Enveloppe',
      envelope.name,
      '',
      envelope.code ?? '',
      ENVELOPE_TYPE_LABEL[envelope.type] ?? envelope.type,
      formatCsvAmount(envelopeLines.reduce((acc, l) => acc + l.initialAmount, 0)),
      formatCsvAmount(envelopeLines.reduce((acc, l) => acc + l.forecastAmount, 0)),
      formatCsvAmount(envelopeLines.reduce((acc, l) => acc + l.committedAmount, 0)),
      formatCsvAmount(envelopeLines.reduce((acc, l) => acc + l.consumedAmount, 0)),
      formatCsvAmount(envelopeLines.reduce((acc, l) => acc + l.remainingAmount, 0)),
      '',
      formatCsvAmount(sumOrNull(envelopeLines.map((l) => l.initialAmountTtc))),
    ]);

    for (const line of envelopeLines) {
      rows.push([
        'Ligne',
        envelope.name,
        line.name,
        line.code ?? '',
        line.expenseType,
        formatCsvAmount(line.initialAmount),
        formatCsvAmount(line.forecastAmount),
        formatCsvAmount(line.committedAmount),
        formatCsvAmount(line.consumedAmount),
        formatCsvAmount(line.remainingAmount),
        formatCsvRate(line.taxRate),
        formatCsvAmount(line.initialAmountTtc),
      ]);
    }
  }

  return [
    BUDGET_DETAIL_CSV_HEADERS.join(';'),
    ...rows.map((row) => row.map(escapeCsv).join(';')),
  ].join('\n');
}

/** Nom de fichier lisible dérivé du nom du budget — jamais de l'identifiant. */
export function budgetDetailCsvFilename(budgetName: string): string {
  const slug =
    budgetName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase() || 'budget';
  return `budget-${slug}.csv`;
}

export function downloadBudgetDetailCsv(
  params: BuildBudgetDetailCsvParams & { budgetName: string },
): void {
  const csv = buildBudgetDetailCsvContent(params);
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = budgetDetailCsvFilename(params.budgetName);
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
