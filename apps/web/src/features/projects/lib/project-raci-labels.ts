import type { ProjectRaciKind } from '../types/project.types';

/** Ordre RASCI : R → A → S → C → I */
export const PROJECT_RACI_KINDS: ProjectRaciKind[] = [
  'RESPONSIBLE',
  'ACCOUNTABLE',
  'SUPPORT',
  'CONSULTED',
  'INFORMED',
];

export const PROJECT_RACI_SHORT_LABEL: Record<ProjectRaciKind, string> = {
  RESPONSIBLE: 'R',
  ACCOUNTABLE: 'A',
  SUPPORT: 'S',
  CONSULTED: 'C',
  INFORMED: 'I',
};

export const PROJECT_RACI_FULL_LABEL: Record<ProjectRaciKind, string> = {
  RESPONSIBLE: 'Responsable',
  ACCOUNTABLE: 'Accountable',
  SUPPORT: 'Soutien',
  CONSULTED: 'Consulté',
  INFORMED: 'Informé',
};

export const PROJECT_RACI_DESCRIPTION: Record<ProjectRaciKind, string> = {
  RESPONSIBLE: 'Celui qui réalise la tâche',
  ACCOUNTABLE: 'Celui qui approuve la tâche (un seul A par ligne d’action)',
  SUPPORT: 'Celui qui apporte un soutien ou des ressources',
  CONSULTED: 'Celui qui est consulté',
  INFORMED: 'Celui qui doit être informé',
};

/** Texte d’aide affiché dans l’infobulle « Qu’est-ce que le RASCI ? » */
export const PROJECT_RACI_HELP_INTRO =
  'Matrice RASCI : actions en lignes, acteurs (rôles équipe) en colonnes. Chaque intersection porte au plus une lettre R, A, S, C ou I.';

export const PROJECT_RACI_HELP_DETAIL =
  'Un seul Approbateur (A) par ligne : poser un A sur une autre colonne affiche d’abord un A provisoire (~2 s) ; recliquez pour passer à S et conserver l’ancien A, ou attendez pour confirmer le remplacement. Cycle : R → A → S → C → I → vide.';

/** Couleurs alignées sur la légende RASCI (R vert, A rouge, S violet, C bleu, I orange). */
export const PROJECT_RACI_CELL_CLASS: Record<ProjectRaciKind, string> = {
  RESPONSIBLE:
    'border-emerald-700/50 bg-emerald-600 text-white dark:border-emerald-500/60 dark:bg-emerald-700',
  ACCOUNTABLE:
    'border-red-600/50 bg-red-500 text-white dark:border-red-500/60 dark:bg-red-600',
  SUPPORT:
    'border-violet-700/50 bg-violet-600 text-white dark:border-violet-500/60 dark:bg-violet-700',
  CONSULTED:
    'border-sky-700/50 bg-sky-600 text-white dark:border-sky-500/60 dark:bg-sky-700',
  INFORMED:
    'border-amber-600/50 bg-amber-500 text-amber-950 dark:border-amber-500/60 dark:bg-amber-600 dark:text-amber-50',
};

/** Délai avant de retirer l’ancien A lors d’un remplacement (évite la perte en cycle rapide). */
export const PROJECT_RASCI_ACCOUNTABLE_CONFIRM_MS = 1800;

export function cycleProjectRaciKind(
  current: ProjectRaciKind | null,
): ProjectRaciKind | null {
  if (current == null) return PROJECT_RACI_KINDS[0];
  const idx = PROJECT_RACI_KINDS.indexOf(current);
  if (idx < 0 || idx >= PROJECT_RACI_KINDS.length - 1) return null;
  return PROJECT_RACI_KINDS[idx + 1];
}
