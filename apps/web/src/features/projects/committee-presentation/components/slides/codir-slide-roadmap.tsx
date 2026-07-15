'use client';

import type { CSSProperties } from 'react';
import { Check, Route } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MILESTONE_STATUS_LABEL } from '../../../constants/project-enum-labels';
import type { ProjectListItem, ProjectMilestoneApi } from '../../../types/project.types';

type RoadmapNode = {
  id: string;
  label: string;
  monthLabel: string;
  status: string;
};

function formatMonthLabel(iso: string): string {
  const month = new Date(iso).toLocaleDateString('fr-FR', { month: 'long' });
  return month.charAt(0).toUpperCase() + month.slice(1);
}

function buildRoadmapNodes(
  milestones: ProjectMilestoneApi[],
  project: ProjectListItem,
): RoadmapNode[] {
  const sorted = [...milestones]
    .filter((m) => m.status !== 'CANCELLED')
    .sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime());

  const nodes: RoadmapNode[] = sorted.slice(0, 5).map((m) => ({
    id: m.id,
    label: m.name,
    monthLabel: formatMonthLabel(m.targetDate),
    status: m.status,
  }));

  if (project.targetEndDate && nodes.length < 5) {
    const te = new Date(project.targetEndDate).getTime();
    const duplicate = sorted.some(
      (m) => Math.abs(new Date(m.targetDate).getTime() - te) < 43_200_000,
    );
    if (!duplicate) {
      nodes.push({
        id: 'target-end',
        label: 'Mise en prod',
        monthLabel: formatMonthLabel(project.targetEndDate),
        status: 'PLANNED',
      });
    }
  }

  return nodes;
}

function activeNodeIndex(nodes: RoadmapNode[]): number {
  const idx = nodes.findIndex((n) => n.status !== 'ACHIEVED');
  return idx === -1 ? Math.max(0, nodes.length - 1) : idx;
}

function nodeState(
  index: number,
  activeIndex: number,
  status: string,
): 'done' | 'active' | 'upcoming' | 'delayed' {
  if (status === 'DELAYED') return 'delayed';
  if (status === 'ACHIEVED' || index < activeIndex) return 'done';
  if (index === activeIndex) return 'active';
  return 'upcoming';
}

type CodirSlideRoadmapProps = {
  milestones: ProjectMilestoneApi[];
  project: ProjectListItem;
  isLoading?: boolean;
};

export function CodirSlideRoadmap({ milestones, project, isLoading }: CodirSlideRoadmapProps) {
  const nodes = buildRoadmapNodes(milestones, project);
  const activeIndex = activeNodeIndex(nodes);
  const achievedCount = nodes.filter((n) => n.status === 'ACHIEVED').length;
  const progressPct =
    nodes.length <= 1 ? 0 : (activeIndex / (nodes.length - 1)) * 100;

  const gridStyle = { '--roadmap-steps': nodes.length } as CSSProperties;

  return (
    <section className="starium-present-roadmap shrink-0" aria-label="Feuille de route">
      <div className="starium-present-roadmap__head">
        <p className="starium-present-roadmap__eyebrow">
          <Route className="size-3.5 shrink-0" aria-hidden />
          Feuille de route
        </p>
        {!isLoading && nodes.length > 0 ? (
          <span className="starium-present-roadmap__summary" aria-live="polite">
            {achievedCount}/{nodes.length} réalisé{achievedCount > 1 ? 's' : ''}
          </span>
        ) : null}
      </div>

      {isLoading ? (
        <div className="starium-present-roadmap__skeleton" aria-hidden>
          {Array.from({ length: 4 }).map((_, i) => (
            <span key={i} className="starium-present-roadmap__skeleton-cell" />
          ))}
        </div>
      ) : nodes.length === 0 ? (
        <p className="text-xs starium-present-text-muted">Aucun jalon planifié.</p>
      ) : (
        <div className="starium-present-roadmap__steps" role="list" style={gridStyle}>
          <div className="starium-present-roadmap__axis" aria-hidden>
            <div className="starium-present-roadmap__line">
              <div
                className="starium-present-roadmap__line-progress"
                style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }}
              />
            </div>
          </div>

          {nodes.map((node, index) => {
            const state = nodeState(index, activeIndex, node.status);
            const statusLabel = MILESTONE_STATUS_LABEL[node.status] ?? node.status;

            return (
              <article
                key={node.id}
                className="starium-present-roadmap__col"
                role="listitem"
                style={{ gridColumn: index + 1 }}
                aria-current={state === 'active' ? 'step' : undefined}
                aria-label={`${node.label}, ${node.monthLabel}, ${statusLabel}`}
              >
                <time
                  className={cn(
                    'starium-present-roadmap__month',
                    (state === 'active' || state === 'delayed') && 'starium-present-roadmap__month--highlight',
                  )}
                  dateTime={node.monthLabel}
                >
                  {node.monthLabel}
                </time>

                <div className="starium-present-roadmap__dot-wrap">
                  <span
                    className={cn(
                      'starium-present-roadmap__dot',
                      `starium-present-roadmap__dot--${state}`,
                    )}
                    aria-hidden
                  >
                    {state === 'done' ? (
                      <Check className="starium-present-roadmap__dot-icon" strokeWidth={3} />
                    ) : null}
                  </span>
                </div>

                <div className="starium-present-roadmap__caption">
                  <p
                    className={cn(
                      'starium-present-roadmap__name',
                      state === 'active' && 'starium-present-roadmap__name--active',
                      state === 'done' && 'starium-present-roadmap__name--done',
                      state === 'delayed' && 'starium-present-roadmap__name--delayed',
                    )}
                    title={node.label}
                  >
                    {node.label}
                  </p>
                  {state === 'delayed' ? (
                    <span className="starium-present-roadmap__flag">Retard</span>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
