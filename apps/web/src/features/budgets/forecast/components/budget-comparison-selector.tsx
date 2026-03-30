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
  currentBudgetId: string;
  snapshots: BudgetSnapshotSummaryDto[];
  snapshotsLoading: boolean;
  versions: BudgetVersionSummaryDto[];
  versionsLoading: boolean;
  versionsError?: boolean;
}

function snapshotLabel(s: BudgetSnapshotSummaryDto): string {
  const date = formatDate(s.snapshotDate);
  return `${s.code} — ${date}`;
}

function versionLabel(v: BudgetVersionSummaryDto): string {
  const base = v.versionLabel?.trim() || v.code;
  const n = v.versionNumber != null ? `v${v.versionNumber}` : '';
  return n ? `${base} (${n})` : base;
}

export function BudgetComparisonSelector({
  compareTo,
  onCompareToChange,
  targetId,
  onTargetIdChange,
  currentBudgetId,
  snapshots,
  snapshotsLoading,
  versions,
  versionsLoading,
  versionsError,
}: BudgetComparisonSelectorProps) {
  const showTarget = compareTo === 'snapshot' || compareTo === 'version';

  const versionOptions = versions.filter((v) => v.id !== currentBudgetId);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="space-y-2 min-w-[200px]">
        <Label htmlFor="compare-to">Comparer à</Label>
        <Select
          value={compareTo}
          onValueChange={(v) => onCompareToChange(v as BudgetComparisonMode)}
        >
          <SelectTrigger id="compare-to" className="w-[220px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="baseline">Baseline</SelectItem>
            <SelectItem value="snapshot">Snapshot</SelectItem>
            <SelectItem value="version">Version</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {showTarget && (
        <div className="space-y-2 min-w-[280px] flex-1">
          <Label htmlFor="compare-target">
            {compareTo === 'snapshot' ? 'Snapshot' : 'Version cible'}
          </Label>
          {compareTo === 'snapshot' && (
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
                        ? 'Aucun snapshot'
                        : 'Choisir un snapshot'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {snapshots.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {snapshotLabel(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {compareTo === 'version' && (
            <Select
              value={targetId ?? ''}
              onValueChange={(v) => onTargetIdChange(v || undefined)}
              disabled={versionsLoading || versionsError || versionOptions.length === 0}
            >
              <SelectTrigger id="compare-target" className="w-full max-w-md">
                <SelectValue
                  placeholder={
                    versionsLoading
                      ? 'Chargement…'
                      : versionsError
                        ? 'Versions indisponibles'
                        : versionOptions.length === 0
                          ? 'Aucune autre version'
                          : 'Choisir une version'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {versionOptions.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {versionLabel(v)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}
    </div>
  );
}
