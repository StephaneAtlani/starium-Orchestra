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

export const TASK_PRIORITY_LABEL: Record<string, string> = {
  LOW: 'Basse',
  MEDIUM: 'Moyenne',
  HIGH: 'Haute',
  CRITICAL: 'Critique',
};

export const TASK_STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Brouillon',
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
  ACHIEVED: 'Atteint',
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

/** RFC-PROJ-013 */
export const PROJECT_REVIEW_TYPE_LABEL: Record<string, string> = {
  COPIL: 'Revue COPIL',
  COPRO: 'Revue COPRO',
  CODIR_REVIEW: 'Revue CODIR',
  RISK_REVIEW: 'Revue risques',
  MILESTONE_REVIEW: 'Revue jalons',
  AD_HOC: 'Ad hoc',
};

export const PROJECT_REVIEW_STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Brouillon',
  FINALIZED: 'Finalisé',
  CANCELLED: 'Annulé',
};

/** Aligné fiche projet — statuts d’arbitrage par niveau (lecture seule dans l’éditeur de point). */
export const ARBITRATION_LEVEL_STATUS_LABEL: Record<string, string> = {
  BROUILLON: 'Proposition de projet',
  EN_COURS: 'En préparation',
  SOUMIS_VALIDATION: 'Soumis à validation',
  VALIDE: 'Validé',
  REFUSE: 'Refusé',
};
