'use client';

import { AlertTriangle, Flag, Users } from 'lucide-react';
import { UserInitialsAvatarStack } from '@/components/ui/user-initials-avatar';
import { PROJECT_CRITICALITY_LABEL } from '../../../constants/project-enum-labels';
import { formatProjectDateLong } from '../../../lib/projects-list-display';
import type {
  ProjectListItem,
  ProjectMilestoneApi,
  ProjectTeamMemberApi,
} from '../../../types/project.types';

const TEAM_THEME_INDICES = [1, 2, 0, 5] as const;

function findNextMilestone(items: ProjectMilestoneApi[]) {
  const open = items.filter((m) => m.status !== 'ACHIEVED' && m.status !== 'CANCELLED');
  if (open.length === 0) return null;
  const now = Date.now();
  const upcoming = [...open].sort(
    (a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime(),
  );
  return upcoming.find((m) => new Date(m.targetDate).getTime() >= now) ?? upcoming[0];
}

function primaryRisk(project: ProjectListItem): { title: string; level: string } {
  const snap = project.pilotageSnapshot;
  const title = snap?.openRisks[0]?.title?.trim();
  if (title) {
    const level =
      project.computedHealth === 'RED'
        ? 'Niveau élevé'
        : project.computedHealth === 'ORANGE'
          ? 'Niveau modéré'
          : 'Niveau faible';
    return { title, level };
  }
  if (project.openRisksCount === 0) {
    return { title: 'Aucun risque ouvert', level: '—' };
  }
  return {
    title: `${project.openRisksCount} risque${project.openRisksCount > 1 ? 's' : ''} ouvert${project.openRisksCount > 1 ? 's' : ''}`,
    level: PROJECT_CRITICALITY_LABEL[project.criticality] ?? 'À qualifier',
  };
}

type CodirSlideInsightRowProps = {
  project: ProjectListItem;
  milestones: ProjectMilestoneApi[];
  team: ProjectTeamMemberApi[];
  milestonesLoading?: boolean;
  teamLoading?: boolean;
};

export function CodirSlideInsightRow({
  project,
  milestones,
  team,
  milestonesLoading,
  teamLoading,
}: CodirSlideInsightRowProps) {
  const nextMilestone = findNextMilestone(milestones);
  const risk = primaryRisk(project);
  const visibleTeam = team.slice(0, 4);

  return (
    <div className="starium-present-insight-row shrink-0" role="group" aria-label="Synthèse projet">
      <article className="starium-present-insight-card">
        <div className="starium-present-insight-card__head">
          <Flag className="size-3.5 shrink-0 text-[color:var(--brand-gold)]" aria-hidden />
          <h4 className="starium-present-insight-card__title">Prochain jalon</h4>
        </div>
        {milestonesLoading ? (
          <p className="text-xs starium-present-text-muted">Chargement…</p>
        ) : nextMilestone ? (
          <>
            <p className="starium-present-insight-card__value">{nextMilestone.name}</p>
            <p className="starium-present-insight-card__sub">
              {formatProjectDateLong(nextMilestone.targetDate)}
            </p>
          </>
        ) : (
          <p className="text-xs starium-present-text-muted">Aucun jalon à venir.</p>
        )}
      </article>

      <article className="starium-present-insight-card">
        <div className="starium-present-insight-card__head">
          <AlertTriangle className="size-3.5 shrink-0 text-[color:var(--state-warning)]" aria-hidden />
          <h4 className="starium-present-insight-card__title">Risque principal</h4>
        </div>
        <p className="starium-present-insight-card__value">{risk.title}</p>
        <p className="starium-present-insight-card__sub starium-present-insight-card__sub--warn">
          {risk.level}
        </p>
      </article>

      <article className="starium-present-insight-card">
        <div className="starium-present-insight-card__head">
          <Users className="size-3.5 shrink-0 text-[color:var(--state-info)]" aria-hidden />
          <h4 className="starium-present-insight-card__title">
            Équipe{team.length > 0 ? ` · ${team.length}` : ''}
          </h4>
        </div>
        {teamLoading ? (
          <p className="text-xs starium-present-text-muted">Chargement…</p>
        ) : visibleTeam.length > 0 ? (
          <UserInitialsAvatarStack
            members={visibleTeam.map((member, index) => ({
              id: member.id,
              displayName: member.displayName,
              seed: member.userId ?? member.id,
              themeIndex: TEAM_THEME_INDICES[index] ?? index,
            }))}
            max={4}
            size="md"
            className="mt-1"
            listLabel={`${team.length} membres de l'équipe`}
          />
        ) : (
          <p className="text-xs starium-present-text-muted">Équipe non renseignée.</p>
        )}
      </article>
    </div>
  );
}
