import type { GovernanceCycleStatus } from '../types/governance-cycle.types';

export type CycleWorkflowActionId =
  | 'add_item'
  | 'edit'
  | 'validate'
  | 'close'
  | 'reopen_execution'
  | 'reopen_arbitration'
  | 'prepare'
  | 'draft'
  | 'archive'
  | 'restore';

export type CycleWorkflowAction = {
  id: CycleWorkflowActionId;
  label: string;
  description?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'destructive';
  /** PATCH status (hors archive / restore) */
  targetStatus?: GovernanceCycleStatus;
  requiresDeletePermission?: boolean;
};

const WORKFLOW_BY_STATUS: Record<GovernanceCycleStatus, CycleWorkflowAction[]> = {
  ARCHIVED: [
    {
      id: 'restore',
      label: 'Désarchiver',
      description: 'Réactive le cycle avec son statut d’avant archivage',
      variant: 'default',
    },
  ],
  DRAFT: [
    { id: 'prepare', label: 'Mettre en préparation', targetStatus: 'PREPARING', variant: 'outline' },
    { id: 'validate', label: 'Valider pour arbitrage', targetStatus: 'TO_ARBITRATE', variant: 'default' },
    { id: 'archive', label: 'Archiver', variant: 'destructive', requiresDeletePermission: true },
  ],
  PREPARING: [
    { id: 'draft', label: 'Repasser en brouillon', targetStatus: 'DRAFT', variant: 'outline' },
    { id: 'validate', label: 'Valider pour arbitrage', targetStatus: 'TO_ARBITRATE', variant: 'default' },
    { id: 'archive', label: 'Archiver', variant: 'destructive', requiresDeletePermission: true },
  ],
  TO_ARBITRATE: [
    { id: 'prepare', label: 'Repasser en préparation', targetStatus: 'PREPARING', variant: 'outline' },
    { id: 'close', label: 'Clôturer le cycle', targetStatus: 'CLOSED', variant: 'default' },
    { id: 'archive', label: 'Archiver', variant: 'destructive', requiresDeletePermission: true },
  ],
  ARBITRATED: [
    { id: 'reopen_arbitration', label: 'Rouvrir l’arbitrage', targetStatus: 'TO_ARBITRATE', variant: 'outline' },
    { id: 'close', label: 'Clôturer le cycle', targetStatus: 'CLOSED', variant: 'default' },
    { id: 'archive', label: 'Archiver', variant: 'destructive', requiresDeletePermission: true },
  ],
  IN_EXECUTION: [
    { id: 'close', label: 'Clôturer le cycle', targetStatus: 'CLOSED', variant: 'default' },
    { id: 'archive', label: 'Archiver', variant: 'destructive', requiresDeletePermission: true },
  ],
  CLOSED: [
    { id: 'reopen_execution', label: 'Rouvrir (exécution)', targetStatus: 'IN_EXECUTION', variant: 'default' },
    {
      id: 'reopen_arbitration',
      label: 'Rouvrir (arbitrage)',
      targetStatus: 'TO_ARBITRATE',
      variant: 'outline',
    },
    { id: 'archive', label: 'Archiver', variant: 'destructive', requiresDeletePermission: true },
  ],
};

export function getCycleWorkflowActions(
  status: GovernanceCycleStatus,
): CycleWorkflowAction[] {
  return WORKFLOW_BY_STATUS[status] ?? [];
}

export function canEditCycleContent(status: GovernanceCycleStatus): boolean {
  return status !== 'ARCHIVED';
}

export function getWorkflowSuccessMessage(
  action: CycleWorkflowAction,
): string {
  switch (action.id) {
    case 'validate':
      return 'Cycle validé pour arbitrage';
    case 'close':
      return 'Cycle clôturé';
    case 'restore':
      return 'Cycle désarchivé';
    case 'archive':
      return 'Cycle archivé';
    case 'reopen_execution':
      return 'Cycle rouvert en exécution';
    case 'reopen_arbitration':
      return 'Cycle rouvert pour arbitrage';
    default:
      return 'Statut du cycle mis à jour';
  }
}
