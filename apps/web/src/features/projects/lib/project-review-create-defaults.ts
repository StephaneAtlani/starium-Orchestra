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

/** Placeholder titre (CDC zone 3) — adapté au type. */
export function titlePlaceholderForType(reviewType: ProjectReviewType): string {
  const label = getCreateDefaultsForType(reviewType).menuLabel;
  if (reviewType === 'OTHER') return `Ex : ${label} — décision urgente`;
  if (reviewType === 'PROJECT_REVIEW') return `Ex : ${label} — jalon Q2`;
  if (reviewType === 'CODIR_REVIEW') return `Ex : ${label} — synthèse Q2`;
  if (reviewType === 'COPIL') return `Ex : ${label} — Avril`;
  return `Ex : ${label} — Semaine 22`;
}

/** Placeholder objectif (CDC zone 4). */
export function objectivePlaceholderForType(
  reviewType: ProjectReviewType,
): string {
  switch (reviewType) {
    case 'COPIL':
      return 'Ex : arbitrages budget et risques du mois';
    case 'CODIR_REVIEW':
      return 'Ex : message clé et enjeux pour la direction';
    case 'PROJECT_REVIEW':
      return 'Ex : revue de jalon et critères GO / NO GO';
    case 'OTHER':
      return 'Ex : décision ciblée hors cadence';
    default:
      return 'Ex : suivi hebdomadaire des chantiers et blocages';
  }
}

/** Titre prérempli à l’ouverture / changement de type (présélectionné). */
export function defaultCreateTitleForType(
  reviewType: ProjectReviewType,
  now = new Date(),
): string {
  const label = getCreateDefaultsForType(reviewType).menuLabel;
  if (reviewType === 'OTHER') return `${label} — décision urgente`;
  if (reviewType === 'PROJECT_REVIEW') return `${label} — revue`;
  if (reviewType === 'CODIR_REVIEW') {
    const q = Math.floor(now.getMonth() / 3) + 1;
    return `${label} — Q${q} ${now.getFullYear()}`;
  }
  if (reviewType === 'COPIL') {
    return `${label} — ${now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`;
  }
  const week = isoWeekNumber(now);
  return `${label} — Semaine ${week}`;
}

function isoWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/** Libellé CDC « Modèle {badge} standard (N points) ». */
export function agendaModelLabelForType(
  reviewType: ProjectReviewType,
  pointCount: number,
): string {
  const badge = getCreateDefaultsForType(reviewType).menuLabel;
  return `Modèle ${badge} standard (${pointCount} point${pointCount > 1 ? 's' : ''})`;
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

/** Date seule (YYYY-MM-DD) pour input type=date — optionnelle côté CDC. */
export function defaultCreateDateOnlyForType(
  reviewType: ProjectReviewType,
): string {
  return defaultCreateDatetimeForType(reviewType).slice(0, 10);
}

/** Combine date YYYY-MM-DD + horaire type → datetime-local. */
export function datetimeFromDateOnlyAndType(
  dateOnly: string,
  reviewType: ProjectReviewType,
): string {
  const defaults = getCreateDefaultsForType(reviewType);
  const hh = String(defaults.defaultHour).padStart(2, '0');
  const mm = String(defaults.defaultMinute).padStart(2, '0');
  const raw = `${dateOnly}T${hh}:${mm}`;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return defaultCreateDatetimeForType(reviewType);
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
