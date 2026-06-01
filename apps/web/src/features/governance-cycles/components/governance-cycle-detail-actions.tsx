'use client';

import { Button } from '@/components/ui/button';
import { PermissionGate } from '@/components/PermissionGate';
import { toast } from '@/lib/toast';
import { Archive, ArchiveRestore, Pencil, Plus } from 'lucide-react';
import type { GovernanceCycleResponseDto } from '../types/governance-cycle.types';
import {
  getApiErrorMessage,
  useArchiveGovernanceCycleMutation,
  useRestoreGovernanceCycleMutation,
  useUpdateGovernanceCycleMutation,
} from '../hooks/use-governance-cycles';
import {
  canEditCycleContent,
  getCycleWorkflowActions,
  getWorkflowSuccessMessage,
  type CycleWorkflowAction,
} from '../lib/governance-cycle-workflow';

export function GovernanceCycleDetailActions({
  cycle,
  onEdit,
  onAddItem,
}: {
  cycle: GovernanceCycleResponseDto;
  onEdit: () => void;
  onAddItem: () => void;
}) {
  const updateMutation = useUpdateGovernanceCycleMutation(cycle.id);
  const archiveMutation = useArchiveGovernanceCycleMutation();
  const restoreMutation = useRestoreGovernanceCycleMutation(cycle.id);

  const editable = canEditCycleContent(cycle.status);
  const workflowActions = getCycleWorkflowActions(cycle.status);
  const primaryWorkflow = workflowActions.filter((a) => a.variant === 'default');
  const secondaryWorkflow = workflowActions.filter(
    (a) => a.variant !== 'default' && a.id !== 'archive',
  );
  const archiveAction = workflowActions.find((a) => a.id === 'archive');
  const restoreAction = workflowActions.find((a) => a.id === 'restore');

  async function runWorkflowAction(action: CycleWorkflowAction) {
    if (action.id === 'archive') {
      if (!window.confirm(`Archiver le cycle « ${cycle.name} » ?`)) return;
      try {
        await archiveMutation.mutateAsync(cycle.id);
        toast.success(getWorkflowSuccessMessage(action));
      } catch (error) {
        toast.error(getApiErrorMessage(error));
      }
      return;
    }

    if (action.id === 'restore') {
      try {
        await restoreMutation.mutateAsync();
        toast.success(getWorkflowSuccessMessage(action));
      } catch (error) {
        toast.error(getApiErrorMessage(error));
      }
      return;
    }

    if (!action.targetStatus) return;

    try {
      await updateMutation.mutateAsync({ status: action.targetStatus });
      toast.success(getWorkflowSuccessMessage(action));
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  }

  function renderWorkflowButton(action: CycleWorkflowAction) {
    const button = (
      <Button
        key={action.id}
        type="button"
        size="sm"
        variant={action.variant ?? 'outline'}
        disabled={
          updateMutation.isPending ||
          archiveMutation.isPending ||
          restoreMutation.isPending
        }
        onClick={() => void runWorkflowAction(action)}
      >
        {action.id === 'archive' ? (
          <Archive className="mr-2 h-4 w-4" />
        ) : action.id === 'restore' ? (
          <ArchiveRestore className="mr-2 h-4 w-4" />
        ) : null}
        {action.label}
      </Button>
    );

    if (action.requiresDeletePermission) {
      return (
        <PermissionGate key={action.id} permission="governance_cycles.delete">
          {button}
        </PermissionGate>
      );
    }

    return button;
  }

  if (cycle.status === 'ARCHIVED') {
    return (
      <div className="flex flex-col items-stretch gap-2 sm:items-end">
        <PermissionGate permission="governance_cycles.update">
          {restoreAction ? renderWorkflowButton(restoreAction) : null}
        </PermissionGate>
        <p className="text-xs text-muted-foreground sm:text-right max-w-sm">
          Cycle archivé : consultation seule. Désarchivez pour modifier à nouveau le cycle.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:items-end">
      {editable ? (
        <div className="flex flex-wrap gap-2 justify-end">
          <PermissionGate permission="governance_cycles.create">
            <Button type="button" size="sm" variant="outline" onClick={onAddItem}>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un élément
            </Button>
          </PermissionGate>
          <PermissionGate permission="governance_cycles.update">
            <Button type="button" size="sm" variant="outline" onClick={onEdit}>
              <Pencil className="mr-2 h-4 w-4" />
              Modifier
            </Button>
          </PermissionGate>
        </div>
      ) : null}

      <PermissionGate permission="governance_cycles.update">
        <div className="flex flex-col gap-2 sm:items-end">
          {primaryWorkflow.length > 0 ? (
            <div className="flex flex-wrap gap-2 justify-end">
              {primaryWorkflow.map((action) => renderWorkflowButton(action))}
            </div>
          ) : null}
          {secondaryWorkflow.length > 0 ? (
            <div className="flex flex-wrap gap-2 justify-end">
              {secondaryWorkflow.map((action) => renderWorkflowButton(action))}
            </div>
          ) : null}
          {archiveAction ? (
            <div className="flex flex-wrap gap-2 justify-end border-t border-border/60 pt-2 w-full">
              {renderWorkflowButton(archiveAction)}
            </div>
          ) : null}
        </div>
      </PermissionGate>
    </div>
  );
}
