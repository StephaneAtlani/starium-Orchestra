'use client';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import type { AccessModelRolloutEntry } from '../api/access-model.api';
import { moduleLabel } from '../lib/labels';

export function AccessModelRolloutBanner({
  rollout,
}: {
  rollout: AccessModelRolloutEntry[];
}) {
  if (rollout.length === 0) return null;

  return (
    <Card className="mb-4 p-4">
      <h3 className="mb-2 text-sm font-medium">Rollout moteur d&apos;accès V2</h3>
      <p className="mb-3 text-xs text-muted-foreground">
        État des feature flags par module métier (lecture cockpit uniquement).
      </p>
      <div className="flex flex-wrap gap-2">
        {rollout.map((r) => (
          <Badge
            key={r.flagKey}
            variant={r.enabled ? 'default' : 'secondary'}
            className="text-xs"
          >
            {moduleLabel(r.module)} : {r.enabled ? 'activé' : 'inactif'}
          </Badge>
        ))}
      </div>
    </Card>
  );
}
