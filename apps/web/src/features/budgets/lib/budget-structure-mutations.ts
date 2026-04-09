/**
 * Règles alignées sur budget-envelopes / budget-lines (API) :
 * pas de création d’enveloppe ou de ligne sur budget LOCKED/ARCHIVED
 * ou sur une version versionnée SUPERSEDED / ARCHIVED.
 */
export function canMutateBudgetStructure(budget: {
  status: string;
  isVersioned?: boolean;
  versionStatus?: string | null;
}): boolean {
  if (budget.status === 'LOCKED' || budget.status === 'ARCHIVED') return false;
  const vs = budget.versionStatus;
  if (
    budget.isVersioned &&
    vs &&
    (vs === 'SUPERSEDED' || vs === 'ARCHIVED')
  ) {
    return false;
  }
  return true;
}

export function budgetStructureBlockedReason(budget: {
  status: string;
  isVersioned?: boolean;
  versionStatus?: string | null;
}): string {
  if (budget.status === 'LOCKED' || budget.status === 'ARCHIVED') {
    return 'Ce budget est verrouillé ou archivé : vous ne pouvez pas y ajouter d’enveloppe ni de ligne.';
  }
  const vs = budget.versionStatus;
  if (
    budget.isVersioned &&
    vs &&
    (vs === 'SUPERSEDED' || vs === 'ARCHIVED')
  ) {
    return 'Cette version budgétaire n’est plus active. Ouvrez la version active (page Versions ou lien ci-dessous) pour modifier la structure.';
  }
  return 'Impossible de modifier la structure sur ce budget.';
}
