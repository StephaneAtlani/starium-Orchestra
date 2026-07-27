/**
 * RFC-MEET-001 §4.10 — codes d'erreur métier du module Réunions.
 *
 * Ils sont renvoyés tels quels dans le corps de la réponse HTTP afin que le
 * frontend puisse afficher un message dédié sans parser de texte libre.
 */
export const MEETING_ERROR_CODES = {
  /** Transition de cycle de vie interdite depuis le statut courant. */
  INVALID_TRANSITION: 'MEETING_INVALID_TRANSITION',
  /** `schedule` appelé sans date de séance. */
  SCHEDULE_REQUIRES_DATE: 'MEETING_SCHEDULE_REQUIRES_DATE',
  /** Modèle de portée PROJECT planifié sans aucun projet inscrit. */
  SCOPE_REQUIRES_PROJECT: 'MEETING_SCOPE_REQUIRES_PROJECT',
  /** Compte rendu ou export demandé sur une réunion non finalisée. */
  NOT_FINALIZED: 'MEETING_NOT_FINALIZED',
  /** Tentative de modification ou suppression d'un modèle système. */
  TEMPLATE_SYSTEM_READONLY: 'MEETING_TEMPLATE_SYSTEM_READONLY',
  /** Tentative de bascule PROJECT ↔ PORTFOLIO sur un modèle existant. */
  TEMPLATE_SCOPE_IMMUTABLE: 'MEETING_TEMPLATE_SCOPE_IMMUTABLE',
  /** `code` de modèle déjà utilisé pour ce client. */
  TEMPLATE_CODE_TAKEN: 'MEETING_TEMPLATE_CODE_TAKEN',
  /** Champs incohérents avec la portée de la décision (§4.7). */
  DECISION_SCOPE_MISMATCH: 'MEETING_DECISION_SCOPE_MISMATCH',
  /** Candidat déjà promu en point bloquant. */
  BLOCKER_CANDIDATE_ALREADY_PROMOTED:
    'MEETING_BLOCKER_CANDIDATE_ALREADY_PROMOTED',
  /** Projet déjà inscrit au périmètre de la réunion. */
  PROJECT_ALREADY_IN_SCOPE: 'MEETING_PROJECT_ALREADY_IN_SCOPE',
  /** Périmètre au-delà du garde-fou de volumétrie (§8-4). */
  TOO_MANY_PROJECTS: 'MEETING_TOO_MANY_PROJECTS',
} as const;

export type MeetingErrorCode =
  (typeof MEETING_ERROR_CODES)[keyof typeof MEETING_ERROR_CODES];

/**
 * Garde-fou de volumétrie du périmètre d'une réunion (RFC-MEET-001 §8-4).
 * Le deck agrège une vue par projet : le coût est linéaire en nombre de projets.
 */
export const MEETING_MAX_PROJECTS = 30;
