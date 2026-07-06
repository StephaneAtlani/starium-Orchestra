'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Pencil } from 'lucide-react';
import type { StrategicVisionDto } from '../types/strategic-vision.types';

export function StrategicVisionSummaryCard({
  vision,
  ownerLabel,
  showEditIndicator = false,
}: {
  vision: StrategicVisionDto;
  ownerLabel?: string;
  showEditIndicator?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="gap-2">
        <div className="flex items-start justify-between gap-3">
          <CardTitle>{vision.title}</CardTitle>
          {showEditIndicator ? <Pencil className="size-4 text-muted-foreground" /> : null}
        </div>
        <div className="flex flex-wrap gap-1">
          <Badge variant={vision.isActive ? 'default' : 'outline'}>
            {vision.isActive ? 'Active' : 'Inactive'}
          </Badge>
          <Badge variant="secondary">Horizon: {vision.horizonLabel}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <blockquote className="relative px-7 text-[19px] font-semibold leading-relaxed tracking-tight text-foreground">
          <span
            aria-hidden
            className="absolute -left-1 -top-2 font-serif text-5xl leading-none text-[color:var(--brand-gold)]"
          >
            &ldquo;
          </span>
          {vision.statement}
          <span
            aria-hidden
            className="ml-1 align-bottom font-serif text-5xl leading-none text-[color:var(--brand-gold)]"
          >
            &rdquo;
          </span>
        </blockquote>
        <p className="text-sm text-muted-foreground">
          Responsable :{' '}
          <span className="font-medium text-foreground">
            {ownerLabel ?? 'Non défini'}
          </span>
        </p>
      </CardContent>
    </Card>
  );
}
