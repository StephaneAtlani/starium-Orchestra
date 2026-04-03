'use client';

import type { UseQueryResult } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { collaboratorManagerSecondaryLabel } from '@/features/teams/collaborators/lib/collaborator-label-mappers';
import type { CollaboratorOptionsResponse } from '@/features/teams/collaborators/types/collaborator.types';
import type { WorkTeamDto } from '@/features/teams/work-teams/types/work-team.types';
import { cn } from '@/lib/utils';

export type ResourceHumanTeamsFieldsProps = {
  formIdPrefix: string;
  managerSearch: string;
  onManagerSearchChange: (v: string) => void;
  managerId: string;
  onManagerIdChange: (v: string) => void;
  selectedWorkTeamIds: string[];
  onToggleWorkTeam: (teamId: string, selected: boolean) => void;
  managersQuery: UseQueryResult<CollaboratorOptionsResponse, Error>;
  teamsLoading: boolean;
  teamsError: boolean;
  teamItems: WorkTeamDto[];
  description?: string;
};

export function ResourceHumanTeamsFields({
  formIdPrefix,
  managerSearch,
  onManagerSearchChange,
  managerId,
  onManagerIdChange,
  selectedWorkTeamIds,
  onToggleWorkTeam,
  managersQuery,
  teamsLoading,
  teamsError,
  teamItems,
  description = 'Un manager peut piloter plusieurs équipes (rôles organisationnels). Cochez une ou plusieurs équipes pour les rattachements.',
}: ResourceHumanTeamsFieldsProps) {
  const pid = (s: string) => `${formIdPrefix}-${s}`;
  const selected = new Set(selectedWorkTeamIds);

  return (
    <div className="space-y-3 border-t border-border/60 pt-4">
      <div>
        <p className="text-sm font-medium text-foreground">Équipes (référentiel)</p>
        <p className="text-xs text-muted-foreground">
          {description}
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor={pid('mgr-search')}>Recherche manager</Label>
        <Input
          id={pid('mgr-search')}
          value={managerSearch}
          onChange={(e) => onManagerSearchChange(e.target.value)}
          placeholder="Nom ou email…"
          autoComplete="off"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={pid('manager')}>Manager</Label>
        <select
          id={pid('manager')}
          className={cn(
            'flex h-9 w-full rounded-lg border border-input bg-transparent px-2 text-sm shadow-xs outline-none',
            'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
          )}
          value={managerId}
          onChange={(e) => onManagerIdChange(e.target.value)}
          disabled={managersQuery.isLoading}
        >
          <option value="">
            {managersQuery.isLoading ? 'Chargement…' : '— Aucun'}
          </option>
          {(managersQuery.data?.items ?? []).map((c) => {
            const sec = collaboratorManagerSecondaryLabel(c);
            return (
              <option key={c.id} value={c.id}>
                {c.displayName}
                {sec ? ` — ${sec}` : ''}
              </option>
            );
          })}
        </select>
        {managersQuery.isError && (
          <div className="flex flex-wrap items-center gap-2" role="alert">
            <p className="text-xs text-destructive">{(managersQuery.error as Error).message}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => void managersQuery.refetch()}
            >
              Réessayer
            </Button>
          </div>
        )}
        {managersQuery.isSuccess &&
          (managersQuery.data?.items?.length ?? 0) === 0 &&
          !managersQuery.isFetching && (
            <p className="text-xs text-muted-foreground">
              Aucun collaborateur actif : créez des fiches collaborateur ou élargissez la recherche.
            </p>
          )}
      </div>
      <div className="space-y-2">
        <Label htmlFor={pid('workTeams')}>Équipes</Label>
        <div
          id={pid('workTeams')}
          role="group"
          aria-label="Équipes à rattacher"
          className={cn(
            'max-h-48 overflow-y-auto rounded-lg border border-input bg-transparent px-2 py-2 text-sm',
            teamsLoading && 'opacity-60',
          )}
        >
          {teamsLoading ? (
            <p className="text-xs text-muted-foreground px-1">Chargement des équipes…</p>
          ) : teamsError ? (
            <p className="text-xs text-destructive px-1">Impossible de charger les équipes.</p>
          ) : teamItems.length === 0 ? (
            <p className="text-xs text-muted-foreground px-1">Aucune équipe active.</p>
          ) : (
            <ul className="space-y-2">
              {teamItems.map((t) => (
                <li key={t.id}>
                  <label className="flex cursor-pointer items-start gap-2 rounded-md px-1 py-0.5 hover:bg-muted/40">
                    <input
                      type="checkbox"
                      className="mt-2.5 size-4 shrink-0 rounded border-input"
                      checked={selected.has(t.id)}
                      onChange={(e) => onToggleWorkTeam(t.id, e.target.checked)}
                    />
                    <span className="min-w-0 leading-snug">
                      {t.pathLabel || t.name}
                      {t.code ? (
                        <span className="ml-1.5 text-xs text-muted-foreground">({t.code})</span>
                      ) : null}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Plusieurs équipes possibles (ex. Exploitation, chefs de projet, techniciens…).
        </p>
      </div>
    </div>
  );
}
