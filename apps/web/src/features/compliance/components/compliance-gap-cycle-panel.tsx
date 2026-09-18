'use client';

import { useState } from 'react';
import { CheckCircle2, RotateCcw, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EmptyState } from '@/components/feedback/empty-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { displayLabel } from '@/lib/display-label';
import { cn } from '@/lib/utils';
import type { ComplianceGapApi } from '../api/compliance.api';
import {
  canCloseOrRejectGap,
  canSubmitGapToVerify,
  complianceGapStatusLabel,
  isGapTerminal,
} from '../lib/compliance-gap-status';

export function ComplianceGapCyclePanel({
  gaps,
  loading,
  error,
  onRetry,
  canUpdate,
  pendingGapId,
  onSubmitVerify,
  onClose,
  onRejectIneffective,
}: {
  gaps: ComplianceGapApi[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  canUpdate: boolean;
  pendingGapId: string | null;
  onSubmitVerify: (gapId: string) => void;
  onClose: (gapId: string, verificationNote: string) => void;
  onRejectIneffective: (gapId: string) => void;
}) {
  const [notes, setNotes] = useState<Record<string, string>>({});

  return (
    <section
      className="rounded-[var(--radius-md)] border border-border/70 bg-card p-3.5"
      aria-labelledby="comp-gap-cycle-heading"
    >
      <h3
        id="comp-gap-cycle-heading"
        className="starium-modal-seg-title mb-3"
      >
        Écarts
      </h3>

      {loading ? <LoadingState rows={2} /> : null}

      {!loading && error ? (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-wrap items-center gap-2">
            <span>{error}</span>
            <Button
              type="button"
              variant="outline"
              className="min-h-11 sm:min-h-9"
              onClick={onRetry}
            >
              Réessayer
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {!loading && !error && gaps.length === 0 ? (
        <EmptyState
          title="Aucun écart"
          description="Les écarts créés pour cette exigence apparaîtront ici."
        />
      ) : null}

      {!loading && !error && gaps.length > 0 ? (
        <ul className="flex flex-col gap-3" aria-live="polite">
          {gaps.map((gap) => {
            const note = notes[gap.id] ?? '';
            const pending = pendingGapId === gap.id;
            const statusLabel = complianceGapStatusLabel(gap.status);
            const owner = gap.ownerLabel
              ? displayLabel(gap.ownerLabel, 'Responsable')
              : null;
            const due =
              gap.dueAt != null
                ? new Date(gap.dueAt).toLocaleDateString('fr-FR')
                : null;

            return (
              <li
                key={gap.id}
                className="rounded-[var(--radius-md)] border border-border/70 bg-muted/20 p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-foreground">
                      {displayLabel(gap.title, 'Écart')}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {displayLabel(gap.finding, 'Constat non renseigné')}
                    </p>
                    <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-muted-foreground">
                      <span
                        className={cn(
                          'rounded-[var(--radius-pill)] px-2 py-0.5 text-[11px] font-semibold',
                          gap.status === 'CLOSED'
                            ? 'bg-[color:var(--state-success-bg)] text-[color:var(--state-success)]'
                            : gap.status === 'TO_VERIFY'
                              ? 'bg-[color:var(--brand-gold-050)] text-[color:var(--brand-gold-700)]'
                              : gap.status === 'CANCELLED'
                                ? 'bg-muted text-muted-foreground'
                                : 'bg-[color:var(--state-danger-bg)] text-[color:var(--state-danger)]',
                        )}
                      >
                        {statusLabel}
                      </span>
                      {owner ? <span>· {owner}</span> : null}
                      {due ? <span>· Échéance {due}</span> : null}
                    </p>
                    {gap.verificationNote ? (
                      <p className="mt-2 text-xs text-foreground">
                        <span className="font-semibold">Vérification : </span>
                        {displayLabel(gap.verificationNote, 'Note')}
                      </p>
                    ) : null}
                    {gap.cancelReason ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        <span className="font-semibold">Motif : </span>
                        {displayLabel(gap.cancelReason, 'Motif')}
                      </p>
                    ) : null}
                  </div>
                </div>

                {canUpdate && canSubmitGapToVerify(gap.status) ? (
                  <div className="mt-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-11 gap-2 sm:min-h-9"
                      disabled={pending}
                      onClick={() => onSubmitVerify(gap.id)}
                    >
                      <Send className="size-3.5" aria-hidden />
                      {pending ? 'Envoi…' : 'Soumettre à vérification'}
                    </Button>
                  </div>
                ) : null}

                {canUpdate && canCloseOrRejectGap(gap.status) ? (
                  <div className="mt-3 space-y-2">
                    <div className="space-y-1.5">
                      <Label htmlFor={`gap-verify-note-${gap.id}`}>
                        Note de vérification{' '}
                        <span className="text-destructive" aria-hidden>
                          *
                        </span>
                      </Label>
                      <Textarea
                        id={`gap-verify-note-${gap.id}`}
                        value={note}
                        onChange={(e) =>
                          setNotes((prev) => ({
                            ...prev,
                            [gap.id]: e.target.value,
                          }))
                        }
                        rows={2}
                        className="min-h-0 bg-card"
                        aria-required
                        aria-invalid={note.trim().length < 3}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        className="min-h-11 gap-2 sm:min-h-9"
                        disabled={pending || note.trim().length < 3}
                        onClick={() => onClose(gap.id, note.trim())}
                      >
                        <CheckCircle2 className="size-3.5" aria-hidden />
                        {pending ? 'Clôture…' : 'Clôturer'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-11 gap-2 sm:min-h-9"
                        disabled={pending}
                        onClick={() => onRejectIneffective(gap.id)}
                      >
                        <RotateCcw className="size-3.5" aria-hidden />
                        Non efficace
                      </Button>
                    </div>
                  </div>
                ) : null}

                {isGapTerminal(gap.status) ? (
                  <p className="mt-2 text-[11.5px] text-muted-foreground">
                    Écart en lecture seule.
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
