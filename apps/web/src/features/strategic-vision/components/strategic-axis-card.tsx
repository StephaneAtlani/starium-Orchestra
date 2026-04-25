'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type {
  StrategicAxisDto,
  StrategicObjectiveDto,
  StrategicObjectiveStatus,
} from '../types/strategic-vision.types';
import { splitAxisLogoAndTitle } from '../lib/strategic-vision-tabs-view';
import { STRATEGIC_AXIS_ICONS, strategicAxisIconColorClass } from './strategic-axis-icons';

function countByStatus(
  objectives: StrategicObjectiveDto[],
  status: StrategicObjectiveStatus,
): number {
  return objectives.filter((objective) => objective.status === status).length;
}

export function StrategicAxisCard({
  axis,
  displayIndex,
  isSelected = false,
  onSelect,
  canUpdate = false,
  onEdit,
  draggable = false,
  onDragStart,
  onDrop,
}: {
  axis: StrategicAxisDto;
  displayIndex?: number;
  isSelected?: boolean;
  onSelect?: (axisId: string) => void;
  canUpdate?: boolean;
  onEdit?: (axis: StrategicAxisDto) => void;
  draggable?: boolean;
  onDragStart?: (axisId: string) => void;
  onDrop?: (axisId: string) => void;
}) {
  const objectiveCount = axis.objectives.length;
  const { logo, title, color } = splitAxisLogoAndTitle(axis.name);
  const AxisIcon = logo ? STRATEGIC_AXIS_ICONS[logo as keyof typeof STRATEGIC_AXIS_ICONS] : null;
  return (
    <Card
      className={isSelected ? 'border-primary/60 ring-1 ring-primary/30' : undefined}
      role={onSelect ? 'button' : undefined}
      draggable={draggable}
      onDragStart={draggable ? () => onDragStart?.(axis.id) : undefined}
      onDragOver={draggable ? (event) => event.preventDefault() : undefined}
      onDrop={draggable ? () => onDrop?.(axis.id) : undefined}
      onClick={onSelect ? () => onSelect(axis.id) : undefined}
    >
      <CardHeader className="gap-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle>
            {displayIndex ? `${String(displayIndex).padStart(2, '0')} · ` : ''}
            {AxisIcon ? (
              <AxisIcon
                className={`mr-1 inline-block size-4 align-text-bottom ${strategicAxisIconColorClass(color)}`}
              />
            ) : null}
            {title}
          </CardTitle>
          {canUpdate && onEdit ? (
            <Button
              size="sm"
              variant="outline"
              onClick={(event) => {
                event.stopPropagation();
                onEdit(axis);
              }}
            >
              Modifier
            </Button>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-1">
          <Badge variant="secondary">{objectiveCount} objectif(s)</Badge>
          {draggable ? <Badge variant="outline">Glisser-déposer</Badge> : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {axis.description ? (
          <p className="text-sm text-muted-foreground">{axis.description}</p>
        ) : (
          <p className="text-sm text-muted-foreground">Aucune description d'axe.</p>
        )}
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground md:grid-cols-5">
          <span>ON_TRACK: {countByStatus(axis.objectives, 'ON_TRACK')}</span>
          <span>AT_RISK: {countByStatus(axis.objectives, 'AT_RISK')}</span>
          <span>OFF_TRACK: {countByStatus(axis.objectives, 'OFF_TRACK')}</span>
          <span>COMPLETED: {countByStatus(axis.objectives, 'COMPLETED')}</span>
          <span>ARCHIVED: {countByStatus(axis.objectives, 'ARCHIVED')}</span>
        </div>
      </CardContent>
    </Card>
  );
}
