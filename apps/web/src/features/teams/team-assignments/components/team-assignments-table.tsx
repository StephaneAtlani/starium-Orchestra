'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { activityTaxonomyKindLabel, formatAllocationPercent, formatAssignmentPeriod } from '../lib/team-assignment-label-mappers';
import type { TeamResourceAssignment } from '../types/team-assignment.types';
import { TeamAssignmentStatusBadge } from './team-assignment-status-badge';

export type TeamAssignmentsTableProps = {
  variant: 'global' | 'project';
  items: TeamResourceAssignment[];
  canManage: boolean;
  onEdit: (row: TeamResourceAssignment) => void;
  onCancel: (row: TeamResourceAssignment) => void;
};

export function TeamAssignmentsTable({
  variant,
  items,
  canManage,
  onEdit,
  onCancel,
}: TeamAssignmentsTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Collaborateur</TableHead>
            {variant === 'global' ? <TableHead>Projet</TableHead> : null}
            <TableHead>Type d&apos;activité</TableHead>
            <TableHead>Rôle</TableHead>
            <TableHead>Période</TableHead>
            <TableHead className="text-right">Charge</TableHead>
            <TableHead>Statut</TableHead>
            {canManage ? <TableHead className="w-[140px] text-right">Actions</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((row) => {
            const cancelled = !!row.cancelledAt;
            return (
              <TableRow key={row.id} className={cancelled ? 'opacity-70' : undefined}>
                <TableCell className="font-medium">{row.collaboratorDisplayName}</TableCell>
                {variant === 'global' ? (
                  <TableCell>
                    {row.projectId && row.projectName ? (
                      <span>
                        {row.projectName}
                        {row.projectCode ? (
                          <span className="text-muted-foreground"> ({row.projectCode})</span>
                        ) : null}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Hors projet</span>
                    )}
                  </TableCell>
                ) : null}
                <TableCell>
                  <span className="mr-2">{row.activityTypeName}</span>
                  <Badge variant="outline" className="text-xs font-normal">
                    {activityTaxonomyKindLabel(row.activityTypeKind)}
                  </Badge>
                </TableCell>
                <TableCell>{row.roleLabel}</TableCell>
                <TableCell className="whitespace-nowrap text-sm">
                  {formatAssignmentPeriod(row.startDate, row.endDate)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatAllocationPercent(row.allocationPercent)}
                </TableCell>
                <TableCell>
                  <TeamAssignmentStatusBadge cancelledAt={row.cancelledAt} />
                </TableCell>
                {canManage ? (
                  <TableCell className="text-right">
                    {!cancelled ? (
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onEdit(row)}
                        >
                          Modifier
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => onCancel(row)}
                        >
                          Annuler
                        </Button>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                ) : null}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
