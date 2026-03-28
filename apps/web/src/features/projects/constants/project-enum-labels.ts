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

/** Grille probabilité / impact des risques projet (même valeurs que la fiche). */
export const RISK_TIER_LABEL: Record<string, string> = {
  LOW: 'Faible',
  MEDIUM: 'Moyen',
  HIGH: 'Élevé',
};

/** Échelle 1–5 — vraisemblance et gravité d’impact (registre risques / EBIOS). */
export const RISK_PI_SCALE_LABEL: Record<string, string> = {
  '1': '1 — Négligeable',
  '2': '2 — Faible',
  '3': '3 — Moyen',
  '4': '4 — Élevé',
  '5': '5 — Très élevé',
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
  MONITORED: 'Sous surveillance',
  MITIGATED: 'Atténué',
  CLOSED: 'Clôturé',
};

/** Criticité issue du score P×I (registre / fiche risque). */
export const PROJECT_RISK_CRITICALITY_LABEL: Record<string, string> = {
  LOW: 'Faible',
  MEDIUM: 'Moyenne',
  HIGH: 'Haute',
  CRITICAL: 'Critique',
};

/**
 * Stratégies de traitement du risque (ISO 27005 / logique type EBIOS RM).
 * AVOID = supprimer la source, REDUCE = mesures, TRANSFER = assurance/délégation, ACCEPT = assumer.
 */
export const RISK_TREATMENT_STRATEGY_LABEL: Record<string, string> = {
  AVOID: 'Éviter',
  REDUCE: 'Réduire',
  TRANSFER: 'Transférer',
  ACCEPT: 'Accepter',
};

/** RFC-PROJ-018 — catégorie d’impact métier. */
export const PROJECT_RISK_IMPACT_CATEGORY_LABEL: Record<string, string> = {
  FINANCIAL: 'Financier',
  OPERATIONAL: 'Opérationnel',
  LEGAL: 'Juridique',
  REPUTATION: 'Réputation',
};

export const MILESTONE_STATUS_LABEL: Record<string, string> = {
  PLANNED: 'Planifié',
  ACHIEVED: 'Atteint',
  DELAYED: 'En retard',
  CANCELLED: 'Annulé',
};

export const PROJECT_DOCUMENT_STORAGE_TYPE_LABEL: Record<string, string> = {
  STARIUM: 'Starium',
  EXTERNAL: 'Externe',
  MICROSOFT: 'Microsoft (réservé)',
};

export const PROJECT_DOCUMENT_STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Actif',
  ARCHIVED: 'Archivé',
  DELETED: 'Supprimé',
};

export const PROJECT_DOCUMENT_CATEGORY_LABEL: Record<string, string> = {
  GENERAL: 'Général',
  CONTRACT: 'Contrat',
  SPECIFICATION: 'Spécification',
  DELIVERABLE: 'Livrable',
  REPORT: 'Rapport',
  FINANCIAL: 'Financier',
  COMPLIANCE: 'Conformité',
  OTHER: 'Autre',
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
  POST_MORTEM: 'Post-mortem',
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
