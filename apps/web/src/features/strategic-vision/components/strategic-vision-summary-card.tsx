'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { StrategicVisionDto } from '../types/strategic-vision.types';

export function StrategicVisionSummaryCard({ vision }: { vision: StrategicVisionDto }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{vision.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{vision.statement}</p>
        <p className="text-sm">
          Horizon: <span className="font-medium">{vision.horizonLabel}</span>
        </p>
      </CardContent>
    </Card>
  );
}
