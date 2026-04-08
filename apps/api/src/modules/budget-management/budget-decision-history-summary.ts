import type { BudgetStatus, BudgetLineStatus } from '@prisma/client';

const BUDGET_STATUS_LABELS: Record<BudgetStatus, string> = {
  DRAFT: 'Brouillon',
  SUBMITTED: 'Soumis',
  REVISED: 'Révisé',
  VALIDATED: 'Validé',
  LOCKED: 'Verrouillé',
  ARCHIVED: 'Archivé',
};

const BUDGET_LINE_STATUS_LABELS: Record<BudgetLineStatus, string> = {
  DRAFT: 'Brouillon',
  PENDING_VALIDATION: 'En attente de validation',
  ACTIVE: 'Actif',
  REJECTED: 'Rejeté',
  DEFERRED: 'Reporté',
  CLOSED: 'Clôturé',
  ARCHIVED: 'Archivé',
};

function budgetStatusLabel(s: string | undefined): string {
  if (!s) return '—';
  return BUDGET_STATUS_LABELS[s as BudgetStatus] ?? s;
}

function lineStatusLabel(s: string | undefined): string {
  if (!s) return '—';
  return BUDGET_LINE_STATUS_LABELS[s as BudgetLineStatus] ?? s;
}

type SummaryContext = {
  budgetName: string;
  envelopeName?: string | null;
  lineName?: string | null;
};

/**
 * Libellés FR fixes (MVP) — pas d’UUID dans le texte principal.
 */
export function buildDecisionHistorySummary(
  action: string,
  oldValue: unknown,
  newValue: unknown,
  ctx: SummaryContext,
): string {
  const ov = oldValue as Record<string, unknown> | null;
  const nv = newValue as Record<string, unknown> | null;

  switch (action) {
    case 'budget.created':
      return `Budget « ${ctx.budgetName} » créé`;
    case 'budget.updated':
      return `Budget « ${ctx.budgetName} » modifié`;
    case 'budget.status.changed': {
      const fromRaw =
        (ov?.from as string | undefined) ??
        (ov?.status as string | undefined);
      const toRaw =
        (nv?.to as string | undefined) ??
        (nv?.status as string | undefined);
      const from = budgetStatusLabel(fromRaw);
      const to = budgetStatusLabel(toRaw);
      return `Budget « ${ctx.budgetName} » : statut ${from} → ${to}`;
    }
    case 'budget_envelope.created':
      return ctx.envelopeName
        ? `Enveloppe « ${ctx.envelopeName} » créée`
        : 'Enveloppe créée';
    case 'budget_envelope.updated':
      return ctx.envelopeName
        ? `Enveloppe « ${ctx.envelopeName} » modifiée`
        : 'Enveloppe modifiée';
    case 'budget_line.created':
      return ctx.lineName
        ? `Ligne « ${ctx.lineName} » créée`
        : 'Ligne budgétaire créée';
    case 'budget_line.updated':
      return ctx.lineName
        ? `Ligne « ${ctx.lineName} » modifiée`
        : 'Ligne budgétaire modifiée';
    case 'budget_line.status.changed': {
      const fromRaw = (ov?.from as string | undefined) ?? (ov?.status as string | undefined);
      const toRaw = (nv?.to as string | undefined) ?? (nv?.status as string | undefined);
      const from = lineStatusLabel(fromRaw);
      const to = lineStatusLabel(toRaw);
      return ctx.lineName
        ? `Ligne « ${ctx.lineName} » : statut ${from} → ${to}`
        : `Statut ligne : ${from} → ${to}`;
    }
    case 'budget_line.deferred':
      return ctx.lineName
        ? `Ligne « ${ctx.lineName} » : report d’exercice modifié`
        : 'Report d’exercice (ligne) modifié';
    case 'budget_line.amounts.updated':
      return ctx.lineName
        ? `Ligne « ${ctx.lineName} » : montants modifiés`
        : 'Montants de ligne modifiés';
    case 'budget_line.planning.updated':
      return ctx.lineName
        ? `Ligne « ${ctx.lineName} » : prévisionnel modifié`
        : 'Prévisionnel modifié';
    case 'budget_line.planning.applied_mode':
      return ctx.lineName
        ? `Ligne « ${ctx.lineName} » : mode de planning appliqué`
        : 'Mode de planning appliqué';
    default:
      return `Action « ${action} »`;
  }
}
