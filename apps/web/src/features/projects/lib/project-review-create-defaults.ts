import type {
  ProjectReviewMeetingMode,
  ProjectReviewType,
} from '../types/project.types';

export type ProjectReviewCreateMenuType =
  | 'COPRO'
  | 'COPIL'
  | 'CODIR_REVIEW'
  | 'PROJECT_REVIEW'
  | 'OTHER';

export type ProjectReviewCreateDefaults = {
  reviewType: ProjectReviewCreateMenuType;
  menuLabel: string;
  menuHint: string;
  durationMinutes: number;
  meetingMode: ProjectReviewMeetingMode;
};

/** Defaults création typée 13–16 (RFC-PROJ-013-7). COPRO affiché COPROJ dans le menu. */
export const PROJECT_REVIEW_CREATE_DEFAULTS: readonly ProjectReviewCreateDefaults[] =
  [
    {
      reviewType: 'COPRO',
      menuLabel: 'COPROJ',
      menuHint: 'Hebdo · équipe projet · 60 min',
      durationMinutes: 60,
      meetingMode: 'HYBRID',
    },
    {
      reviewType: 'COPIL',
      menuLabel: 'COPIL',
      menuHint: 'Mensuel · sponsors · 90 min',
      durationMinutes: 90,
      meetingMode: 'REMOTE',
    },
    {
      reviewType: 'CODIR_REVIEW',
      menuLabel: 'CODIR',
      menuHint: 'Trimestriel · direction · 60 min',
      durationMinutes: 60,
      meetingMode: 'REMOTE',
    },
    {
      reviewType: 'PROJECT_REVIEW',
      menuLabel: 'Revue',
      menuHint: 'Ponctuel · revue projet · 45 min',
      durationMinutes: 45,
      meetingMode: 'HYBRID',
    },
    {
      reviewType: 'OTHER',
      menuLabel: 'Ad hoc',
      menuHint: 'Ponctuel · audience libre · 30 min',
      durationMinutes: 30,
      meetingMode: 'ONSITE',
    },
  ] as const;

export function getCreateDefaultsForType(
  reviewType: ProjectReviewType,
): ProjectReviewCreateDefaults {
  return (
    PROJECT_REVIEW_CREATE_DEFAULTS.find((d) => d.reviewType === reviewType) ??
    PROJECT_REVIEW_CREATE_DEFAULTS[0]!
  );
}

export const PROJECT_REVIEW_SERIES_FREQUENCY_LABEL: Record<
  'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY',
  string
> = {
  WEEKLY: 'Hebdomadaire',
  BIWEEKLY: 'Bihebdomadaire',
  MONTHLY: 'Mensuelle',
  QUARTERLY: 'Trimestrielle',
};
