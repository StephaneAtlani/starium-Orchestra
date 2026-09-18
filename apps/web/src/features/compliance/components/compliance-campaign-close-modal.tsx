'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Archive } from 'lucide-react';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { toast } from '@/lib/toast';
import { displayLabel } from '@/lib/display-label';
import { closeComplianceCampaign } from '../api/compliance.api';

export function ComplianceCampaignCloseModal({
  open,
  onOpenChange,
  campaignId,
  campaignName,
  onClosed,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  campaignName: string;
  onClosed: () => void;
}) {
  const authFetch = useAuthenticatedFetch();
  const [note, setNote] = useState('');

  const closeMut = useMutation({
    mutationFn: () =>
      closeComplianceCampaign(authFetch, campaignId, {
        closeNote: note.trim() || undefined,
        createSnapshot: true,
      }),
    onSuccess: (camp) => {
      toast.success(
        `Revue clôturée — ${displayLabel(camp.name, 'Campagne')}`,
      );
      setNote('');
      onOpenChange(false);
      onClosed();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <StariumModal
      open={open}
      onOpenChange={(next) => {
        if (!next) setNote('');
        onOpenChange(next);
      }}
      title="Clôturer la revue"
      description={`Instantané de clôture pour « ${displayLabel(campaignName, 'Campagne')} ».`}
      icon={Archive}
      size="md"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 sm:min-h-9"
            onClick={() => onOpenChange(false)}
          >
            Annuler
          </Button>
          <Button
            type="button"
            className="min-h-11 sm:min-h-9"
            disabled={closeMut.isPending}
            onClick={() => closeMut.mutate()}
          >
            Clôturer
          </Button>
        </>
      }
    >
      <div className="starium-form space-y-3">
        <p className="text-sm text-muted-foreground">
          La clôture fige un instantané et empêche de rouvrir cette campagne.
          Les évaluations du référentiel restent modifiables hors revue.
        </p>
        <div className="space-y-1.5">
          <Label htmlFor="camp-close-note">Note de clôture (optionnel)</Label>
          <Textarea
            id="camp-close-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Ex. : revue annuelle clôturée, 2 écarts reportés"
          />
        </div>
      </div>
    </StariumModal>
  );
}
