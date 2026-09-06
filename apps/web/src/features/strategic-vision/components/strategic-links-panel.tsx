'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { cn } from '@/lib/utils';
import { firstDisplayLabel } from '@/lib/display-label';
import { useProjectsListQuery } from '@/features/projects/hooks/use-projects-list-query';
import {
  buildAddManualLinkBody,
  buildAddProjectLinkBody,
} from '../lib/strategic-link-payload';
import type { StrategicObjectiveDto } from '../types/strategic-vision.types';
import {
  useAddStrategicObjectiveLinkMutation,
  useRemoveStrategicObjectiveLinkMutation,
} from '../hooks/use-strategic-vision-queries';

type LinkMode = 'PROJECT' | 'MANUAL';

export function StrategicLinksPanel({
  objectives,
  canManageLinks,
}: {
  objectives: StrategicObjectiveDto[];
  canManageLinks: boolean;
}) {
  const [linkMode, setLinkMode] = useState<LinkMode>('PROJECT');
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [manualLabel, setManualLabel] = useState<string>('');
  const addLinkMutation = useAddStrategicObjectiveLinkMutation();
  const removeLinkMutation = useRemoveStrategicObjectiveLinkMutation();
  const projectsQ = useProjectsListQuery(
    { limit: 100, sortBy: 'name', sortOrder: 'asc' },
    { enabled: canManageLinks && linkMode === 'PROJECT' },
  );

  const objectiveOptions = useMemo(
    () => objectives.map((objective) => ({ id: objective.id, title: objective.title })),
    [objectives],
  );

  const projectOptions = useMemo(() => {
    const items = projectsQ.data?.items ?? [];
    return items.map((project) => ({
      id: project.id,
      label: firstDisplayLabel([project.name, project.code], 'Projet'),
    }));
  }, [projectsQ.data?.items]);

  const selectedProjectLabel =
    projectOptions.find((p) => p.id === selectedProjectId)?.label ?? '';

  const selectedObjectiveTitle =
    objectiveOptions.find((o) => o.id === selectedObjectiveId)?.title ?? 'Objectif';

  const flattenedLinks = useMemo(
    () =>
      objectives.flatMap((objective) =>
        objective.links.map((link) => ({
          ...link,
          objectiveTitle: objective.title,
        })),
      ),
    [objectives],
  );

  const isSubmitting = addLinkMutation.isPending || removeLinkMutation.isPending;

  async function handleAddLink() {
    const objectiveId = selectedObjectiveId.trim();
    if (!objectiveId) return;

    if (linkMode === 'PROJECT') {
      const targetId = selectedProjectId.trim();
      if (!targetId || !selectedProjectLabel) return;
      await addLinkMutation.mutateAsync({
        objectiveId,
        body: buildAddProjectLinkBody({
          id: targetId,
          label: selectedProjectLabel,
        }),
      });
      setSelectedProjectId('');
      return;
    }

    const targetLabelSnapshot = manualLabel.trim();
    if (!targetLabelSnapshot) return;
    await addLinkMutation.mutateAsync({
      objectiveId,
      body: buildAddManualLinkBody(targetLabelSnapshot),
    });
    setManualLabel('');
  }

  async function handleRemoveLink(objectiveId: string, linkId: string) {
    await removeLinkMutation.mutateAsync({ objectiveId, linkId });
  }

  const canSubmit =
    !!selectedObjectiveId &&
    !isSubmitting &&
    (linkMode === 'PROJECT'
      ? !!selectedProjectId && !!selectedProjectLabel
      : !!manualLabel.trim());

  return (
    <Card>
      <CardHeader>
        <CardTitle>Liens stratégiques</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {canManageLinks ? (
          <div className="space-y-3 rounded-lg border border-dashed border-border/80 p-3">
            <div
              className="starium-tab-group"
              role="group"
              aria-label="Type de lien stratégique"
            >
              <button
                type="button"
                className={cn(
                  'starium-tab-btn min-h-11 sm:min-h-9',
                  linkMode === 'PROJECT' && 'starium-tab-btn--active',
                )}
                aria-pressed={linkMode === 'PROJECT'}
                onClick={() => setLinkMode('PROJECT')}
                disabled={isSubmitting}
              >
                Projet
              </button>
              <button
                type="button"
                className={cn(
                  'starium-tab-btn min-h-11 sm:min-h-9',
                  linkMode === 'MANUAL' && 'starium-tab-btn--active',
                )}
                aria-pressed={linkMode === 'MANUAL'}
                onClick={() => setLinkMode('MANUAL')}
                disabled={isSubmitting}
              >
                Manuel
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-[1fr_1.4fr_auto] md:items-end">
              <div className="space-y-1.5">
                <Label htmlFor="sv-link-objective">Objectif</Label>
                <Select
                  value={selectedObjectiveId}
                  onValueChange={(v) => setSelectedObjectiveId(v ?? '')}
                  disabled={isSubmitting}
                >
                  <SelectTrigger
                    id="sv-link-objective"
                    className="min-h-11 w-full sm:min-h-9"
                    aria-label="Choisir un objectif"
                  >
                    <SelectValue placeholder="Choisir un objectif">
                      {selectedObjectiveId ? selectedObjectiveTitle : null}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {objectiveOptions.map((objective) => (
                      <SelectItem key={objective.id} value={objective.id}>
                        {objective.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {linkMode === 'PROJECT' ? (
                <div className="space-y-1.5">
                  <Label htmlFor="sv-link-project">Projet</Label>
                  {projectsQ.isLoading ? (
                    <LoadingState rows={1} />
                  ) : projectsQ.isError ? (
                    <ErrorState
                      message="Impossible de charger les projets."
                      onRetry={() => void projectsQ.refetch()}
                    />
                  ) : projectOptions.length === 0 ? (
                    <EmptyState
                      title="Aucun projet"
                      description="Aucun projet disponible pour ce client."
                    />
                  ) : (
                    <Select
                      value={selectedProjectId}
                      onValueChange={(v) => setSelectedProjectId(v ?? '')}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger
                        id="sv-link-project"
                        className="min-h-11 w-full sm:min-h-9"
                        aria-label="Choisir un projet"
                      >
                        <SelectValue placeholder="Choisir un projet">
                          {selectedProjectId ? selectedProjectLabel : null}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {projectOptions.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label htmlFor="sv-link-manual">Libellé métier</Label>
                  <Input
                    id="sv-link-manual"
                    className="min-h-11 sm:min-h-9"
                    placeholder="Libellé métier du lien"
                    value={manualLabel}
                    onChange={(event) => setManualLabel(event.target.value)}
                    disabled={isSubmitting}
                    aria-label="Libellé métier du lien manuel"
                  />
                </div>
              )}

              <Button
                type="button"
                className="min-h-11 sm:min-h-9"
                onClick={() => void handleAddLink()}
                disabled={!canSubmit}
              >
                Ajouter
              </Button>
            </div>
          </div>
        ) : null}

        {flattenedLinks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun lien stratégique disponible.
          </p>
        ) : (
          <ul className="space-y-2">
            {flattenedLinks.map((link) => (
              <li
                key={link.id}
                className="flex flex-wrap items-center justify-between gap-2 text-sm"
              >
                <div className="min-w-0">
                  <span className="font-medium">{link.targetLabelSnapshot}</span>
                  <span className="text-muted-foreground">
                    {' '}
                    — {link.linkType === 'PROJECT' ? 'Projet' : 'Manuel'} · Objectif:{' '}
                    {link.objectiveTitle}
                  </span>
                </div>
                {canManageLinks ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-11 sm:min-h-9"
                    onClick={() => void handleRemoveLink(link.objectiveId, link.id)}
                    disabled={isSubmitting}
                  >
                    Supprimer
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
