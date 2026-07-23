'use client';

import { useMemo, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/feedback/loading-state';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getStrategicDirectionStrategyStatusLabel } from '../lib/strategic-direction-strategy-labels';
import {
  useStrategicDirectionStrategyCompareQuery,
  useStrategicDirectionStrategyVersionsQuery,
} from '../hooks/use-strategic-direction-strategy-queries';
import type {
  StrategicDirectionStrategyCollectionDiffDto,
  StrategicDirectionStrategyCompareDto,
  StrategicDirectionStrategyFieldDiffDto,
} from '../types/strategic-direction-strategy.types';
import { cn } from '@/lib/utils';
import { GitCompare, History } from 'lucide-react';

function pickDefaultCompareIds(
  versions: Array<{ id: string; versionNumber: number }>,
  currentStrategyId: string,
): { baseId: string; targetId: string } | null {
  if (versions.length < 2) return null;
  const current =
    versions.find((version) => version.id === currentStrategyId) ?? versions[versions.length - 1];
  const previous = versions.find(
    (version) => version.versionNumber === current.versionNumber - 1,
  );
  if (previous) {
    return { baseId: previous.id, targetId: current.id };
  }
  if (versions.length >= 2) {
    return { baseId: versions[0].id, targetId: versions[versions.length - 1].id };
  }
  return null;
}

export function StrategicDirectionStrategyVersionComparePanel({
  strategyId,
}: {
  strategyId: string;
}) {
  const versionsQ = useStrategicDirectionStrategyVersionsQuery(strategyId);
  const versions = useMemo(
    () => versionsQ.data?.versions ?? [],
    [versionsQ.data?.versions],
  );
  const defaultCompareIds = useMemo(() => {
    if (!versionsQ.data || versions.length < 2) return null;
    return pickDefaultCompareIds(versions, versionsQ.data.currentStrategyId);
  }, [versionsQ.data, versions]);

  const canCompare = versions.length >= 2;

  return (
    <section className="starium-form-section border-border/60" aria-labelledby="strategy-versions">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 id="strategy-versions" className="starium-form-section-title mb-0">
            <History aria-hidden />
            Historique des versions
          </h3>
          <p className="text-xs text-muted-foreground">
            Compare les adaptations archivées avec la version active de la même direction / vision.
          </p>
        </div>
        {canCompare ? (
          <Badge variant="outline" className="h-7 px-2.5 text-xs font-medium">
            {versions.length} version{versions.length > 1 ? 's' : ''}
          </Badge>
        ) : null}
      </div>

      {versionsQ.isLoading ? (
        <div className="space-y-2" aria-live="polite">
          <p className="text-xs text-muted-foreground">Chargement de l’historique des versions…</p>
          <LoadingState rows={3} />
        </div>
      ) : versionsQ.isError ? (
        <Alert variant="destructive">
          <AlertDescription>Impossible de charger l’historique des versions.</AlertDescription>
        </Alert>
      ) : !canCompare ? (
        <Alert>
          <AlertDescription>
            Aucune version archivée pour cette stratégie. Après une adaptation, l’ancienne version
            validée apparaîtra ici pour comparaison.
          </AlertDescription>
        </Alert>
      ) : (
        defaultCompareIds ? (
          <VersionCompareWorkspace
            key={strategyId}
            strategyId={strategyId}
            versions={versions}
            defaultBaseId={defaultCompareIds.baseId}
            defaultTargetId={defaultCompareIds.targetId}
          />
        ) : (
          <Alert>
            <AlertDescription>
              Impossible de pré-sélectionner deux versions à comparer. Réessaie après rechargement.
            </AlertDescription>
          </Alert>
        )
      )}
    </section>
  );
}

function VersionCompareWorkspace({
  strategyId,
  versions,
  defaultBaseId,
  defaultTargetId,
}: {
  strategyId: string;
  versions: Array<{
    id: string;
    versionNumber: number;
    versionLabel: string;
    status: string;
    archivedReason: string | null;
    isCurrent: boolean;
    title: string | null;
  }>;
  defaultBaseId: string;
  defaultTargetId: string;
}) {
  const [baseId, setBaseId] = useState(defaultBaseId);
  const [targetId, setTargetId] = useState(defaultTargetId);

  const compareQ = useStrategicDirectionStrategyCompareQuery(baseId, targetId, {
    enabled: baseId !== targetId,
  });

  return (
    <>
      <div className="mb-4 grid gap-3 md:grid-cols-2">
        <VersionSelectField
          id="strategy-version-base"
          label="Version de référence"
          value={baseId}
          versions={versions}
          onValueChange={setBaseId}
        />
        <VersionSelectField
          id="strategy-version-target"
          label="Comparer à"
          value={targetId}
          versions={versions}
          onValueChange={setTargetId}
        />
      </div>

      <VersionTimeline versions={versions} currentStrategyId={strategyId} />

      {baseId === targetId ? (
        <Alert>
          <AlertDescription>Choisis deux versions distinctes pour lancer la comparaison.</AlertDescription>
        </Alert>
      ) : compareQ.isLoading ? (
        <div className="space-y-2" aria-live="polite">
          <p className="text-xs text-muted-foreground">Comparaison des versions…</p>
          <LoadingState rows={4} />
        </div>
      ) : compareQ.isError ? (
        <Alert variant="destructive">
          <AlertDescription>Impossible de comparer ces versions.</AlertDescription>
        </Alert>
      ) : compareQ.data ? (
        <StrategyCompareResultView diff={compareQ.data} />
      ) : null}
    </>
  );
}

function VersionSelectField({
  id,
  label,
  value,
  versions,
  onValueChange,
}: {
  id: string;
  label: string;
  value: string;
  versions: Array<{
    id: string;
    versionLabel: string;
    archivedReason: string | null;
    title: string | null;
  }>;
  onValueChange: (value: string) => void;
}) {
  return (
    <div className="starium-form-field">
      <Label htmlFor={id} className="starium-form-label">
        {label}
      </Label>
      <Select value={value} onValueChange={(v) => v != null && onValueChange(v)}>
        <SelectTrigger id={id} className="starium-form-input h-9 w-full min-w-0">
          <SelectValue placeholder="Choisir une version" />
        </SelectTrigger>
        <SelectContent>
          {versions.map((version) => (
            <SelectItem key={version.id} value={version.id}>
              {version.versionLabel}
              {version.title ? ` — ${version.title}` : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function VersionTimeline({
  versions,
  currentStrategyId,
}: {
  versions: Array<{
    id: string;
    versionNumber: number;
    versionLabel: string;
    status: string;
    archivedReason: string | null;
    isCurrent: boolean;
  }>;
  currentStrategyId: string;
}) {
  return (
    <ol className="mb-4 space-y-2" aria-label="Chronologie des versions">
      {versions.map((version) => {
        const isActive = version.id === currentStrategyId || version.isCurrent;
        return (
          <li
            key={version.id}
            className={cn(
              'rounded-lg border px-3 py-2.5',
              isActive
                ? 'border-[color-mix(in_srgb,var(--brand-gold)_30%,var(--border))] bg-[color-mix(in_srgb,var(--brand-gold)_7%,var(--card))]'
                : 'border-border/70 bg-muted/15',
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{version.versionLabel}</p>
                {version.archivedReason ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Motif : {version.archivedReason}
                  </p>
                ) : null}
              </div>
              <Badge variant={version.status === 'ARCHIVED' ? 'secondary' : 'outline'}>
                {getStrategicDirectionStrategyStatusLabel(version.status)}
              </Badge>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function StrategyCompareResultView({ diff }: { diff: StrategicDirectionStrategyCompareDto }) {
  return (
    <div className="space-y-4 rounded-lg border border-border/70 bg-background/80 p-3">
      <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
        <GitCompare className="size-4 text-muted-foreground" aria-hidden />
        <span>{diff.left.versionLabel}</span>
        <span className="text-muted-foreground" aria-hidden>
          →
        </span>
        <span>{diff.right.versionLabel}</span>
      </div>

      {!diff.hasChanges ? (
        <Alert>
          <AlertDescription>Aucune différence détectée entre ces deux versions.</AlertDescription>
        </Alert>
      ) : (
        <>
          <CompareFieldTable fields={diff.fields} />
          {diff.collections.map((collection) => (
            <CompareCollectionDiff key={collection.label} collection={collection} />
          ))}
          <CompareNamedDiff title="Axes liés" diff={diff.axes} />
          <CompareNamedDiff title="Objectifs liés" diff={diff.objectives} />
        </>
      )}
    </div>
  );
}

function CompareFieldTable({ fields }: { fields: StrategicDirectionStrategyFieldDiffDto[] }) {
  const changedFields = fields.filter((field) => field.changed);
  if (changedFields.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-lg border border-border/60">
      <table className="min-w-full text-sm">
        <caption className="sr-only">Champs modifiés entre les deux versions</caption>
        <thead className="bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-semibold">Champ</th>
            <th className="px-3 py-2 font-semibold">Référence</th>
            <th className="px-3 py-2 font-semibold">Nouvelle version</th>
          </tr>
        </thead>
        <tbody>
          {changedFields.map((field) => (
            <tr key={field.field} className="border-t border-border/50 align-top">
              <th scope="row" className="px-3 py-2 font-medium text-foreground">
                {field.label}
              </th>
              <td className="px-3 py-2 text-muted-foreground whitespace-pre-wrap">{field.left}</td>
              <td className="px-3 py-2 whitespace-pre-wrap text-foreground">{field.right}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CompareCollectionDiff({
  collection,
}: {
  collection: StrategicDirectionStrategyCollectionDiffDto;
}) {
  if (collection.added.length === 0 && collection.removed.length === 0) return null;

  return (
    <div className="rounded-lg border border-border/60 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {collection.label}
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        <DiffList title="Retiré" items={collection.removed} tone="removed" />
        <DiffList title="Ajouté" items={collection.added} tone="added" />
      </div>
    </div>
  );
}

function CompareNamedDiff({
  title,
  diff,
}: {
  title: string;
  diff: { added: string[]; removed: string[]; unchanged: string[] };
}) {
  if (diff.added.length === 0 && diff.removed.length === 0) return null;

  return (
    <div className="rounded-lg border border-border/60 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        <DiffList title="Retiré" items={diff.removed} tone="removed" />
        <DiffList title="Ajouté" items={diff.added} tone="added" />
      </div>
      {diff.unchanged.length > 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Inchangé : {diff.unchanged.join(', ')}
        </p>
      ) : null}
    </div>
  );
}

function DiffList({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: 'added' | 'removed';
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-md bg-muted/15 px-3 py-2 text-xs text-muted-foreground">
        {title} : —
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-md px-3 py-2',
        tone === 'added'
          ? 'bg-[color-mix(in_srgb,var(--brand-gold)_10%,var(--card))]'
          : 'bg-destructive/5',
      )}
    >
      <p className="mb-1 text-xs font-semibold text-foreground">{title}</p>
      <ul className="space-y-1 text-sm text-foreground">
        {items.map((item) => (
          <li key={item} className="wrap-break-word">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
