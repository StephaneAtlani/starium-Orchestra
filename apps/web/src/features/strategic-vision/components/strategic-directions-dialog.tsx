'use client';

import { Signpost } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormDialogShell } from '@/components/layout/form-dialog-shell';
import type { StrategicDirectionDto } from '../types/strategic-vision.types';
import { StrategicDirectionsTab } from './strategic-directions-tab';

export function StrategicDirectionsDialog({
  open,
  onOpenChange,
  directions,
  directionsQueryState,
  canManageDirections,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  directions: StrategicDirectionDto[];
  directionsQueryState: { isLoading: boolean; isError: boolean };
  canManageDirections: boolean;
}) {
  return (
    <FormDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Référentiel directions"
      description="Directions porteuses pour objectifs et stratégies de direction."
      icon={Signpost}
      size="xl"
      contentClassName="sm:max-w-4xl"
      bodyClassName="px-0.5"
      footer={
        <Button
          type="button"
          variant="outline"
          className="min-h-11 sm:min-h-9"
          onClick={() => onOpenChange(false)}
        >
          Fermer
        </Button>
      }
    >
      <StrategicDirectionsTab
        directions={directions}
        directionsQueryState={directionsQueryState}
        canManageDirections={canManageDirections}
        embedded
      />
    </FormDialogShell>
  );
}
