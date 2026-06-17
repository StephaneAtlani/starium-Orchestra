'use client';

import type { ReactNode } from 'react';
import { Pencil } from 'lucide-react';
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

function MetaField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
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

  const directionLabel = objective.direction?.name
    ? `${objective.direction.name} (${objective.direction.code})`
    : 'Non affecté';

  return (
    <Card size="sm">
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <CardTitle className="text-base leading-snug">{objective.title}</CardTitle>
            <ObjectiveStatusBadge status={objective.status} />
          </div>
          <div className="flex flex-wrap items-center gap-1.5 sm:max-w-[50%] sm:shrink-0 sm:justify-end md:gap-2">
            <ResourceAclTriggerButton
              resourceType="STRATEGIC_OBJECTIVE"
              resourceId={objective.id}
              resourceLabel={objective.title}
              size="sm"
              className="max-md:size-11 max-md:px-2.5"
            />
            <AccessExplainerPopover
              resourceType="STRATEGIC_OBJECTIVE"
              resourceId={objective.id}
              resourceLabel={objective.title}
              intent="READ"
              triggerClassName="size-11 shrink-0 px-0 md:size-auto md:h-8 md:px-2"
            />
            {canUpdate && onEdit ? (
              <>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="md:hidden"
                  aria-label={`Modifier l'objectif ${objective.title}`}
                  onClick={() => onEdit(objective)}
                >
                  <Pencil className="size-4" aria-hidden />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="hidden md:inline-flex"
                  onClick={() => onEdit(objective)}
                >
                  Modifier
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="line-clamp-3 text-sm text-muted-foreground md:line-clamp-none">
          {objective.description ?? 'Aucune description.'}
        </p>

        <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
          {showAxis && axisName ? <MetaField label="Axe" value={axisName} /> : null}
          <MetaField label="Responsable" value={objective.ownerLabel ?? 'Non assigne'} />
          <MetaField label="Direction stratégique" value={directionLabel} />
          <MetaField
            label="Direction propriétaire"
            value={formatOwnerOrgSummary(objective.ownerOrgUnitSummary)}
          />
          <MetaField label="Échéance" value={formatDate(objective.deadline)} />
        </dl>

        {!objective.ownerOrgUnitSummary ? <OwnerOrgUnitNullWarning /> : null}

        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Projets liés</p>
          <div className="flex flex-wrap gap-1">
            {projectLinks.length === 0 ? (
              <span className="text-xs text-muted-foreground">Aucun lien projet.</span>
            ) : (
              projectLinks.map((link) => (
                <Badge key={link.id} variant="outline" className="max-w-full truncate text-xs">
                  {link.targetLabelSnapshot}
                </Badge>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
