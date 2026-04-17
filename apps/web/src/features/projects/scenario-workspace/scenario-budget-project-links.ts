import type { ProjectBudgetAllocationType, ProjectBudgetLinkItem } from '../types/project.types';

/** Règle d’allocation projet ↔ ligne budgétaire (sans objet liaison complet). */
export function formatAllocationRule(
  allocationType: ProjectBudgetAllocationType,
  percentage: string | null,
  amount: string | null,
): string {
  if (allocationType === 'FULL') return 'Projet : 100 % de la ligne';
  if (allocationType === 'PERCENTAGE') return `Projet : ${percentage ?? '—'} % de la ligne`;
  if (allocationType === 'FIXED') return `Projet : montant fixe ${amount ?? '—'}`;
  return allocationType;
}

/** Libellé métier de la règle d’allocation projet ↔ ligne budgétaire. */
export function formatProjectBudgetAllocation(link: ProjectBudgetLinkItem): string {
  return formatAllocationRule(link.allocationType, link.percentage, link.amount);
}

/**
 * Suggestion de montant planifié scénario à partir de la liaison (aligné sur le cas FIXED).
 * Pour FULL / PERCENTAGE, l’utilisateur saisit le montant (référence : engagé / consommé ci-dessous).
 */
export function plannedAmountHintFromProjectLink(link: ProjectBudgetLinkItem): string | null {
  if (link.allocationType === 'FIXED' && link.amount?.trim()) return link.amount;
  return null;
}

export function defaultLabelFromProjectLink(link: ProjectBudgetLinkItem): string {
  const { code, name } = link.budgetLine;
  return `${code} — ${name}`;
}

export function groupLinksByEnvelopeId(
  links: ProjectBudgetLinkItem[],
): Map<string, ProjectBudgetLinkItem[]> {
  const m = new Map<string, ProjectBudgetLinkItem[]>();
  for (const link of links) {
    const eid = link.budgetLine.envelopeId;
    const list = m.get(eid) ?? [];
    list.push(link);
    m.set(eid, list);
  }
  return m;
}
