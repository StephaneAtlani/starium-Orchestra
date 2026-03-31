'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

type Props = {
  plannerPlanTitle: string | null;
  canEdit: boolean;
  configureDisabled: boolean;
  dissociateDisabled: boolean;
  onConfigure: () => void;
  onDissociate: () => void;
};

export function MicrosoftPlannerCard({
  plannerPlanTitle,
  canEdit,
  configureDisabled,
  dissociateDisabled,
  onConfigure,
  onDissociate,
}: Props) {
  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle className="text-base">Planner</CardTitle>
        <CardDescription>Plan Microsoft Planner cible pour les tâches.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <dl className="text-sm">
          <dt className="text-muted-foreground">Plan</dt>
          <dd className="font-medium">{plannerPlanTitle ?? '—'}</dd>
        </dl>
        {canEdit ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={onConfigure} disabled={configureDisabled}>
              Configurer
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onDissociate}
              disabled={dissociateDisabled}
            >
              Dissocier
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
