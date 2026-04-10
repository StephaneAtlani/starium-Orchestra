import {
  BUDGET_WORKFLOW_STATUS_LABELS,
  type BudgetWorkflowStatus,
} from './budget-workflow-status';

/** Texte d’implications métier par transition (clé `from->to`). */
const IMPLICATIONS: Partial<Record<string, string>> = {
  'DRAFT->SUBMITTED':
    'Le budget est transmis pour instruction : il devient consultable dans le circuit de validation et une version figée « Soumis » peut être créée selon la configuration.',
  'DRAFT->ARCHIVED':
    'Le budget est classé sans avoir été soumis : il ne participe plus au cycle courant (hors cas de réouverture métier).',
  'SUBMITTED->REVISED':
    'Le budget repasse en phase de révision : les montants et le périmètre peuvent être ajustés avant une nouvelle soumission ou validation.',
  'SUBMITTED->VALIDATED':
    'Le budget est validé : il devient la référence opérationnelle pour l’exercice ; une version figée « Validé » peut être créée.',
  'SUBMITTED->DRAFT':
    'Le budget est renvoyé en brouillon : la saisie est rouverte ; le circuit de validation est interrompu jusqu’à une nouvelle soumission.',
  'REVISED->VALIDATED':
    'Après révision, le budget est validé : il devient la référence opérationnelle ; une version figée « Validé » peut être créée.',
  'REVISED->SUBMITTED':
    'La révision est terminée et le budget est à nouveau soumis pour instruction et validation.',
  'REVISED->DRAFT':
    'Le budget repasse en brouillon depuis l’état révisé : la saisie est rouverte.',
  'VALIDATED->LOCKED':
    'Le budget validé est verrouillé : les modifications structurelles sont bloquées (sauf procédures prévues).',
  'VALIDATED->REVISED':
    'Une nouvelle révision est ouverte sur un budget déjà validé : attention aux impacts sur l’exécution et les reports.',
  'VALIDATED->SUBMITTED':
    'Le budget repasse à l’état soumis : situation exceptionnelle — vérifier la cohérence avec les engagements déjà pris.',
  'VALIDATED->ARCHIVED':
    'Le budget validé est archivé : il reste en historique mais sort du pilotage courant.',
  'LOCKED->ARCHIVED':
    'Le budget verrouillé est archivé définitivement pour l’historique.',
};

export function getBudgetStatusTransitionImplications(
  from: BudgetWorkflowStatus,
  to: BudgetWorkflowStatus,
): string {
  const key = `${from}->${to}`;
  return (
    IMPLICATIONS[key] ??
    `Le statut du budget passera de « ${BUDGET_WORKFLOW_STATUS_LABELS[from]} » à « ${BUDGET_WORKFLOW_STATUS_LABELS[to]} ».`
  );
}
