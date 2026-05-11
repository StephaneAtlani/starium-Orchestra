'use client';

import { Trash2Icon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TableCell, TableRow } from '@/components/ui/table';
import {
  RESOURCE_ACL_PERMISSION_LABEL,
  RESOURCE_ACL_SUBJECT_TYPE_LABEL,
} from '../lib/labels';
import type { ResourceAclEntry } from '../api/resource-acl.types';

interface Props {
  entry: ResourceAclEntry;
  canEdit: boolean;
  onRemove: (entry: ResourceAclEntry) => void;
  isPending?: boolean;
  /** True si la suppression de cette entry retirerait la dernière capacité ADMIN. */
  removalIsLockoutRisk?: boolean;
}

const PERMISSION_BADGE_VARIANT: Record<
  ResourceAclEntry['permission'],
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  READ: 'outline',
  WRITE: 'secondary',
  ADMIN: 'default',
};

const SUBJECT_TYPE_BADGE_VARIANT: Record<
  ResourceAclEntry['subjectType'],
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  USER: 'outline',
  GROUP: 'secondary',
};

export function ResourceAclEntryRow({
  entry,
  canEdit,
  onRemove,
  isPending = false,
  removalIsLockoutRisk = false,
}: Props) {
  return (
    <TableRow data-testid="resource-acl-entry-row" data-entry-id={entry.id}>
      <TableCell>
        <Badge variant={SUBJECT_TYPE_BADGE_VARIANT[entry.subjectType]}>
          {RESOURCE_ACL_SUBJECT_TYPE_LABEL[entry.subjectType]}
        </Badge>
      </TableCell>
      <TableCell className="font-medium">{entry.subjectLabel}</TableCell>
      <TableCell>
        <Badge variant={PERMISSION_BADGE_VARIANT[entry.permission]}>
          {RESOURCE_ACL_PERMISSION_LABEL[entry.permission]}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={`Supprimer ${entry.subjectLabel}`}
          onClick={() => onRemove(entry)}
          disabled={!canEdit || isPending}
          title={
            removalIsLockoutRisk
              ? 'Cette entrée porte votre dernière capacité ADMIN — confirmation forte requise.'
              : undefined
          }
          data-lockout-risk={removalIsLockoutRisk ? 'true' : undefined}
        >
          <Trash2Icon className="size-4" aria-hidden="true" />
          <span className="ml-2">Supprimer</span>
        </Button>
      </TableCell>
    </TableRow>
  );
}
