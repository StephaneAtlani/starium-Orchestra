import type { ProjectRaciKind } from '../types/project.types';

export const PROJECT_RACI_KINDS: ProjectRaciKind[] = [
  'RESPONSIBLE',
  'ACCOUNTABLE',
  'CONSULTED',
  'INFORMED',
];

export const PROJECT_RACI_SHORT_LABEL: Record<ProjectRaciKind, string> = {
  RESPONSIBLE: 'R',
  ACCOUNTABLE: 'A',
  CONSULTED: 'C',
  INFORMED: 'I',
};

export const PROJECT_RACI_FULL_LABEL: Record<ProjectRaciKind, string> = {
  RESPONSIBLE: 'Réalisateur',
  ACCOUNTABLE: 'Approbateur',
  CONSULTED: 'Consulté',
  INFORMED: 'Informé',
};

export const PROJECT_RACI_DESCRIPTION: Record<ProjectRaciKind, string> = {
  RESPONSIBLE: 'Exécute le travail',
  ACCOUNTABLE: 'Rend des comptes (un seul par projet)',
  CONSULTED: 'Apporte son avis avant décision',
  INFORMED: 'Tenu informé de l’avancement',
};

/** Texte d’aide affiché dans l’infobulle « Qu’est-ce que le RACI ? » */
export const PROJECT_RACI_HELP_INTRO =
  'Le RACI clarifie les responsabilités par rôle dans le projet. Chaque case indique si le rôle est concerné pour cette dimension.';

export const PROJECT_RACI_HELP_DETAIL =
  'Un seul Approbateur (A) par projet est recommandé : c’est le rôle qui rend des comptes sur le résultat. Les bordures en pointillés signalent des suggestions non encore enregistrées.';
