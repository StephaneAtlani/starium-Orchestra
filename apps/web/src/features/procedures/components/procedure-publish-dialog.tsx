'use client';

import { useEffect, useState } from 'react';
import { Upload } from 'lucide-react';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { previewNextProcedureVersionLabel } from '../lib/procedure-version-label';
import type { ProcedureBumpType } from '../types/procedure.types';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Null = première publish → v1.0 forcé. */
  currentPublished: { versionMajor: number; versionMinor: number } | null;
  submitting?: boolean;
  onConfirm: (input: {
    bumpType?: ProcedureBumpType;
    changeSummary?: string;
  }) => void;
};

export function ProcedurePublishDialog({
  open,
  onOpenChange,
  currentPublished,
  submitting,
  onConfirm,
}: Props) {
  const isFirst = currentPublished == null;
  const [bumpType, setBumpType] = useState<ProcedureBumpType>('MINOR');
  const [summary, setSummary] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setBumpType('MINOR');
    setSummary('');
    setError(null);
  }, [open]);

  const preview = isFirst
    ? 'v1.0'
    : previewNextProcedureVersionLabel(currentPublished, bumpType);

  const handleSubmit = () => {
    if (!isFirst && bumpType === 'MAJOR' && !summary.trim()) {
      setError('Indiquez un motif pour la version majeure');
      return;
    }
    setError(null);
    onConfirm({
      bumpType: isFirst ? undefined : bumpType,
      changeSummary: summary.trim() || undefined,
    });
  };

  return (
    <StariumModal
      open={open}
      onOpenChange={onOpenChange}
      title="Publier la procédure"
      description="Crée la version officielle à diffuser."
      icon={Upload}
      size="md"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            disabled={submitting}
            onClick={() => onOpenChange(false)}
          >
            Annuler
          </Button>
          <Button
            type="button"
            disabled={submitting}
            aria-busy={submitting}
            onClick={handleSubmit}
          >
            Publier {preview}
          </Button>
        </>
      }
    >
      <div className="starium-form space-y-4">
        {!isFirst ? (
          <div>
            <p className="starium-modal-seg-title mb-2">Type de version</p>
            <div
              className="starium-tab-group flex w-full gap-1"
              role="group"
              aria-label="Type de version"
            >
              <button
                type="button"
                className={cn(
                  'starium-tab-btn min-h-11 flex-1 sm:min-h-9',
                  bumpType === 'MINOR' && 'starium-tab-btn--active',
                )}
                aria-pressed={bumpType === 'MINOR'}
                onClick={() => {
                  setBumpType('MINOR');
                  setError(null);
                }}
              >
                Mineure
              </button>
              <button
                type="button"
                className={cn(
                  'starium-tab-btn min-h-11 flex-1 sm:min-h-9',
                  bumpType === 'MAJOR' && 'starium-tab-btn--active',
                )}
                aria-pressed={bumpType === 'MAJOR'}
                onClick={() => setBumpType('MAJOR')}
              >
                Majeure
              </button>
            </div>
          </div>
        ) : null}

        <p
          className="rounded-[var(--radius-md)] border border-dashed border-border/80 bg-muted/30 px-3.5 py-2.5 text-sm font-semibold tabular-nums"
          aria-live="polite"
        >
          Prochaine version · {preview}
          {!isFirst ? (
            <span className="ml-1 font-medium text-muted-foreground">
              (aperçu)
            </span>
          ) : (
            <span className="ml-1 font-medium text-muted-foreground">
              — première publication
            </span>
          )}
        </p>

        <div>
          <Label htmlFor="proc-publish-summary">
            Commentaire de version
            {!isFirst && bumpType === 'MAJOR' ? (
              <span className="text-[var(--state-danger)]"> (obligatoire)</span>
            ) : (
              <span className="font-medium text-muted-foreground">
                {' '}
                (optionnel)
              </span>
            )}
          </Label>
          <Textarea
            id="proc-publish-summary"
            className="mt-1.5 min-h-[88px]"
            value={summary}
            onChange={(e) => {
              setSummary(e.target.value);
              if (error) setError(null);
            }}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'proc-publish-summary-err' : undefined}
            placeholder="Ex. mise à jour des seuils COPIL"
          />
          {error ? (
            <p
              id="proc-publish-summary-err"
              className="mt-1.5 text-xs font-semibold text-[var(--state-danger)]"
              role="alert"
            >
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </StariumModal>
  );
}
