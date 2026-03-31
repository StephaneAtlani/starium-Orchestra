/** Libellés FR — alignés fiche projet / feuille d’arbitrage. */

export const PORTFOLIO_ARB_GLOBAL_LABEL: Record<string, string> = {
  DRAFT: 'Brouillon',
  TO_REVIEW: 'À arbitrer',
  VALIDATED: 'Arbitrage validé',
  REJECTED: 'Arbitrage refusé',
};

export const PORTFOLIO_ARB_LEVEL_LABEL: Record<string, string> = {
  BROUILLON: 'Proposition de projet',
  EN_COURS: 'En préparation',
  SOUMIS_VALIDATION: 'Soumis à validation',
  VALIDE: 'Validé',
  REFUSE: 'Refusé',
};

export function labelArbGlobal(code: string | null | undefined): string | null {
  if (code == null || code === '') return null;
  return PORTFOLIO_ARB_GLOBAL_LABEL[code] ?? code;
}

export function labelArbLevel(code: string | null | undefined): string | null {
  if (code == null || code === '') return null;
  return PORTFOLIO_ARB_LEVEL_LABEL[code] ?? code;
}

/** Aligné sur `arbitrationFocusStep` (fiche projet) : premier palier non « Validé », sinon CODIR. */
export const PORTFOLIO_ARBITRATION_ACTIVE_LEVEL_LABEL = [
  'Métier',
  'Comité de projet',
  'COPIL / COPRO',
] as const;

export function arbitrationFocusStep(
  metier: string | null | undefined,
  comite: string | null | undefined,
  _codir: string | null | undefined,
): 0 | 1 | 2 {
  const m = metier ?? 'BROUILLON';
  if (m !== 'VALIDE') return 0;
  const c = comite ?? null;
  if (c !== 'VALIDE') return 1;
  return 2;
}
