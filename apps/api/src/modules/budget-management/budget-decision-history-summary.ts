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

function formatMoneyAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency.length === 3 ? currency : 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

type SummaryContext = {
  budgetName: string;
  envelopeName?: string | null;
  lineName?: string | null;
  /** Réallocation (arbitrage) entre deux lignes — noms déjà résolus. */
  reallocation?: {
    sourceLineName: string;
    targetLineName: string;
    amount: number;
    currency: string;
    reason: string | null;
  };
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
      return `Budget « ${ctx.budgetName} » : changement de statut ${from} → ${to}`;
    }
    case 'budget.reallocated': {
      const r = ctx.reallocation;
      if (r) {
        const amt = formatMoneyAmount(r.amount, r.currency);
        const reason = r.reason?.trim();
        return reason
          ? `Arbitrage (réallocation) : « ${r.sourceLineName} » → « ${r.targetLineName} » — ${amt} — ${reason}`
          : `Arbitrage (réallocation) : « ${r.sourceLineName} » → « ${r.targetLineName} » — ${amt}`;
      }
      return `Arbitrage (réallocation) sur le budget « ${ctx.budgetName} »`;
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
        ? `Ligne « ${ctx.lineName} » : changement de statut ${from} → ${to}`
        : `Changement de statut ligne : ${from} → ${to}`;
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
