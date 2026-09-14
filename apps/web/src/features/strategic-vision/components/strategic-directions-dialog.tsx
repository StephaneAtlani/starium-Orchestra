'use client';

import { Signpost } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import type { StrategicDirectionDto } from '../types/strategic-vision.types';
import { StrategicDirectionsTab } from './strategic-directions-tab';

export function StrategicDirectionsDialog({
  open,
  onOpenChange,
  directions,
  directionsQueryState,
  canManageDirections,
  onRetry,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  directions: StrategicDirectionDto[];
  directionsQueryState: { isLoading: boolean; isError: boolean };
  canManageDirections: boolean;
  onRetry?: () => void;
}) {
  return (
    <StariumModal
      open={open}
      onOpenChange={onOpenChange}
      title="Référentiel directions"
      description="Directions porteuses pour objectifs et schémas directeurs."
      icon={Signpost}
      size="xl"
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
        onRetry={onRetry}
      />
    </StariumModal>
  );
}
