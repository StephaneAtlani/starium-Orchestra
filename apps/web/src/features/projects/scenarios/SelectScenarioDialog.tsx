'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { SelectProjectScenarioPayload } from '../types/project.types';

type SelectScenarioDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scenarioName: string;
  disabled: boolean;
  onSubmit: (payload: SelectProjectScenarioPayload) => Promise<void>;
};

export function SelectScenarioDialog({
  open,
  onOpenChange,
  scenarioName,
  disabled,
  onSubmit,
}: SelectScenarioDialogProps) {
  const [mode, setMode] = useState<'simple' | 'transition'>('simple');
  const [targetProjectStatus, setTargetProjectStatus] = useState<'PLANNED' | 'IN_PROGRESS'>('PLANNED');
  const [decisionNote, setDecisionNote] = useState('');
  const [archiveOtherScenarios, setArchiveOtherScenarios] = useState(true);
  const [syncBudget, setSyncBudget] = useState(true);
  const [syncResources, setSyncResources] = useState(true);
  const [syncPlanning, setSyncPlanning] = useState(true);
  const [syncCapacity, setSyncCapacity] = useState(true);
  const [syncRisks, setSyncRisks] = useState(true);

  useEffect(() => {
    if (!open) return;
    setSyncBudget(true);
    setSyncResources(true);
    setSyncPlanning(true);
    setSyncCapacity(true);
    setSyncRisks(true);
  }, [open]);

  const payload = useMemo<SelectProjectScenarioPayload>(() => {
    const sync = {
      syncBudget,
      syncResources,
      syncPlanning,
      syncCapacity,
      syncRisks,
    };
    if (mode === 'simple') return sync;
    return {
      targetProjectStatus,
      decisionNote: decisionNote.trim() || undefined,
      archiveOtherScenarios,
      ...sync,
    };
  }, [
    mode,
    targetProjectStatus,
    decisionNote,
    archiveOtherScenarios,
    syncBudget,
    syncResources,
    syncPlanning,
    syncCapacity,
    syncRisks,
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sélectionner la baseline</DialogTitle>
          <DialogDescription>
            {scenarioName} devient le scénario de référence.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-1">
          <div className="grid gap-2 rounded-lg border border-border/60 bg-muted/20 p-3">
            <p className="text-xs font-medium text-foreground">Intégrer au projet (sélection baseline)</p>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Coche les dimensions à synchroniser vers la fiche / référentiels projet. Tu peux par
              exemple ne prendre que le budget et les ressources.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={syncBudget}
                  disabled={disabled}
                  onChange={(e) => setSyncBudget(e.target.checked)}
                />
                Budget (lignes de projection)
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={syncResources}
                  disabled={disabled}
                  onChange={(e) => setSyncResources(e.target.checked)}
                />
                Ressources (plans de charge)
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={syncPlanning}
                  disabled={disabled}
                  onChange={(e) => setSyncPlanning(e.target.checked)}
                />
                Planning (tâches / jalons)
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={syncCapacity}
                  disabled={disabled}
                  onChange={(e) => setSyncCapacity(e.target.checked)}
                />
                Capacité
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm sm:col-span-2">
                <input
                  type="checkbox"
                  checked={syncRisks}
                  disabled={disabled}
                  onChange={(e) => setSyncRisks(e.target.checked)}
                />
                Risques
              </label>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Mode</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={mode === 'simple' ? 'default' : 'outline'}
                size="sm"
                disabled={disabled}
                onClick={() => setMode('simple')}
              >
                Sélection simple
              </Button>
              <Button
                type="button"
                variant={mode === 'transition' ? 'default' : 'outline'}
                size="sm"
                disabled={disabled}
                onClick={() => setMode('transition')}
              >
                Sélection + transition
              </Button>
            </div>
          </div>

          {mode === 'transition' ? (
            <>
              <div className="grid gap-1.5">
                <Label htmlFor="target-status">Statut projet cible</Label>
                <select
                  id="target-status"
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                  value={targetProjectStatus}
                  disabled={disabled}
                  onChange={(e) =>
                    setTargetProjectStatus(e.target.value as 'PLANNED' | 'IN_PROGRESS')
                  }
                >
                  <option value="PLANNED">PLANNED</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="decision-note">Note de décision (optionnel)</Label>
                <Input
                  id="decision-note"
                  value={decisionNote}
                  disabled={disabled}
                  onChange={(e) => setDecisionNote(e.target.value)}
                  placeholder="Motif d’arbitrage"
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={archiveOtherScenarios}
                  disabled={disabled}
                  onChange={(e) => setArchiveOtherScenarios(e.target.checked)}
                />
                Archiver les autres scénarios
              </label>
            </>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" disabled={disabled} onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            type="button"
            disabled={disabled}
            onClick={async () => {
              await onSubmit(payload);
              onOpenChange(false);
            }}
          >
            Confirmer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
