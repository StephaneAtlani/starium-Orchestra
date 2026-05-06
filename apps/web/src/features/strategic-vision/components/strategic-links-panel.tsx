'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { StrategicObjectiveDto } from '../types/strategic-vision.types';
import {
  useAddStrategicObjectiveLinkMutation,
  useRemoveStrategicObjectiveLinkMutation,
} from '../hooks/use-strategic-vision-queries';

export function StrategicLinksPanel({
  objectives,
  canManageLinks,
}: {
  objectives: StrategicObjectiveDto[];
  canManageLinks: boolean;
}) {
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<string>('');
  const [manualLabel, setManualLabel] = useState<string>('');
  const addLinkMutation = useAddStrategicObjectiveLinkMutation();
  const removeLinkMutation = useRemoveStrategicObjectiveLinkMutation();
  const objectiveOptions = useMemo(
    () => objectives.map((objective) => ({ id: objective.id, title: objective.title })),
    [objectives],
  );
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

  async function handleAddManualLink() {
    const objectiveId = selectedObjectiveId.trim();
    const targetLabelSnapshot = manualLabel.trim();
    if (!objectiveId || !targetLabelSnapshot) return;
    await addLinkMutation.mutateAsync({
      objectiveId,
      body: {
        linkType: 'MANUAL',
        targetLabelSnapshot,
      },
    });
    setManualLabel('');
  }

  async function handleRemoveLink(objectiveId: string, linkId: string) {
    await removeLinkMutation.mutateAsync({ objectiveId, linkId });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Liens stratégiques</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {canManageLinks ? (
          <div className="grid gap-2 rounded-lg border border-dashed p-3 md:grid-cols-[1fr_2fr_auto]">
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={selectedObjectiveId}
              onChange={(event) => setSelectedObjectiveId(event.target.value)}
              disabled={isSubmitting}
            >
              <option value="">Choisir un objectif</option>
              {objectiveOptions.map((objective) => (
                <option key={objective.id} value={objective.id}>
                  {objective.title}
                </option>
              ))}
            </select>
            <Input
              placeholder="Libellé métier du lien"
              value={manualLabel}
              onChange={(event) => setManualLabel(event.target.value)}
              disabled={isSubmitting}
            />
            <Button
              type="button"
              onClick={() => void handleAddManualLink()}
              disabled={!selectedObjectiveId || !manualLabel.trim() || isSubmitting}
            >
              Ajouter
            </Button>
          </div>
        ) : null}

        {flattenedLinks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun lien stratégique disponible.
          </p>
        ) : (
          <ul className="space-y-2">
            {flattenedLinks.map((link) => (
              <li key={link.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <span className="font-medium">{link.targetLabelSnapshot}</span>
                  <span className="text-muted-foreground"> - Objectif: {link.objectiveTitle}</span>
                </div>
                {canManageLinks ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
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
