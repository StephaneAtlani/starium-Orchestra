'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { projectScenarioWorkspace } from '../constants/project-routes';
import { ScenarioSummaryGrid } from './ScenarioSummaryGrid';
import type { ProjectScenarioApi } from '../types/project.types';

const STATUS_LABEL: Record<ProjectScenarioApi['status'], string> = {
  DRAFT: 'DRAFT',
  SELECTED: 'SELECTED',
  ARCHIVED: 'ARCHIVED',
};

function statusClass(status: ProjectScenarioApi['status']): string {
  if (status === 'SELECTED') {
    return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-300';
  }
  if (status === 'ARCHIVED') {
    return 'border-border/70 bg-muted text-muted-foreground';
  }
  return 'border-sky-500/40 bg-sky-500/10 text-sky-900 dark:text-sky-300';
}

export function canArchiveScenario(scenario: Pick<ProjectScenarioApi, 'status' | 'isBaseline'>): boolean {
  const isSelected = scenario.status === 'SELECTED' || scenario.isBaseline;
  const isArchived = scenario.status === 'ARCHIVED';
  return !isSelected && !isArchived;
}

export function buildScenarioMetaLabel(scenario: Pick<ProjectScenarioApi, 'code' | 'version'>): string {
  return `${scenario.code ? `Code ${scenario.code}` : 'Code non renseigné'} · Version ${scenario.version}`;
}

type ScenarioCardProps = {
  projectId: string;
  scenario: ProjectScenarioApi;
  canMutate: boolean;
  disableMutations: boolean;
  disabledReason: string | null;
  onDuplicate: (scenarioId: string) => void;
  onSelect: (scenarioId: string) => void;
  onArchive: (scenarioId: string) => void;
};

export function ScenarioCard({
  projectId,
  scenario,
  canMutate,
  disableMutations,
  disabledReason,
  onDuplicate,
  onSelect,
  onArchive,
}: ScenarioCardProps) {
  const isArchived = scenario.status === 'ARCHIVED';
  const isSelected = scenario.status === 'SELECTED' || scenario.isBaseline;
  const disableArchive = !canArchiveScenario(scenario) || disableMutations;
  const archiveHint = isSelected
    ? 'Un scénario baseline ne peut pas être archivé.'
    : disabledReason;

  return (
    <article className="rounded-lg border border-border/70 bg-card p-4 shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-foreground">{scenario.name}</h3>
          <p className="text-xs text-muted-foreground">{buildScenarioMetaLabel(scenario)}</p>
        </div>
        <Badge className={statusClass(scenario.status)}>{STATUS_LABEL[scenario.status]}</Badge>
      </header>

      {scenario.description ? (
        <p className="mt-2 text-sm text-muted-foreground">{scenario.description}</p>
      ) : null}

      <div className="mt-3">
        <ScenarioSummaryGrid scenario={scenario} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link
          href={projectScenarioWorkspace(projectId, scenario.id)}
          className={cn(buttonVariants({ variant: 'default', size: 'sm' }))}
        >
          Ouvrir
        </Link>
        <Button
          type="button"
          size="sm"
          disabled={disableMutations || isArchived}
          title={disabledReason ?? undefined}
          onClick={() => onSelect(scenario.id)}
        >
          Sélectionner
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disableMutations || isArchived}
          title={disabledReason ?? undefined}
          onClick={() => onDuplicate(scenario.id)}
        >
          Dupliquer
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="text-destructive"
          disabled={disableArchive}
          title={archiveHint ?? undefined}
          onClick={() => onArchive(scenario.id)}
        >
          Archiver
        </Button>
      </div>

      {!canMutate && disabledReason ? (
        <p className="mt-2 text-xs text-muted-foreground">{disabledReason}</p>
      ) : null}
    </article>
  );
}
