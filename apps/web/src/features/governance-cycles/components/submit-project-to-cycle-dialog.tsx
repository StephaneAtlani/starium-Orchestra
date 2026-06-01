'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

export function SubmitProjectToCycleDialog({
  projectId,
}: {
  projectId: string;
}) {
  const [open, setOpen] = useState(false);
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
      setOpen(false);
    } catch (e) {
      toast.error(getApiErrorMessage(e));
    }
  }

  return (
    <PermissionGate permission="governance_cycles.propose">
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        Soumettre au cycle de pilotage
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Soumettre au cycle de pilotage</DialogTitle>
            <DialogDescription>
              Le projet sera inscrit comme candidat au programme choisi (pas encore décidé en
              séance).
            </DialogDescription>
          </DialogHeader>
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={submitMutation.isPending}>
              Soumettre
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PermissionGate>
  );
}
