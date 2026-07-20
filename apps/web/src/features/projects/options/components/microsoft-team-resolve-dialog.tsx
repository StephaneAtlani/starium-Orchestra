'use client';

import { useEffect, useState } from 'react';
import { Cloud } from 'lucide-react';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { Button } from '@/components/ui/button';
import { MicrosoftTeamPicker } from '@/features/microsoft-365/components/microsoft-team-picker';
import { isTeamSelectionAllowedForLockedTeam } from '../lib/microsoft-teams-provisioning.constants';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connectionActive: boolean;
  lockedTeamId?: string | null;
  isSubmitting: boolean;
  onConfirm: (teamId: string) => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
};

export function MicrosoftTeamResolveDialog({
  open,
  onOpenChange,
  connectionActive,
  lockedTeamId,
  isSubmitting,
  onConfirm,
  title = 'Confirmer l’équipe Teams retrouvée',
  description = 'Sélectionnez l’équipe Microsoft créée pour ce projet. Starium mettra à jour le provisioning sans créer de lien manuel séparé.',
  confirmLabel = 'Confirmer cette équipe',
}: Props) {
  const [teamId, setTeamId] = useState('');

  useEffect(() => {
    if (!open) {
      setTeamId('');
      return;
    }
    if (lockedTeamId?.trim()) {
      setTeamId(lockedTeamId.trim());
    }
  }, [open, lockedTeamId]);

  const teamMismatch =
    Boolean(teamId.trim()) &&
    !isTeamSelectionAllowedForLockedTeam(lockedTeamId, teamId);

  return (
    <StariumModal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      icon={Cloud}
      size="md"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Annuler
          </Button>
          <Button
            type="button"
            className="min-h-11"
            disabled={!teamId.trim() || teamMismatch || isSubmitting}
            onClick={() => onConfirm(teamId.trim())}
          >
            {isSubmitting ? 'Confirmation…' : confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <MicrosoftTeamPicker
          enabled={open && connectionActive}
          value={teamId}
          onValueChange={setTeamId}
          id="resolve-unknown-team-picker"
        />
        {teamMismatch ? (
          <p className="text-sm text-destructive" role="alert">
            Cette équipe ne correspond pas à celle attendue pour ce provisioning.
          </p>
        ) : null}
      </div>
    </StariumModal>
  );
}
