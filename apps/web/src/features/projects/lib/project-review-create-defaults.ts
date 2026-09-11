import type {
  ProjectReviewMeetingMode,
  ProjectReviewType,
} from '../types/project.types';
import {
  formatProjectDatetimeLocal,
  roundDateToProjectDatetimeStep,
} from './project-datetime-local';

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
  /** Heure locale par défaut (PDF 14–16). */
  defaultHour: number;
  defaultMinute: number;
};

/** Defaults création typée 13–16 (PDF Spec écrans Points projet). COPRO = COPROJ UI. */
export const PROJECT_REVIEW_CREATE_DEFAULTS: readonly ProjectReviewCreateDefaults[] =
  [
    {
      reviewType: 'COPRO',
      menuLabel: 'COPROJ',
      menuHint: 'Hebdo · équipe projet · 45 min · 09:30',
      durationMinutes: 45,
      meetingMode: 'HYBRID',
      defaultHour: 9,
      defaultMinute: 30,
    },
    {
      reviewType: 'COPIL',
      menuLabel: 'COPIL',
      menuHint: 'Mensuel · sponsors · 90 min · 14:00',
      durationMinutes: 90,
      meetingMode: 'REMOTE',
      defaultHour: 14,
      defaultMinute: 0,
    },
    {
      reviewType: 'CODIR_REVIEW',
      menuLabel: 'CODIR',
      menuHint: 'Trimestriel · direction · 60 min · 10:00',
      durationMinutes: 60,
      meetingMode: 'REMOTE',
      defaultHour: 10,
      defaultMinute: 0,
    },
    {
      reviewType: 'PROJECT_REVIEW',
      menuLabel: 'Revue',
      menuHint: 'Ponctuel · revue projet · 45 min',
      durationMinutes: 45,
      meetingMode: 'HYBRID',
      defaultHour: 10,
      defaultMinute: 0,
    },
    {
      reviewType: 'OTHER',
      menuLabel: 'Ad hoc',
      menuHint: 'Hors cadence · 30 min · décision urgente',
      durationMinutes: 30,
      meetingMode: 'ONSITE',
      defaultHour: 9,
      defaultMinute: 0,
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

/** Prochaine occurrence locale à l’horaire type (si l’heure du jour est passée → lendemain). */
export function defaultCreateDatetimeForType(
  reviewType: ProjectReviewType,
): string {
  const defaults = getCreateDefaultsForType(reviewType);
  const d = new Date();
  d.setSeconds(0, 0);
  d.setHours(defaults.defaultHour, defaults.defaultMinute, 0, 0);
  if (d.getTime() <= Date.now()) {
    d.setDate(d.getDate() + 1);
  }
  return formatProjectDatetimeLocal(roundDateToProjectDatetimeStep(d));
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
