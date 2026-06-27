import type { ProjectBudgetAllocationType, ProjectBudgetLinkItem } from '../types/project.types';

export const ALLOCATION_MODE_LABELS: Record<ProjectBudgetAllocationType, string> = {
  FULL: 'Intégral (100 % de la ligne)',
  PERCENTAGE: 'Pourcentage de la ligne',
  BUDGET_PERCENTAGE: 'Pourcentage du budget',
  FIXED: 'Montant fixe',
};

export function isPercentageAllocationMode(
  mode: ProjectBudgetAllocationType,
): boolean {
  return mode === 'PERCENTAGE' || mode === 'BUDGET_PERCENTAGE';
}

export function parseFixedLinkAmount(amount: string | null): number | null {
  if (amount == null || amount === '') return null;
  const n = Number(String(amount).replace(',', '.'));
  return Number.isNaN(n) ? null : n;
}

export function parseAllocationPercentage(value: string | null): number | null {
  if (value == null || value === '') return null;
  const n = Number(String(value).replace(',', '.'));
  return Number.isNaN(n) ? null : n;
}

/** Montant € imputé sur une ligne pour un pourcentage (arrondi à l'entier supérieur). */
export function computePercentageLineAllocationAmount(
  lineInitialAmount: number,
  percentage: number,
): number | null {
  if (lineInitialAmount <= 0 || percentage <= 0) return null;
  return Math.ceil((lineInitialAmount * percentage) / 100);
}

export function sumFixedLinkAmounts(links: ProjectBudgetLinkItem[]): number {
  let sum = 0;
  for (const link of links) {
    if (link.allocationType !== 'FIXED') continue;
    sum += parseFixedLinkAmount(link.amount) ?? 0;
  }
  return sum;
}

export function sumPercentageLinkAllocations(links: ProjectBudgetLinkItem[]): number {
  let sum = 0;
  for (const link of links) {
    if (!isPercentageAllocationMode(link.allocationType)) continue;
    sum += parseAllocationPercentage(link.percentage) ?? 0;
  }
  return sum;
}

export type AllocationRemainder = {
  allocated: number;
  remaining: number;
  draft: number | null;
  remainingAfterDraft: number | null;
};

export function computeFixedAllocationRemainder(
  links: ProjectBudgetLinkItem[],
  forecastCost: number | null,
  draftAmount: string,
): AllocationRemainder | null {
  if (forecastCost == null) return null;
  const allocated = sumFixedLinkAmounts(links);
  const draft = parseFixedLinkAmount(draftAmount.trim() || null);
  const remaining = forecastCost - allocated;
  return {
    allocated,
    remaining,
    draft,
    remainingAfterDraft: draft != null ? remaining - draft : null,
  };
}

export function computePercentageAllocationRemainder(
  links: ProjectBudgetLinkItem[],
  draftPercentage: string,
): AllocationRemainder {
  const allocated = sumPercentageLinkAllocations(links);
  const draft = parseAllocationPercentage(draftPercentage.trim() || null);
  const remaining = 100 - allocated;
  return {
    allocated,
    remaining,
    draft,
    remainingAfterDraft: draft != null ? remaining - draft : null,
  };
}

function linksExcluding(
  links: ProjectBudgetLinkItem[],
  editingLinkId: string | null,
): ProjectBudgetLinkItem[] {
  if (!editingLinkId) return links;
  return links.filter((link) => link.id !== editingLinkId);
}

/** Reste à allouer en édition (hors lien en cours de modification). */
export function computeFixedAllocationRemainderForEdit(
  links: ProjectBudgetLinkItem[],
  editingLinkId: string | null,
  forecastCost: number | null,
  draftAmount: string,
): AllocationRemainder | null {
  return computeFixedAllocationRemainder(
    linksExcluding(links, editingLinkId),
    forecastCost,
    draftAmount,
  );
}

export function computePercentageAllocationRemainderForEdit(
  links: ProjectBudgetLinkItem[],
  editingLinkId: string | null,
  draftPercentage: string,
): AllocationRemainder {
  return computePercentageAllocationRemainder(
    linksExcluding(links, editingLinkId),
    draftPercentage,
  );
}

/** Mode d'allocation homogène du projet (null si aucun lien). */
export function resolveProjectAllocationMode(
  links: ProjectBudgetLinkItem[],
): ProjectBudgetAllocationType | null {
  if (links.length === 0) return null;
  return links[0]!.allocationType;
}

/** Mode utilisé à la création : hérité des liens existants, sinon montant fixe par défaut. */
export function resolveCreateAllocationMode(
  links: ProjectBudgetLinkItem[],
): ProjectBudgetAllocationType {
  return resolveProjectAllocationMode(links) ?? 'FIXED';
}

export function canAddProjectBudgetLink(
  links: ProjectBudgetLinkItem[],
): { ok: true } | { ok: false; message: string } {
  const mode = resolveProjectAllocationMode(links);
  if (mode === 'FULL' && links.length >= 1) {
    return {
      ok: false,
      message:
        'Ce projet est déjà lié en mode intégral (100 % de la ligne). Un seul lien est autorisé.',
    };
  }
  return { ok: true };
}

const API_ERROR_MESSAGES: Record<string, string> = {
  'Un seul mode d’allocation par projet (FULL, PERCENTAGE ou FIXED)':
    'Tous les liens du projet doivent utiliser le même mode d’allocation (intégral, pourcentage ligne, pourcentage budget ou montant fixe).',
  'Au plus un lien FULL par projet':
    'Un projet en mode intégral ne peut avoir qu’un seul lien budgétaire.',
  'Un lien FULL ne doit pas avoir de pourcentage ni de montant':
    'Un lien intégral ne comporte ni pourcentage ni montant.',
  'Pourcentage requis pour chaque lien en mode PERCENTAGE':
    'Indiquez un pourcentage pour chaque lien en mode pourcentage.',
  'La somme des pourcentages ne peut pas dépasser 100':
    'La somme des pourcentages ne peut pas dépasser 100 %.',
  'Chaque montant FIXED doit être strictement positif':
    'Chaque montant fixe doit être strictement positif.',
};

export function humanizeProjectBudgetLinkError(message: string): string {
  return API_ERROR_MESSAGES[message] ?? message;
}
