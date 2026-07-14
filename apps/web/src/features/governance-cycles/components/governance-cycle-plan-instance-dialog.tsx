'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { getCycleShortLabel, isActiveGovernanceCycle } from '../lib/governance-cycles-cockpit-data';
import { getGovernanceCycleCadenceLabel } from '../lib/governance-cycle-labels';
import type { GovernanceCycleResponseDto } from '../types/governance-cycle.types';

export function GovernanceCyclePlanInstanceDialog({
  open,
  onOpenChange,
  cycles,
  onCreateCycle,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cycles: GovernanceCycleResponseDto[];
  onCreateCycle: () => void;
}) {
  const activeCycles = useMemo(() => cycles.filter(isActiveGovernanceCycle), [cycles]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Planifier une instance</DialogTitle>
          <DialogDescription>
            Choisissez le cycle de pilotage dans lequel créer une séance de décision.
          </DialogDescription>
        </DialogHeader>

        {activeCycles.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Aucun cycle actif. Créez d&apos;abord un cycle de pilotage.
            </p>
            <Button className="min-h-11 w-full" onClick={onCreateCycle}>
              Créer un cycle
            </Button>
          </div>
        ) : (
          <ul className="max-h-72 space-y-2 overflow-y-auto">
            {activeCycles.map((cycle) => (
              <li key={cycle.id}>
                <Button
                  variant="outline"
                  className="h-auto min-h-11 w-full justify-start px-3 py-3 text-left"
                  asChild
                >
                  <Link href={`/cycles/${cycle.id}`} onClick={() => onOpenChange(false)}>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="font-medium text-foreground">
                        {getCycleShortLabel(cycle)} — {cycle.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {getGovernanceCycleCadenceLabel(cycle.cadence)}
                      </span>
                    </span>
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
