'use client';

import { useId, useMemo, useState } from 'react';
import { Receipt } from 'lucide-react';
import { StariumModal } from '@/components/layout/form-dialog-shell';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  BudgetEnvelope,
  BudgetLine,
} from '@/features/budgets/types/budget-management.types';

export type BudgetExpenseLaunchKind =
  | 'COMMITMENT_REGISTERED'
  | 'CONSUMPTION_REGISTERED'
  | 'INVOICE';

type BudgetExpenseEntryModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  envelopes: BudgetEnvelope[];
  lines: BudgetLine[];
  onLaunch: (payload: { lineId: string; kind: BudgetExpenseLaunchKind }) => void;
};

const EXPENSE_KIND_OPTIONS: Array<{ value: BudgetExpenseLaunchKind; label: string }> = [
  { value: 'COMMITMENT_REGISTERED', label: 'Engagement' },
  { value: 'CONSUMPTION_REGISTERED', label: 'Consommation' },
  { value: 'INVOICE', label: 'Facture fournisseur' },
];

function formatEnvelopeLabel(envelope: BudgetEnvelope): string {
  return envelope.code ? `${envelope.name} (${envelope.code})` : envelope.name;
}

function formatLineLabel(line: BudgetLine): string {
  return line.code ? `${line.name} (${line.code})` : line.name;
}

export function BudgetExpenseEntryModal({
  open,
  onOpenChange,
  envelopes,
  lines,
  onLaunch,
}: BudgetExpenseEntryModalProps) {
  const envelopeId = useId();
  const lineId = useId();
  const [selectedEnvelopeId, setSelectedEnvelopeId] = useState<string>('');
  const [selectedLineId, setSelectedLineId] = useState<string>('');
  const [selectedKind, setSelectedKind] =
    useState<BudgetExpenseLaunchKind>('COMMITMENT_REGISTERED');

  const sortedEnvelopes = useMemo(
    () =>
      [...envelopes].sort((a, b) =>
        formatEnvelopeLabel(a).localeCompare(formatEnvelopeLabel(b), 'fr-FR'),
      ),
    [envelopes],
  );

  const availableLines = useMemo(() => {
    const filtered = selectedEnvelopeId
      ? lines.filter((line) => line.envelopeId === selectedEnvelopeId)
      : lines;
    return [...filtered].sort((a, b) =>
      formatLineLabel(a).localeCompare(formatLineLabel(b), 'fr-FR'),
    );
  }, [lines, selectedEnvelopeId]);

  const selectedLine = useMemo(
    () => availableLines.find((line) => line.id === selectedLineId) ?? null,
    [availableLines, selectedLineId],
  );
  const selectedEnvelopeLabel = useMemo(() => {
    if (!selectedEnvelopeId) return 'Toutes les enveloppes';
    const selectedEnvelope =
      sortedEnvelopes.find((envelope) => envelope.id === selectedEnvelopeId) ?? null;
    return selectedEnvelope ? formatEnvelopeLabel(selectedEnvelope) : 'Toutes les enveloppes';
  }, [selectedEnvelopeId, sortedEnvelopes]);

  const canLaunch = !!selectedLineId;

  return (
    <StariumModal
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setSelectedEnvelopeId('');
          setSelectedLineId('');
          setSelectedKind('COMMITMENT_REGISTERED');
        }
        onOpenChange(nextOpen);
      }}
      title="Saisir une dépense"
      description="Choisissez la ligne budgétaire puis ouvrez le formulaire adapté : engagement, consommation ou facture."
      icon={Receipt}
      size="lg"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 sm:min-h-9"
            onClick={() => onOpenChange(false)}
          >
            Fermer
          </Button>
          <Button
            type="button"
            className="min-h-11 sm:min-h-9"
            disabled={!canLaunch}
            onClick={() => {
              if (!selectedLineId) return;
              onOpenChange(false);
              onLaunch({ lineId: selectedLineId, kind: selectedKind });
            }}
          >
            Ouvrir le formulaire
          </Button>
        </>
      }
    >
      <div className="starium-form space-y-4">
        <div className="starium-form-field space-y-2">
          <Label htmlFor={envelopeId}>Enveloppe</Label>
          <Select
            value={selectedEnvelopeId || '__all__'}
            onValueChange={(value) => {
              const nextEnvelopeId =
                value == null || value === '__all__' ? '' : value;
              setSelectedEnvelopeId(nextEnvelopeId);
              setSelectedLineId('');
            }}
          >
            <SelectTrigger id={envelopeId} className="w-full">
              <SelectValue placeholder="Toutes les enveloppes">{selectedEnvelopeLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Toutes les enveloppes</SelectItem>
              {sortedEnvelopes.map((envelope) => (
                <SelectItem key={envelope.id} value={envelope.id}>
                  {formatEnvelopeLabel(envelope)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="starium-form-field space-y-2">
          <Label htmlFor={lineId}>Ligne budgétaire</Label>
          <Select value={selectedLineId} onValueChange={(value) => setSelectedLineId(value ?? '')}>
            <SelectTrigger id={lineId} className="w-full">
              <SelectValue placeholder="Choisir une ligne budgétaire" />
            </SelectTrigger>
            <SelectContent>
              {availableLines.map((line) => (
                <SelectItem key={line.id} value={line.id}>
                  {formatLineLabel(line)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedLine ? (
            <p className="text-xs text-muted-foreground">
              Devise : {selectedLine.currency}
            </p>
          ) : null}
        </div>

        <div className="starium-form-field space-y-2">
          <Label>Nature de saisie</Label>
          <div
            className="grid gap-2 sm:grid-cols-3"
            role="radiogroup"
            aria-label="Nature de la dépense à saisir"
          >
            {EXPENSE_KIND_OPTIONS.map((option) => {
              const selected = selectedKind === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setSelectedKind(option.value)}
                  className={[
                    'min-h-11 rounded-xl border px-3 py-2 text-left text-sm font-medium transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    selected
                      ? 'border-border bg-background text-foreground shadow-sm'
                      : 'border-border/70 bg-muted/30 text-muted-foreground hover:bg-background/70 hover:text-foreground',
                  ].join(' ')}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </StariumModal>
  );
}
