'use client';

import { useMemo, useState, type Ref } from 'react';
import { Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { displayLabel } from '@/lib/display-label';
import { toast } from '@/lib/toast';
import { useProjectTeamsQuery } from '../hooks/use-project-governance-circles-query';
import { useProjectReviewMutations } from '../hooks/use-project-review-mutations';
import type { ProjectReviewParticipantApi } from '../types/project.types';
import { ProjectTeamsEditorDialog } from './project-teams/project-teams-editor-dialog';

type Props = {
  projectId: string;
  reviewId: string;
  participants: ProjectReviewParticipantApi[];
  canEdit: boolean;
  sectionRef?: Ref<HTMLElement>;
};

function apiErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'message' in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === 'string' && m.trim()) return m;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export function PrepareWorkspaceParticipants({
  projectId,
  reviewId,
  participants,
  canEdit,
  sectionRef,
}: Props) {
  const teamsQuery = useProjectTeamsQuery(projectId, { enabled: canEdit });
  const { conveneTeam, deleteParticipant } = useProjectReviewMutations(projectId);
  const [teamId, setTeamId] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorTeamId, setEditorTeamId] = useState<string | null>(null);

  const teams = teamsQuery.data?.items ?? [];

  const sorted = useMemo(
    () =>
      [...participants].sort((a, b) =>
        displayLabel(a.displayName, 'Participant').localeCompare(
          displayLabel(b.displayName, 'Participant'),
          'fr',
        ),
      ),
    [participants],
  );

  const onConvene = async (id: string) => {
    if (!id || !canEdit) return;
    const team = teams.find((t) => t.id === id);
    if (team && (team.memberCount ?? team.members?.length ?? 0) === 0) {
      setEditorTeamId(id);
      setEditorOpen(true);
      toast.message('Complétez les membres de l’équipe avant de convoquer');
      return;
    }
    try {
      const res = await conveneTeam.mutateAsync({ reviewId, teamId: id });
      toast.success(
        res.message ??
          `${res.addedCount} participant${res.addedCount > 1 ? 's' : ''} convoqué${res.addedCount > 1 ? 's' : ''}`,
      );
      setTeamId(id);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Convocation impossible'));
    }
  };

  return (
    <section
      ref={sectionRef}
      className="prepare-workspace__card"
      aria-labelledby="pw-parts-title"
    >
      <div className="prepare-workspace__card-h">
        <Users className="size-3.5" aria-hidden />
        <span id="pw-parts-title">
          Participants ({participants.length})
        </span>
        {canEdit ? (
          <button
            type="button"
            className="ml-auto text-[11.5px] font-bold normal-case tracking-normal text-[color:var(--brand-gold-700)] underline-offset-2 hover:underline"
            onClick={() => {
              setEditorTeamId(null);
              setEditorOpen(true);
            }}
          >
            Gérer
          </button>
        ) : null}
      </div>

      {canEdit ? (
        <div className="mb-2 space-y-1.5">
          {teams.length === 0 ? (
            <div className="prepare-workspace__empty">
              Aucune équipe sur le projet — créez-en une via Gérer
            </div>
          ) : (
            <>
              <label className="sr-only" htmlFor="pw-convene-team">
                Convoquer une équipe
              </label>
              <Select
                value={teamId || null}
                onValueChange={(v) => {
                  if (v) void onConvene(v);
                }}
                disabled={teamsQuery.isLoading || conveneTeam.isPending}
              >
                <SelectTrigger
                  id="pw-convene-team"
                  className="min-h-11 w-full"
                  aria-label="Convoquer une équipe"
                >
                  <SelectValue placeholder="Convoquer une équipe…" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {displayLabel(t.name, 'Équipe')} —{' '}
                      {t.memberCount ?? t.members?.length ?? 0} membre
                      {(t.memberCount ?? t.members?.length ?? 0) > 1
                        ? 's'
                        : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11.5px] font-semibold text-muted-foreground">
                Choisir une équipe du projet convoque tous ses membres
              </p>
            </>
          )}
        </div>
      ) : null}

      {sorted.length === 0 ? (
        <div className="prepare-workspace__empty">Aucun participant convoqué</div>
      ) : (
        <ul className="flex flex-wrap gap-1.5" aria-label="Liste des participants">
          {sorted.map((p) => (
            <li key={p.id} className="prepare-workspace__chip">
              <span className="inline-flex size-7 items-center justify-center rounded-full bg-muted text-[10px] font-bold">
                {displayLabel(p.displayName, '?')
                  .split(/\s+/)
                  .map((w) => w[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </span>
              <span className="truncate">
                {displayLabel(p.displayName, 'Participant')}
              </span>
              {canEdit ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0"
                  aria-label={`Retirer ${displayLabel(p.displayName, 'le participant')}`}
                  onClick={() => {
                    void deleteParticipant
                      .mutateAsync({ reviewId, participantId: p.id })
                      .then(() => toast.success('Participant retiré'))
                      .catch((err) =>
                        toast.error(apiErrorMessage(err, 'Retrait impossible')),
                      );
                  }}
                >
                  ×
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <ProjectTeamsEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        projectId={projectId}
        initialTeamId={editorTeamId}
      />
    </section>
  );
}
