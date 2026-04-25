'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StrategicObjectiveCard } from './strategic-objective-card';
import type { StrategicAxisDto } from '../types/strategic-vision.types';

export function StrategicAxisCard({ axis }: { axis: StrategicAxisDto }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{axis.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {axis.description ? (
          <p className="text-sm text-muted-foreground">{axis.description}</p>
        ) : (
          <p className="text-sm text-muted-foreground">Aucune description d'axe.</p>
        )}

        {axis.objectives.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun objectif sur cet axe.</p>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {axis.objectives.map((objective) => (
              <StrategicObjectiveCard key={objective.id} objective={objective} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
