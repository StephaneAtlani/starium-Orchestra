import { MeetingStatus } from '@prisma/client';

/**
 * RFC-MEET-001 §4.4 — cycle de vie d'une réunion.
 *
 *   PREPARING → SCHEDULED → IN_PROGRESS → FINALIZED
 *        ↘──────────────────────────────↗ CANCELLED
 *
 * Aligné sur `ProjectReviewStatus` (RFC-PROJ-013-2), sans valeur legacy :
 * le module est neuf, il n'a pas d'historique à absorber.
 */
export type MeetingTransition =
  | 'schedule'
  | 'start'
  | 'finalize'
  | 'cancel';

const TRANSITIONS: Readonly<Record<MeetingTransition, readonly MeetingStatus[]>> =
  {
    /** Planifier : depuis la préparation, ou replanifier une réunion déjà datée. */
    schedule: ['PREPARING', 'SCHEDULED'],
    start: ['SCHEDULED'],
    finalize: ['IN_PROGRESS'],
    /** Annulable tant que la réunion n'est pas finalisée. */
    cancel: ['PREPARING', 'SCHEDULED', 'IN_PROGRESS'],
  };

const TARGET: Readonly<Record<MeetingTransition, MeetingStatus>> = {
  schedule: 'SCHEDULED',
  start: 'IN_PROGRESS',
  finalize: 'FINALIZED',
  cancel: 'CANCELLED',
};

/** `true` si la transition est permise depuis ce statut. */
export function canTransition(
  from: MeetingStatus,
  transition: MeetingTransition,
): boolean {
  return TRANSITIONS[transition].includes(from);
}

/** Statut résultant d'une transition. */
export function targetStatus(transition: MeetingTransition): MeetingStatus {
  return TARGET[transition];
}

/**
 * Le contenu de préparation (périmètre, sections, ordre du jour, convoqués)
 * n'est modifiable que tant que la réunion n'est ni finalisée ni annulée.
 */
export function isMeetingEditable(status: MeetingStatus): boolean {
  return (
    status === 'PREPARING' || status === 'SCHEDULED' || status === 'IN_PROGRESS'
  );
}

/**
 * La saisie de séance (décisions, points bloquants, émargement) n'est ouverte
 * qu'en conduite.
 */
export function isMeetingInConduct(status: MeetingStatus): boolean {
  return status === 'IN_PROGRESS';
}

/**
 * Compte rendu et exports : uniquement sur une réunion finalisée — même règle
 * que `canPreviewOrSendReviewReport` côté points projet (RFC-PROJ-013-2).
 */
export function canProduceMeetingReport(status: MeetingStatus): boolean {
  return status === 'FINALIZED';
}

/** Le deck sert le snapshot figé dès la finalisation, sinon les données live. */
export function meetingDeckSource(
  status: MeetingStatus,
): 'live' | 'snapshot' {
  return status === 'FINALIZED' ? 'snapshot' : 'live';
}
