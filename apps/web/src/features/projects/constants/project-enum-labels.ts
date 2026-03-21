/** Projet structuré vs activité de suivi (champ `kind`). */
export const PROJECT_KIND_LABEL: Record<string, string> = {
  PROJECT: 'Projet',
  ACTIVITY: 'Activité',
};

export const PROJECT_TYPE_LABEL: Record<string, string> = {
  TRANSFORMATION: 'Transformation',
  INFRASTRUCTURE: 'Infrastructure',
  APPLICATION: 'Application',
  CYBERSECURITY: 'Cybersécurité',
  COMPLIANCE: 'Conformité',
  ORGANIZATION: 'Organisation',
  PROCUREMENT: 'Achats',
  GOVERNANCE: 'Gouvernance',
};

export const PROJECT_STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Brouillon',
  PLANNED: 'Planifié',
  IN_PROGRESS: 'En cours',
  ON_HOLD: 'En pause',
  COMPLETED: 'Terminé',
  CANCELLED: 'Annulé',
  ARCHIVED: 'Archivé',
};

export const PROJECT_PRIORITY_LABEL: Record<string, string> = {
  LOW: 'Basse',
  MEDIUM: 'Moyenne',
  HIGH: 'Haute',
};

export const PROJECT_CRITICALITY_LABEL: Record<string, string> = {
  LOW: 'Faible',
  MEDIUM: 'Moyenne',
  HIGH: 'Haute',
};

export const TASK_STATUS_LABEL: Record<string, string> = {
  TODO: 'À faire',
  IN_PROGRESS: 'En cours',
  BLOCKED: 'Bloquée',
  DONE: 'Terminée',
  CANCELLED: 'Annulée',
};

export const RISK_STATUS_LABEL: Record<string, string> = {
  OPEN: 'Ouvert',
  MITIGATED: 'Atténué',
  CLOSED: 'Clôturé',
  ACCEPTED: 'Accepté',
};

export const MILESTONE_STATUS_LABEL: Record<string, string> = {
  PLANNED: 'Planifié',
  REACHED: 'Atteint',
  DELAYED: 'En retard',
  CANCELLED: 'Annulé',
};

export const COMPUTED_HEALTH_LABEL: Record<string, string> = {
  GREEN: 'Sain',
  ORANGE: 'Attention',
  RED: 'Critique',
};

export const WARNING_CODE_LABEL: Record<string, string> = {
  NO_OWNER: 'Pas de responsable',
  NO_TASKS: 'Aucune tâche',
  NO_RISKS: 'Aucun risque',
  NO_MILESTONES: 'Aucun jalon',
  PLANNING_DRIFT: 'Dérive planning',
  BLOCKED: 'Bloqué',
};
