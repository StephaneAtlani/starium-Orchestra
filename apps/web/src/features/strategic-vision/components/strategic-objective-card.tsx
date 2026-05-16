'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ObjectiveStatusBadge } from './objective-status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ResourceAclTriggerButton } from '@/features/resource-acl/components/resource-acl-trigger-button';
import { AccessExplainerPopover } from '@/features/access-diagnostics/components/access-explainer-popover';
import type { StrategicLinkDto, StrategicObjectiveDto } from '../types/strategic-vision.types';
import { OwnerOrgUnitNullWarning } from '@/features/organization/components/owner-org-unit-null-warning';
import type { OwnerOrgUnitSummary } from '@/features/organization/types/owner-org-unit-summary';

function formatOwnerOrgSummary(summary: OwnerOrgUnitSummary | null | undefined): string {
  if (!summary) return 'Non définie';
  return summary.code ? `${summary.name} (${summary.code})` : summary.name;
}

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
  axisName,
  showAxis = false,
  canUpdate = false,
  onEdit,
}: {
  objective: StrategicObjectiveDto;
  axisName?: string;
  showAxis?: boolean;
  canUpdate?: boolean;
  onEdit?: (objective: StrategicObjectiveDto) => void;
}) {
  const projectLinks = (objective.links ?? []).filter(
    (link: StrategicLinkDto) => link.linkType === 'PROJECT',
  );

  return (
    <Card size="sm">
      <CardHeader className="gap-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle>{objective.title}</CardTitle>
          <div className="flex shrink-0 items-center gap-2">
            <ResourceAclTriggerButton
              resourceType="STRATEGIC_OBJECTIVE"
              resourceId={objective.id}
              resourceLabel={objective.title}
              size="sm"
            />
            <AccessExplainerPopover
              resourceType="STRATEGIC_OBJECTIVE"
              resourceId={objective.id}
              resourceLabel={objective.title}
              intent="READ"
            />
            {canUpdate && onEdit ? (
              <Button size="sm" variant="outline" onClick={() => onEdit(objective)}>
                Modifier
              </Button>
            ) : null}
          </div>
        </div>
        <ObjectiveStatusBadge status={objective.status} />
      </CardHeader>
      <CardContent className="space-y-2">
        {objective.description ? (
          <p className="text-sm text-muted-foreground">{objective.description}</p>
        ) : (
          <p className="text-sm text-muted-foreground">Aucune description.</p>
        )}
        {showAxis && axisName ? (
          <p className="text-sm">
            Axe: <span className="font-medium">{axisName}</span>
          </p>
        ) : null}
        <p className="text-sm">
          Responsable:{' '}
          <span className="font-medium">{objective.ownerLabel ?? 'Non assigne'}</span>
        </p>
        <p className="text-sm">
          Direction stratégique:{' '}
          <span className="font-medium">
            {objective.direction?.name
              ? `${objective.direction.name} (${objective.direction.code})`
              : 'Non affecté'}
          </span>
        </p>
        <p className="text-sm">
          Direction propriétaire:{' '}
          <span className="font-medium">{formatOwnerOrgSummary(objective.ownerOrgUnitSummary)}</span>
        </p>
        {!objective.ownerOrgUnitSummary ? <OwnerOrgUnitNullWarning /> : null}
        <p className="text-sm">
          Echeance: <span className="font-medium">{formatDate(objective.deadline)}</span>
        </p>
        <div className="flex flex-wrap gap-1">
          {projectLinks.length === 0 ? (
            <span className="text-xs text-muted-foreground">Aucun lien projet.</span>
          ) : (
            projectLinks.map((link) => (
              <Badge key={link.id} variant="outline" className="text-xs">
                Projet: {link.targetLabelSnapshot}
              </Badge>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
