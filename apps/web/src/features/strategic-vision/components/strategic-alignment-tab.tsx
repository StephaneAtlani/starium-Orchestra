'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type {
  StrategicAxisDto,
  StrategicObjectiveDto,
  StrategicVisionKpisResponseDto,
} from '../types/strategic-vision.types';
import { splitAxisLogoAndTitle } from '../lib/strategic-vision-tabs-view';

type ProjectAlignmentRow = {
  projectId: string;
  projectLabel: string;
  objectiveTitles: string[];
};

function buildAxisNameById(axes: StrategicAxisDto[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const axis of axes) {
    map.set(axis.id, splitAxisLogoAndTitle(axis.name).title);
  }
  return map;
}

function buildProjectAlignmentRows(objectives: StrategicObjectiveDto[]): ProjectAlignmentRow[] {
  const byProject = new Map<string, ProjectAlignmentRow>();
  for (const objective of objectives) {
    for (const link of objective.links ?? []) {
      if (link.linkType !== 'PROJECT') continue;
      const current = byProject.get(link.targetId) ?? {
        projectId: link.targetId,
        projectLabel: link.targetLabelSnapshot,
        objectiveTitles: [],
      };
      current.objectiveTitles.push(objective.title);
      byProject.set(link.targetId, current);
    }
  }
  return Array.from(byProject.values()).sort((a, b) =>
    a.projectLabel.localeCompare(b.projectLabel, 'fr'),
  );
}

export function StrategicAlignmentTab({
  axes,
  objectives,
  kpis,
}: {
  axes: StrategicAxisDto[];
  objectives: StrategicObjectiveDto[];
  kpis?: StrategicVisionKpisResponseDto;
}) {
  const axisNameById = buildAxisNameById(axes);
  const objectivesWithoutProject = objectives
    .filter((objective) => !(objective.links ?? []).some((link) => link.linkType === 'PROJECT'))
    .sort((a, b) => a.title.localeCompare(b.title, 'fr'));

  const projectRows = buildProjectAlignmentRows(objectives);
  const projectsWithManyObjectives = projectRows
    .filter((row) => row.objectiveTitles.length > 1)
    .sort((a, b) => b.objectiveTitles.length - a.objectiveTitles.length);

  const objectivesByAxis = axes
    .map((axis) => {
      const objectivesForAxis = objectives.filter((objective) => objective.axisId === axis.id);
      const linkedCount = objectivesForAxis.filter((objective) =>
        (objective.links ?? []).some((link) => link.linkType === 'PROJECT'),
      ).length;
      const total = objectivesForAxis.length;
      return {
        axisId: axis.id,
        axisName: splitAxisLogoAndTitle(axis.name).title,
        linkedCount,
        total,
        coverage: total > 0 ? Math.round((linkedCount / total) * 100) : 0,
      };
    })
    .sort((a, b) => a.axisName.localeCompare(b.axisName, 'fr'));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Card size="sm">
          <CardHeader>
            <CardTitle>Couverture objectifs lies</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {objectives.length === 0
                ? '0%'
                : `${Math.round(((objectives.length - objectivesWithoutProject.length) / objectives.length) * 100)}%`}
            </p>
            <p className="text-xs text-muted-foreground">
              {objectives.length - objectivesWithoutProject.length}/{objectives.length} objectifs
            </p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle>Projets alignes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{projectRows.length}</p>
            <p className="text-xs text-muted-foreground">
              {kpis ? `${kpis.unalignedProjectsCount} projets non alignes` : 'Base liens objectifs'}
            </p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle>Objectifs sans lien projet</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{objectivesWithoutProject.length}</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle>Alignement global</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {kpis ? `${Math.round(kpis.projectAlignmentRate * 100)}%` : '—'}
            </p>
            <p className="text-xs text-muted-foreground">
              {kpis ? 'KPI strategic-vision/kpis' : 'KPI indisponible'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Couverture par axe strategique</CardTitle>
          </CardHeader>
          <CardContent>
            {objectivesByAxis.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun axe disponible.</p>
            ) : (
              <ul className="space-y-2">
                {objectivesByAxis.map((row) => (
                  <li key={row.axisId} className="rounded-md border border-border/60 p-2">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium">{row.axisName}</p>
                      <p className="text-xs text-muted-foreground">{row.coverage}%</p>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {row.linkedCount}/{row.total} objectifs lies a au moins un projet
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Objectifs sans projet rattache</CardTitle>
          </CardHeader>
          <CardContent>
            {objectivesWithoutProject.length === 0 ? (
              <p className="text-sm text-muted-foreground">Tous les objectifs ont au moins un lien projet.</p>
            ) : (
              <ul className="space-y-2">
                {objectivesWithoutProject.map((objective) => (
                  <li key={objective.id} className="rounded-md border border-border/60 p-2">
                    <p className="text-sm font-medium">{objective.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Axe: {axisNameById.get(objective.axisId) ?? 'Sans axe'}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Matrice projets ↔ objectifs</CardTitle>
          </CardHeader>
          <CardContent>
            {projectRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun lien projet disponible.</p>
            ) : (
              <ul className="space-y-2">
                {projectRows.map((row) => (
                  <li key={row.projectId} className="rounded-md border border-border/60 p-2">
                    <p className="text-sm font-medium">{row.projectLabel}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.objectiveTitles.length} objectif(s): {row.objectiveTitles.join(', ')}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Projets relies a plusieurs objectifs</CardTitle>
          </CardHeader>
          <CardContent>
            {projectsWithManyObjectives.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun projet multi-objectifs.</p>
            ) : (
              <ul className="space-y-2">
                {projectsWithManyObjectives.map((row) => (
                  <li key={row.projectId} className="rounded-md border border-border/60 p-2">
                    <p className="text-sm font-medium">{row.projectLabel}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.objectiveTitles.length} objectifs: {row.objectiveTitles.join(', ')}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
