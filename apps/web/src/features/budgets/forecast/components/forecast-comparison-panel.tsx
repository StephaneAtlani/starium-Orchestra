'use client';

import { useCallback, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBudgetComparison } from '@/features/budgets/forecast/hooks/use-budget-comparison';
import { useBudgetSnapshotsForSelect } from '@/features/budgets/forecast/hooks/use-budget-snapshots-for-select';
import { useBudgetVersionHistory } from '@/features/budgets/forecast/hooks/use-budget-version-history';
import { useSnapshotPairComparison } from '@/features/budgets/forecast/hooks/use-snapshot-pair-comparison';
import { useVersionPairComparison } from '@/features/budgets/forecast/hooks/use-version-pair-comparison';
import {
  MAX_MULTI_SNAPSHOTS,
  MIN_MULTI_SNAPSHOTS,
  useMultiSnapshotVsLiveComparison,
} from '@/features/budgets/forecast/hooks/use-multi-snapshot-vs-live-comparison';
import { ComparisonTable } from '@/features/budgets/forecast/components/comparison-table';
import { MultiLiveVsSnapshotsTable } from '@/features/budgets/forecast/components/multi-live-vs-snapshots-table';
import {
  BudgetComparisonSelector,
  snapshotDisplayLabel,
  versionDisplayLabel,
} from '@/features/budgets/forecast/components/budget-comparison-selector';
import type { BudgetComparisonMode } from '@/features/budgets/types/budget-forecast.types';
import { cn } from '@/lib/utils';

/** Onglets : référence unique, paires, ou N snapshots vs budget actuel. */
export type ForecastComparisonTab =
  | 'reference'
  | 'snapshotPair'
  | 'versionPair'
  | 'multiSnapshot';

export function ForecastComparisonPanel({ budgetId }: { budgetId: string }) {
  const [tab, setTab] = useState<ForecastComparisonTab>('reference');

  const [compareTo, setCompareTo] = useState<BudgetComparisonMode>('baseline');
  const [targetId, setTargetId] = useState<string | undefined>(undefined);

  const [snapLeft, setSnapLeft] = useState<string | undefined>();
  const [snapRight, setSnapRight] = useState<string | undefined>();

  const [verLeft, setVerLeft] = useState<string | undefined>();
  const [verRight, setVerRight] = useState<string | undefined>();

  const [multiIds, setMultiIds] = useState<string[]>([]);

  const handleCompareToChange = useCallback((mode: BudgetComparisonMode) => {
    setCompareTo(mode);
    setTargetId(undefined);
  }, []);

  const snapshotsQuery = useBudgetSnapshotsForSelect(budgetId, {
    enabled:
      tab === 'reference' ||
      tab === 'snapshotPair' ||
      tab === 'multiSnapshot',
  });
  const versionsQuery = useBudgetVersionHistory(budgetId, {
    enabled: tab === 'reference' || tab === 'versionPair',
  });

  const comparisonRef = useBudgetComparison(budgetId, compareTo, targetId, {
    enabled: tab === 'reference',
  });
  const snapPairQuery = useSnapshotPairComparison(snapLeft, snapRight, {
    enabled: tab === 'snapshotPair',
  });
  const verPairQuery = useVersionPairComparison(verLeft, verRight, {
    enabled: tab === 'versionPair',
  });
  const multiQuery = useMultiSnapshotVsLiveComparison(budgetId, multiIds, {
    enabled: tab === 'multiSnapshot',
  });

  const snapshots = snapshotsQuery.data?.items ?? [];
  const versions = versionsQuery.data ?? [];

  const snapLeftRow = snapLeft ? snapshots.find((s) => s.id === snapLeft) : undefined;
  const snapRightRow = snapRight ? snapshots.find((s) => s.id === snapRight) : undefined;
  const verLeftRow = verLeft ? versions.find((v) => v.id === verLeft) : undefined;
  const verRightRow = verRight ? versions.find((v) => v.id === verRight) : undefined;

  const toggleMulti = useCallback((id: string, checked: boolean) => {
    setMultiIds((prev) => {
      if (checked) {
        if (prev.includes(id)) return prev;
        if (prev.length >= MAX_MULTI_SNAPSHOTS) return prev;
        return [...prev, id];
      }
      return prev.filter((x) => x !== id);
    });
  }, []);

  return (
    <div className="space-y-6">
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as ForecastComparisonTab)}
      >
        <TabsList
          variant="line"
          className="h-auto w-full min-h-0 flex-wrap justify-start gap-1 p-1"
        >
          <TabsTrigger value="reference" className="shrink-0">
            Actuel vs référence
          </TabsTrigger>
          <TabsTrigger value="snapshotPair" className="shrink-0">
            Deux snapshots
          </TabsTrigger>
          <TabsTrigger value="versionPair" className="shrink-0">
            Deux versions
          </TabsTrigger>
          <TabsTrigger value="multiSnapshot" className="shrink-0">
            Plusieurs snapshots (vs actuel)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reference" className="mt-4 space-y-6">
          <BudgetComparisonSelector
            compareTo={compareTo}
            onCompareToChange={handleCompareToChange}
            targetId={targetId}
            onTargetIdChange={setTargetId}
            currentBudgetId={budgetId}
            snapshots={snapshots}
            snapshotsLoading={snapshotsQuery.isLoading}
            versions={versions}
            versionsLoading={versionsQuery.isLoading}
            versionsError={versionsQuery.isError}
          />

          {compareTo === 'snapshot' && snapshotsQuery.isError && (
            <p className="text-sm text-destructive">
              Impossible de charger la liste des snapshots.
            </p>
          )}

          {compareTo === 'version' && versionsQuery.isError && (
            <p className="text-sm text-destructive">
              {(versionsQuery.error as Error)?.message ??
                'Historique de versions indisponible (budget non versionné ?).'}
            </p>
          )}

          {(compareTo === 'snapshot' || compareTo === 'version') && !targetId ? (
            <p className="text-sm text-muted-foreground" data-testid="comparison-idle">
              Sélectionnez{' '}
              {compareTo === 'snapshot' ? 'un snapshot' : 'une version cible'} pour lancer la
              comparaison.
            </p>
          ) : (
            <ComparisonTable
              data={comparisonRef.data}
              isLoading={comparisonRef.isLoading}
              error={comparisonRef.error as Error | null}
            />
          )}
        </TabsContent>

        <TabsContent value="snapshotPair" className="mt-4 space-y-6">
          <p className="text-sm text-muted-foreground">
            Compare deux instantanés du même budget (lignes alignées par code).
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="space-y-2 min-w-[260px] flex-1">
              <Label htmlFor="snap-pair-left">Snapshot gauche</Label>
              <Select
                value={snapLeft ?? ''}
                onValueChange={(v) => setSnapLeft(v || undefined)}
                disabled={snapshotsQuery.isLoading || snapshots.length === 0}
              >
                <SelectTrigger id="snap-pair-left" className="w-full max-w-md">
                  <SelectValue
                    placeholder={
                      snapshotsQuery.isLoading
                        ? 'Chargement…'
                        : snapshots.length === 0
                          ? 'Aucun snapshot'
                          : 'Choisir…'
                    }
                  >
                    {snapLeftRow ? snapshotDisplayLabel(snapLeftRow) : undefined}
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
            <div className="space-y-2 min-w-[260px] flex-1">
              <Label htmlFor="snap-pair-right">Snapshot droite</Label>
              <Select
                value={snapRight ?? ''}
                onValueChange={(v) => setSnapRight(v || undefined)}
                disabled={snapshotsQuery.isLoading || snapshots.length === 0}
              >
                <SelectTrigger id="snap-pair-right" className="w-full max-w-md">
                  <SelectValue
                    placeholder={
                      snapshotsQuery.isLoading
                        ? 'Chargement…'
                        : snapshots.length === 0
                          ? 'Aucun snapshot'
                          : 'Choisir…'
                    }
                  >
                    {snapRightRow ? snapshotDisplayLabel(snapRightRow) : undefined}
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
          </div>
          {snapLeft && snapRight && snapLeft === snapRight && (
            <p className="text-sm text-amber-600">Choisissez deux snapshots distincts.</p>
          )}
          {!snapLeft || !snapRight || snapLeft === snapRight ? (
            <p className="text-sm text-muted-foreground">
              Sélectionnez deux snapshots pour afficher le tableau.
            </p>
          ) : (
            <ComparisonTable
              data={snapPairQuery.data}
              isLoading={snapPairQuery.isLoading}
              error={snapPairQuery.error as Error | null}
            />
          )}
        </TabsContent>

        <TabsContent value="versionPair" className="mt-4 space-y-6">
          <p className="text-sm text-muted-foreground">
            Compare deux budgets du même jeu de versions (révisions alignées).
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="space-y-2 min-w-[260px] flex-1">
              <Label htmlFor="ver-pair-left">Version gauche</Label>
              <Select
                value={verLeft ?? ''}
                onValueChange={(v) => setVerLeft(v || undefined)}
                disabled={versionsQuery.isLoading || versions.length === 0}
              >
                <SelectTrigger id="ver-pair-left" className="w-full max-w-md">
                  <SelectValue
                    placeholder={
                      versionsQuery.isLoading
                        ? 'Chargement…'
                        : versions.length === 0
                          ? 'Aucune version'
                          : 'Choisir…'
                    }
                  >
                    {verLeftRow ? versionDisplayLabel(verLeftRow) : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {versions.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {versionDisplayLabel(v)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 min-w-[260px] flex-1">
              <Label htmlFor="ver-pair-right">Version droite</Label>
              <Select
                value={verRight ?? ''}
                onValueChange={(v) => setVerRight(v || undefined)}
                disabled={versionsQuery.isLoading || versions.length === 0}
              >
                <SelectTrigger id="ver-pair-right" className="w-full max-w-md">
                  <SelectValue
                    placeholder={
                      versionsQuery.isLoading
                        ? 'Chargement…'
                        : versions.length === 0
                          ? 'Aucune version'
                          : 'Choisir…'
                    }
                  >
                    {verRightRow ? versionDisplayLabel(verRightRow) : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {versions.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {versionDisplayLabel(v)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {verLeft && verRight && verLeft === verRight && (
            <p className="text-sm text-amber-600">Choisissez deux versions distinctes.</p>
          )}
          {!verLeft || !verRight || verLeft === verRight ? (
            <p className="text-sm text-muted-foreground">
              Sélectionnez deux versions pour afficher le tableau.
            </p>
          ) : (
            <ComparisonTable
              data={verPairQuery.data}
              isLoading={verPairQuery.isLoading}
              error={verPairQuery.error as Error | null}
            />
          )}
        </TabsContent>

        <TabsContent value="multiSnapshot" className="mt-4 space-y-6">
          <p className="text-sm text-muted-foreground">
            Compare le budget actuel à plusieurs snapshots en parallèle (2 à{' '}
            {MAX_MULTI_SNAPSHOTS} colonnes). L’ordre de <strong>cochage</strong> définit la 1ʳᵉ
            cible (colonne variance / statut).
          </p>
          <div className="space-y-2">
            <Label>
              Snapshots ({multiIds.length}/{MAX_MULTI_SNAPSHOTS} — minimum{' '}
              {MIN_MULTI_SNAPSHOTS})
            </Label>
            <div
              className={cn(
                'max-h-56 space-y-2 overflow-y-auto rounded-lg border border-border p-3',
                snapshots.length === 0 && 'text-sm text-muted-foreground',
              )}
            >
              {snapshotsQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Chargement…</p>
              ) : snapshots.length === 0 ? (
                <p>Aucun snapshot pour ce budget.</p>
              ) : (
                snapshots.map((s) => {
                  const checked = multiIds.includes(s.id);
                  const disabled = !checked && multiIds.length >= MAX_MULTI_SNAPSHOTS;
                  return (
                    <label
                      key={s.id}
                      className={cn(
                        'flex cursor-pointer items-start gap-3 rounded-md px-1 py-1.5 hover:bg-muted/50',
                        disabled && 'cursor-not-allowed opacity-60',
                      )}
                    >
                      <input
                        type="checkbox"
                        className="mt-1 size-4 shrink-0 rounded border border-input"
                        checked={checked}
                        disabled={disabled}
                        onChange={(e) => toggleMulti(s.id, e.target.checked)}
                      />
                      <span className="text-sm leading-snug">{snapshotDisplayLabel(s)}</span>
                    </label>
                  );
                })
              )}
            </div>
          </div>
          {multiIds.length > 0 && multiIds.length < MIN_MULTI_SNAPSHOTS && (
            <p className="text-sm text-muted-foreground">
              Cochez au moins {MIN_MULTI_SNAPSHOTS} snapshots.
            </p>
          )}
          {multiIds.length >= MIN_MULTI_SNAPSHOTS ? (
            multiQuery.isError ? (
              <ComparisonTable
                data={null}
                isLoading={false}
                error={multiQuery.error as Error | null}
              />
            ) : multiQuery.data ? (
              <MultiLiveVsSnapshotsTable merged={multiQuery.data} />
            ) : (
              <ComparisonTable
                data={null}
                isLoading={multiQuery.isLoading}
                error={null}
              />
            )
          ) : (
            <p className="text-sm text-muted-foreground" data-testid="multi-comparison-idle">
              Cochez au moins {MIN_MULTI_SNAPSHOTS} snapshots pour lancer les requêtes.
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
