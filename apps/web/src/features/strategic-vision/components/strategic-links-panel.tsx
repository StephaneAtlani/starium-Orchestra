'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { StrategicObjectiveDto } from '../types/strategic-vision.types';
import { buildStrategicProjectLinkRows } from '../lib/strategic-links-view';

export function StrategicLinksPanel({
  objectives,
}: {
  objectives: StrategicObjectiveDto[];
}) {
  const links = buildStrategicProjectLinkRows(objectives);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Projets lies</CardTitle>
      </CardHeader>
      <CardContent>
        {links.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun lien projet disponible pour les objectifs strategiques.
          </p>
        ) : (
          <ul className="space-y-2">
            {links.map((link) => (
              <li key={link.id} className="text-sm">
                <span className="font-medium">{link.targetLabelSnapshot}</span>
                <span className="text-muted-foreground"> - Objectif: {link.objectiveTitle}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
