'use client';

import { useState } from 'react';
import { SendHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PermissionGate } from '@/components/PermissionGate';
import { toast } from '@/lib/toast';
import {
  getApiErrorMessage,
  useSubmitProjectToCycleMutation,
} from '../api/governance-cycle-instances.queries';
import { useGovernanceCyclesListQuery } from '../api/governance-cycles.queries';
import { formatGovernanceCycleDateRange } from '../lib/governance-cycle-formatters';

type SubmitProjectToCycleDialogContentProps = {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

export function SubmitProjectToCycleDialogContent({
  projectId,
  open,
  onOpenChange,
  onSuccess,
}: SubmitProjectToCycleDialogContentProps) {
  const [cycleId, setCycleId] = useState('');
  const cyclesQuery = useGovernanceCyclesListQuery(
    { limit: 50, offset: 0 },
    { enabled: open },
  );
  const submitMutation = useSubmitProjectToCycleMutation();

  const cycles =
    cyclesQuery.data?.items.filter((c) => c.status !== 'ARCHIVED') ?? [];

  async function handleSubmit() {
    if (!cycleId) {
      toast.error('Choisissez un programme de pilotage');
      return;
    }
    try {
      await submitMutation.mutateAsync({ cycleId, projectId });
      toast.success('Projet soumis au cycle de pilotage');
      setCycleId('');
      onOpenChange(false);
      onSuccess?.();
    } catch (e) {
      toast.error(getApiErrorMessage(e));
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next) setCycleId('');
    onOpenChange(next);
  }

  return (
    <StariumModal
      open={open}
      onOpenChange={handleOpenChange}
      title="Soumettre au cycle de pilotage"
      description="Le projet sera inscrit comme candidat au programme choisi (pas encore décidé en séance)."
      icon={SendHorizontal}
      footer={
        <>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={submitMutation.isPending}>
            Soumettre
          </Button>
        </>
      }
    >
        <Select value={cycleId} onValueChange={(v) => setCycleId(v ?? '')}>
          <SelectTrigger>
            <SelectValue placeholder="Programme de pilotage" />
          </SelectTrigger>
          <SelectContent>
            {cycles.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
                {c.startDate || c.endDate
                  ? ` — ${formatGovernanceCycleDateRange(c.startDate, c.endDate)}`
                  : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
    </StariumModal>
  );
}

export function SubmitProjectToCycleDialog({
  projectId,
  className,
}: {
  projectId: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <PermissionGate permission="governance_cycles.propose">
      <button
        type="button"
        className={cn('starium-btn starium-btn-secondary shrink-0', className)}
        aria-label="Soumettre au cycle de pilotage"
        onClick={() => setOpen(true)}
      >
        <SendHorizontal aria-hidden />
        <span className="hidden sm:inline">Soumettre au cycle</span>
        <span className="sm:hidden">Soumettre</span>
      </button>
      <SubmitProjectToCycleDialogContent
        projectId={projectId}
        open={open}
        onOpenChange={setOpen}
      />
    </PermissionGate>
  );
}
