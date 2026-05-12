'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { usePermissions } from '@/hooks/use-permissions';
import { fetchOrgUnitsTree } from '../api/organization-api';
import { flattenOrgUnitsForSelect } from '../lib/flatten-org-units';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const NONE = '__owner_org_unit_none__';

type Props = {
  id?: string;
  value: string | null;
  onChange: (next: string | null) => void;
  disabled?: boolean;
  /** Largeur du trigger (ex. w-[280px]). */
  triggerClassName?: string;
  placeholder?: string;
};

/**
 * Sélecteur Direction / unité propriétaire (RFC-ORG-003).
 * Requiert `organization.read` + données arbre ; sinon désactivé.
 */
export function OwnerOrgUnitSelect({
  id,
  value,
  onChange,
  disabled,
  triggerClassName = 'h-8 w-[min(100%,280px)] text-xs',
  placeholder = 'Aucune unité',
}: Props) {
  const authFetch = useAuthenticatedFetch();
  const { has, isLoading: permsLoading } = usePermissions();
  const canReadOrg = has('organization.read');

  const unitsQ = useQuery({
    queryKey: ['organization-units-tree'],
    queryFn: () => fetchOrgUnitsTree(authFetch),
    enabled: canReadOrg && !permsLoading,
  });

  const options = useMemo(
    () => flattenOrgUnitsForSelect(unitsQ.data ?? []),
    [unitsQ.data],
  );

  const selectValue = value ?? NONE;
  const busy = unitsQ.isLoading || permsLoading;
  const inactive = disabled || !canReadOrg || busy || unitsQ.isError;

  return (
    <Select
      value={selectValue}
      onValueChange={(v) => {
        if (v === NONE) onChange(null);
        else onChange(v);
      }}
      disabled={inactive}
    >
      <SelectTrigger id={id} className={triggerClassName} aria-busy={busy}>
        <SelectValue placeholder={busy ? 'Chargement…' : placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>{placeholder}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.id} value={o.id} disabled={o.status === 'ARCHIVED'}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
