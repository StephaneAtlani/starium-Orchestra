'use client';

import { useEffect, useMemo, useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { displayLabel } from '@/lib/display-label';
import { toast } from '@/lib/toast';
import { useProjectReviewMutations } from '../hooks/use-project-review-mutations';
import { PROJECT_REVIEW_TYPE_BADGE } from '../constants/project-enum-labels';
import type { ProjectReviewDetail } from '../types/project.types';

export type ProjectReviewConvocationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  detail: ProjectReviewDetail;
  /** datetime ISO already resolved for schedule if PREPARING */
  scheduleReviewDateIso: string | null;
  onSent?: () => void;
};

/**
 * Coquille CDC 04 (P2) — destinataires + envoi.
 * Aperçu 2 volets / options / .ics → P3.
 */
export function ProjectReviewConvocationDialog({
  open,
  onOpenChange,
  projectId,
  detail,
  scheduleReviewDateIso,
  onSent,
}: ProjectReviewConvocationDialogProps) {
  const { scheduleReview, lockAgenda, inviteReview } =
    useProjectReviewMutations(projectId);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const participants = detail.participants ?? [];

  useEffect(() => {
    if (!open) return;
    setSelectedIds(participants.map((p) => p.id));
    setError(null);
    setSubmitting(false);
  }, [open, detail.id]); // eslint-disable-line react-hooks/exhaustive-deps -- reset on open

  const badge = PROJECT_REVIEW_TYPE_BADGE[detail.reviewType] ?? 'Point';
  const subtitle = useMemo(() => {
    const title = displayLabel(detail.title, badge);
    const when = detail.reviewDate
      ? new Date(detail.reviewDate).toLocaleString('fr-FR', {
          day: 'numeric',
          month: 'long',
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'Date à définir';
    const place = detail.location?.trim() || 'Lieu à préciser';
    return `${title} · ${when} · ${place}`;
  }, [detail, badge]);

  const canSend = selectedIds.length > 0 && !submitting;

  const toggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const onSubmit = async () => {
    if (!canSend) {
      setError('Cochez au moins un destinataire.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (detail.status === 'PREPARING') {
        const iso = scheduleReviewDateIso ?? detail.reviewDate;
        if (!iso) {
          setError(
            'Renseignez la date de séance avant d’envoyer les convocations.',
          );
          setSubmitting(false);
          return;
        }
        await scheduleReview.mutateAsync({
          reviewId: detail.id,
          reviewDate: iso,
        });
      }
      if (!detail.agendaLockedAt) {
        await lockAgenda.mutateAsync(detail.id);
      }
      const result = await inviteReview.mutateAsync({
        reviewId: detail.id,
        body: { channels: ['in_app', 'email'] },
      });
      const count = Math.max(
        result.emailed ?? 0,
        result.notifiedInApp ?? 0,
        selectedIds.length,
      );
      toast.success(
        `${count} convocation${count > 1 ? 's' : ''} envoyée${count > 1 ? 's' : ''}.`,
      );
      onOpenChange(false);
      onSent?.();
    } catch (err) {
      setError(
        (err as { message?: string })?.message ??
          'Envoi des convocations impossible.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <StariumModal
      open={open}
      onOpenChange={(next) => {
        if (submitting) return;
        onOpenChange(next);
      }}
      title="Envoyer les convocations"
      description={subtitle}
      icon={Send}
      size="lg"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 sm:min-h-9"
            disabled={submitting}
            onClick={() => onOpenChange(false)}
          >
            Annuler
          </Button>
          <Button
            type="button"
            className="min-h-11 sm:min-h-9"
            disabled={!canSend}
            onClick={() => void onSubmit()}
          >
            {submitting ? 'Envoi…' : 'Envoyer les convocations'}
          </Button>
        </>
      }
    >
      <div className="starium-form flex flex-col gap-4">
        {error ? (
          <Alert variant="destructive" role="alert">
            <AlertTitle>Envoi impossible</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="starium-form-field">
          <span className="starium-form-label" id="convoc-dest-label">
            Destinataires · {selectedIds.length} personne
            {selectedIds.length > 1 ? 's' : ''}
          </span>
          {participants.length === 0 ? (
            <p className="text-sm text-destructive" role="alert">
              Cochez au moins un destinataire.
            </p>
          ) : (
            <ul
              className="flex flex-wrap gap-2"
              aria-labelledby="convoc-dest-label"
            >
              {participants.map((p) => {
                const checked = selectedIds.includes(p.id);
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      aria-pressed={checked}
                      className={
                        checked
                          ? 'min-h-11 rounded-[var(--control-radius)] border border-[color:var(--brand-gold)] bg-[color:var(--brand-gold)]/15 px-3 text-sm font-medium'
                          : 'min-h-11 rounded-[var(--control-radius)] border border-dashed border-border px-3 text-sm text-muted-foreground'
                      }
                      onClick={() => toggle(p.id)}
                    >
                      {displayLabel(p.displayName, 'Participant')}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {selectedIds.length === 0 ? (
            <p className="mt-2 text-xs text-destructive" role="alert">
              Cochez au moins un destinataire.
            </p>
          ) : null}
        </div>

        <p className="text-xs text-muted-foreground">
          L&apos;envoi fige l&apos;ordre du jour et passe le point en « À venir ».
          L&apos;aperçu détaillé (options, .ics) arrivera en phase suivante.
        </p>
      </div>
    </StariumModal>
  );
}
