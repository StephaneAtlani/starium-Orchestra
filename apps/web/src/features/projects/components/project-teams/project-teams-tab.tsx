'use client';

import { useMemo, useState } from 'react';
import { Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingState } from '@/components/feedback/loading-state';
import {
  UserInitialsAvatar,
} from '@/components/ui/user-initials-avatar';
import { displayLabel, firstDisplayLabel } from '@/lib/display-label';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/hooks/use-permissions';
import { useProjectTeamsQuery } from '../../hooks/use-project-governance-circles-query';
import {
  PROJECT_TEAM_COLOR_BORDER,
  resolveTeamColorToken,
} from '../../lib/project-team-color';
import type { ProjectGovernanceCircleApi } from '../../types/project.types';
import { ProjectTeamsEditorDialog } from './project-teams-editor-dialog';

type Props = {
  projectId: string;
};

function memberLabel(team: ProjectGovernanceCircleApi, count: number): string {
  if (count === 0) return '0 membre';
  if (count === 1) return '1 membre';
  return `${count} membres`;
}

function pointsLabel(count: number): string {
  if (count <= 0) return 'Aucun point rattaché';
  if (count === 1) return '1 point projet';
  return `${count} points projet`;
}

function TeamCard({
  team,
  onOpen,
}: {
  team: ProjectGovernanceCircleApi;
  onOpen: () => void;
}) {
  const color = resolveTeamColorToken(team.colorToken);
  const members = team.members ?? [];
  const memberCount = team.memberCount ?? members.length;
  const reviewCount = team.reviewConvocationCount ?? 0;
  const visible = members.slice(0, 5);
  const overflow = Math.max(0, memberCount - visible.length);
  const name = displayLabel(team.name, 'Équipe');
  const label = team.label?.trim() || null;
  const pilot = firstDisplayLabel(
    [team.pilotDisplayName],
    'Non désigné',
  );

  return (
    <article>
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          'flex h-full min-h-[11rem] w-full flex-col rounded-[var(--radius-lg)] border border-border/70 bg-card p-4 text-left shadow-[var(--shadow-1)]',
          'border-l-[3px] transition-[border-color,box-shadow,background-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)]',
          'hover:border-border hover:shadow-[var(--shadow-2)]',
          'focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]',
          PROJECT_TEAM_COLOR_BORDER[color],
        )}
        aria-label={`Ouvrir l’équipe ${name}`}
      >
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold tracking-tight text-foreground">
            {name}
          </h3>
          {label ? (
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{label}</p>
          ) : (
            <p className="mt-0.5 text-sm text-muted-foreground">Sans libellé</p>
          )}
        </div>

        <div className="mt-4 flex min-h-8 flex-wrap items-center gap-1.5">
          {visible.length === 0 ? (
            <span className="text-xs text-muted-foreground">Aucun membre</span>
          ) : (
            <>
              {visible.map((m) => {
                const display = displayLabel(m.displayName, 'Membre');
                return (
                  <UserInitialsAvatar
                    key={m.identityKey}
                    displayName={display}
                    seed={m.identityKey}
                    size="sm"
                    className="rounded-md border-border/60"
                    title={display}
                  />
                );
              })}
              {overflow > 0 ? (
                <span
                  className="inline-flex size-8 items-center justify-center rounded-md border border-border/70 bg-muted/40 text-[10px] font-semibold text-muted-foreground"
                  aria-label={`${overflow} membres supplémentaires`}
                >
                  +{overflow}
                </span>
              ) : null}
            </>
          )}
        </div>

        <div className="mt-auto border-t border-dashed border-border/70 pt-3">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span>{memberLabel(team, memberCount)}</span>
            <span aria-hidden>·</span>
            <span>{pointsLabel(reviewCount)}</span>
            <span aria-hidden>·</span>
            <span>
              Pilote :{' '}
              <span className="font-medium text-foreground/80">{pilot}</span>
            </span>
          </p>
        </div>
      </button>
    </article>
  );
}

function NewTeamCard({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'flex min-h-[11rem] w-full flex-col items-center justify-center gap-1 rounded-[var(--radius-lg)] border border-dashed border-border/80 bg-transparent p-4 text-center',
        'transition-[border-color,background-color,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-standard)]',
        'hover:border-solid hover:border-border hover:bg-card hover:shadow-[var(--shadow-1)]',
        'focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]',
      )}
      aria-label="Créer une nouvelle équipe"
    >
      <span className="text-sm font-semibold text-[color:var(--brand-gold-700)]">
        + Nouvelle équipe
      </span>
      <span className="max-w-[14rem] text-xs text-muted-foreground">
        COPIL, COTECH, comité risques…
      </span>
    </button>
  );
}

export function ProjectTeamsTab({ projectId }: Props) {
  const { has } = usePermissions();
  const canEdit = has('projects.update');
  const query = useProjectTeamsQuery(projectId);
  const teams = useMemo(() => query.data?.items ?? [], [query.data?.items]);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorTeamId, setEditorTeamId] = useState<string | null>(null);
  const [editorCreate, setEditorCreate] = useState(false);

  const openCreate = () => {
    setEditorTeamId(null);
    setEditorCreate(true);
    setEditorOpen(true);
  };

  const openTeam = (teamId: string) => {
    setEditorTeamId(teamId);
    setEditorCreate(false);
    setEditorOpen(true);
  };

  return (
    <div className="starium-module space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight sm:text-2xl">
            <Users className="size-5 shrink-0 text-[color:var(--brand-gold)]" aria-hidden />
            Équipes du projet
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            COPIL, COPROJ, COTECH… Composez les instances une fois : elles servent
            aux points projet, aux convocations et au suivi de présence.
          </p>
        </div>
        {canEdit ? (
          <Button
            type="button"
            className="min-h-11 shrink-0"
            onClick={openCreate}
          >
            <Plus className="size-4" aria-hidden />
            Créer une équipe
          </Button>
        ) : null}
      </div>

      {query.isLoading ? (
        <LoadingState rows={4} />
      ) : query.isError ? (
        <ErrorState
          message="Impossible de charger les équipes du projet."
          onRetry={() => void query.refetch()}
        />
      ) : teams.length === 0 && !canEdit ? (
        <EmptyState
          title="Aucune équipe"
          description="Aucune instance de pilotage n’est définie sur ce projet."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {teams.map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              onOpen={() => openTeam(team.id)}
            />
          ))}
          {canEdit ? <NewTeamCard onOpen={openCreate} /> : null}
        </div>
      )}

      <ProjectTeamsEditorDialog
        projectId={projectId}
        open={editorOpen}
        onOpenChange={setEditorOpen}
        initialTeamId={editorTeamId}
        startInCreate={editorCreate}
        canEdit={canEdit}
      />
    </div>
  );
}
