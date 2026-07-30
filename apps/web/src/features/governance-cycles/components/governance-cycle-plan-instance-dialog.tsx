'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { CalendarClock } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { cn } from '@/lib/utils';
import { getCycleShortLabel, isActiveGovernanceCycle } from '../lib/governance-cycles-cockpit-data';
import { getGovernanceCycleCadenceLabel } from '../lib/governance-cycle-labels';
import type { GovernanceCycleResponseDto } from '../types/governance-cycle.types';
import { Button } from '@/components/ui/button';

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
    <StariumModal
      open={open}
      onOpenChange={onOpenChange}
      title="Planifier une instance"
      description="Choisissez le cycle de pilotage dans lequel créer une séance de décision."
      icon={CalendarClock}
      size="md"
    >
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
              <Link
                href={`/cycles/${cycle.id}`}
                onClick={() => onOpenChange(false)}
                className={cn(
                  buttonVariants({ variant: 'outline' }),
                  'h-auto min-h-11 w-full justify-start px-3 py-3 text-left',
                )}
              >
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-medium text-foreground">
                    {getCycleShortLabel(cycle)} — {cycle.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {getGovernanceCycleCadenceLabel(cycle.cadence)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </StariumModal>
  );
}
