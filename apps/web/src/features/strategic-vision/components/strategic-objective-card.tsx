'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ObjectiveStatusBadge } from './objective-status-badge';
import type { StrategicObjectiveDto } from '../types/strategic-vision.types';

function formatDate(value: string | null): string {
  if (!value) return 'Non defini';
  try {
    return new Date(value).toLocaleDateString('fr-FR');
  } catch {
    return 'Non defini';
  }
}

export function StrategicObjectiveCard({
  objective,
}: {
  objective: StrategicObjectiveDto;
}) {
  return (
    <Card size="sm">
      <CardHeader className="gap-2">
        <CardTitle>{objective.title}</CardTitle>
        <ObjectiveStatusBadge status={objective.status} />
      </CardHeader>
      <CardContent className="space-y-2">
        {objective.description ? (
          <p className="text-sm text-muted-foreground">{objective.description}</p>
        ) : (
          <p className="text-sm text-muted-foreground">Aucune description.</p>
        )}
        <p className="text-sm">
          Responsable:{' '}
          <span className="font-medium">{objective.ownerLabel ?? 'Non assigne'}</span>
        </p>
        <p className="text-sm">
          Echeance: <span className="font-medium">{formatDate(objective.deadline)}</span>
        </p>
      </CardContent>
    </Card>
  );
}
