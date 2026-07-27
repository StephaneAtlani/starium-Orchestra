import { MeetingAttendanceStatus } from '@prisma/client';

/**
 * RFC-MEET-001 §4.10 — calcul du quorum d'une réunion.
 *
 * Règle métier : le quorum se calcule sur les convoqués **requis**. Un délégué
 * ne compte pas pour lui-même : il porte la présence de la personne qu'il
 * représente, ce qui évite de compter deux fois une même voix.
 */
export type QuorumAttendee = {
  readonly id: string;
  readonly isRequired: boolean;
  readonly attendanceStatus: MeetingAttendanceStatus;
  /** Identifiant du convoqué représenté, le cas échéant. */
  readonly delegateOfAttendeeId: string | null;
};

export type QuorumRule = {
  /** Ratio de présents requis parmi les convoqués requis, entre 0 et 1. */
  readonly requiredRatio?: number;
  /** Nombre minimal de présents requis, en absolu. */
  readonly minimumPresent?: number;
};

export type QuorumResult = {
  readonly requiredCount: number;
  readonly presentCount: number;
  readonly ratio: number;
  /** `null` si aucune règle n'est définie : le quorum n'est alors pas bloquant. */
  readonly isMet: boolean | null;
};

const PRESENT_STATUSES: readonly MeetingAttendanceStatus[] = ['PRESENT'];

/**
 * Interprète une règle de quorum stockée en JSON.
 * Toute valeur absente ou hors bornes est ignorée plutôt que de faire échouer
 * la finalisation d'une réunion.
 */
export function parseQuorumRule(raw: unknown): QuorumRule | null {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }
  const source = raw as Record<string, unknown>;
  const rule: { requiredRatio?: number; minimumPresent?: number } = {};

  const ratio = source.requiredRatio;
  if (typeof ratio === 'number' && ratio > 0 && ratio <= 1) {
    rule.requiredRatio = ratio;
  }
  const minimum = source.minimumPresent;
  if (typeof minimum === 'number' && Number.isInteger(minimum) && minimum > 0) {
    rule.minimumPresent = minimum;
  }
  return rule.requiredRatio === undefined && rule.minimumPresent === undefined
    ? null
    : rule;
}

/**
 * Calcule le quorum.
 *
 * Sans règle, `isMet` vaut `null` : on expose les compteurs pour l'affichage
 * mais on ne bloque jamais la finalisation.
 */
export function computeQuorum(
  attendees: readonly QuorumAttendee[],
  rule: QuorumRule | null,
): QuorumResult {
  // Un délégué ne compte pas comme convoqué : sa présence est portée par la
  // ligne du convoqué qu'il représente.
  const counted = attendees.filter(
    (attendee) => attendee.delegateOfAttendeeId === null,
  );
  const required = counted.filter((attendee) => attendee.isRequired);

  const delegatedPresence = new Set(
    attendees
      .filter(
        (attendee) =>
          attendee.delegateOfAttendeeId !== null &&
          PRESENT_STATUSES.includes(attendee.attendanceStatus),
      )
      .map((attendee) => attendee.delegateOfAttendeeId as string),
  );

  const presentCount = required.filter(
    (attendee) =>
      PRESENT_STATUSES.includes(attendee.attendanceStatus) ||
      delegatedPresence.has(attendee.id),
  ).length;

  const requiredCount = required.length;
  const ratio = requiredCount === 0 ? 1 : presentCount / requiredCount;

  if (rule === null) {
    return { requiredCount, presentCount, ratio, isMet: null };
  }

  const ratioOk =
    rule.requiredRatio === undefined || ratio >= rule.requiredRatio;
  const minimumOk =
    rule.minimumPresent === undefined || presentCount >= rule.minimumPresent;

  return { requiredCount, presentCount, ratio, isMet: ratioOk && minimumOk };
}
