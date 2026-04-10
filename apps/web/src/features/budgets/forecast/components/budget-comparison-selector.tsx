'use client';

import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { formatDate } from '@/features/budgets/lib/budget-formatters';
import type { BudgetComparisonMode } from '@/features/budgets/types/budget-forecast.types';
import type { BudgetSnapshotSummaryDto } from '@/features/budgets/types/budget-snapshots-list.types';
import type { BudgetVersionSummaryDto } from '@/features/budgets/types/budget-version-history.types';

export interface BudgetComparisonSelectorProps {
  compareTo: BudgetComparisonMode;
  onCompareToChange: (mode: BudgetComparisonMode) => void;
  targetId: string | undefined;
  onTargetIdChange: (id: string | undefined) => void;
  snapshots: BudgetSnapshotSummaryDto[];
  snapshotsLoading: boolean;
}

/** Repli si pas de nom : code + date (lisible, distinct de l’id). */
function snapshotFallbackLabel(s: BudgetSnapshotSummaryDto): string {
  const date = formatDate(s.snapshotDate);
  return `${s.code} — ${date}`;
}

/** Libellé métier : nom du snapshot, sinon code + date. */
export function snapshotDisplayLabel(s: BudgetSnapshotSummaryDto): string {
  const n = s.name?.trim();
  return n || snapshotFallbackLabel(s);
}

export function versionDisplayLabel(v: BudgetVersionSummaryDto): string {
  const base = v.versionLabel?.trim() || v.code;
  const n = v.versionNumber != null ? `v${v.versionNumber}` : '';
  return n ? `${base} (${n})` : base;
}

export function BudgetComparisonSelector({
  compareTo,
  onCompareToChange,
  targetId,
  onTargetIdChange,
  snapshots,
  snapshotsLoading,
}: BudgetComparisonSelectorProps) {
  const selectedSnapshot =
    targetId && compareTo === 'snapshot'
      ? snapshots.find((s) => s.id === targetId)
      : undefined;
  const snapshotTriggerLabel = selectedSnapshot
    ? snapshotDisplayLabel(selectedSnapshot)
    : undefined;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="space-y-2 min-w-[200px]">
        <Label htmlFor="compare-to">Comparer à</Label>
        <Select
          value={compareTo}
          onValueChange={(v) => onCompareToChange(v as BudgetComparisonMode)}
        >
          <SelectTrigger id="compare-to" className="w-[220px]">
            <SelectValue placeholder="Référence baseline">
              {compareTo === 'baseline' ? 'Référence baseline' : 'Version figée'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="baseline">Référence baseline</SelectItem>
            <SelectItem value="snapshot">Version figée</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {compareTo === 'snapshot' && (
        <div className="space-y-2 min-w-[280px] flex-1">
          <Label htmlFor="compare-target">Version figée</Label>
          <Select
            value={targetId ?? ''}
            onValueChange={(v) => onTargetIdChange(v || undefined)}
            disabled={snapshotsLoading || snapshots.length === 0}
          >
            <SelectTrigger id="compare-target" className="w-full max-w-md">
              <SelectValue
                placeholder={
                  snapshotsLoading
                    ? 'Chargement…'
                    : snapshots.length === 0
                      ? 'Aucune version figée'
                      : 'Choisir une version figée'
                }
              >
                {snapshotTriggerLabel}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {snapshots.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {snapshotDisplayLabel(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
