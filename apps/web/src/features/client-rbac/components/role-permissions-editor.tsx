'use client';

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePermissions } from '../hooks/use-permissions';
import { useUpdateRolePermissions } from '../hooks/use-update-role-permissions';
import type { PermissionListItem } from '../types';
import { cn } from '@/lib/utils';

function sortPermissions(list: PermissionListItem[]) {
  return [...list].sort((a, b) => {
    const m = (a.moduleCode ?? '').localeCompare(b.moduleCode ?? '');
    if (m !== 0) return m;
    return (a.code ?? '').localeCompare(b.code ?? '');
  });
}

export interface RolePermissionsEditorProps {
  roleId: string;
  permissionIds: string[];
  isSystem: boolean;
}

export function RolePermissionsEditor({
  roleId,
  permissionIds,
  isSystem,
}: RolePermissionsEditorProps) {
  const { data: permissions = [], isLoading, error } = usePermissions();
  const updatePermissions = useUpdateRolePermissions(roleId);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(permissionIds));

  const sortedPermissions = useMemo(() => sortPermissions(permissions), [permissions]);

  React.useEffect(() => {
    setSelectedIds(new Set(permissionIds));
  }, [permissionIds]);

  const handleToggle = (id: string) => {
    if (isSystem) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = () => {
    updatePermissions.mutate(
      { permissionIds: Array.from(selectedIds) },
      {
        onError: (err) => {
          // toast is handled in hook or we could pass onError
        },
      },
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Chargement…</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">
            Erreur lors du chargement des permissions.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Permissions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isSystem ? (
          <ul className="space-y-1 text-sm text-muted-foreground">
            {sortedPermissions
              .filter((p) => permissionIds.includes(p.id))
              .map((p) => (
                <li key={p.id}>
                  {p.moduleCode} — {p.code}: {p.label}
                </li>
              ))}
            {permissionIds.length === 0 && <li>Aucune permission.</li>}
          </ul>
        ) : (
          <>
            <ul className="space-y-2 max-h-64 overflow-y-auto">
              {sortedPermissions.map((p) => (
                <li
                  key={p.id}
                  className={cn(
                    'flex items-center gap-2 text-sm',
                    isSystem && 'opacity-70',
                  )}
                >
                  <input
                    type="checkbox"
                    id={`perm-${p.id}`}
                    checked={selectedIds.has(p.id)}
                    onChange={() => handleToggle(p.id)}
                    disabled={isSystem}
                    className="rounded border-input"
                  />
                  <label htmlFor={`perm-${p.id}`} className="cursor-pointer">
                    <span className="font-mono text-muted-foreground">
                      {p.moduleCode} / {p.code}
                    </span>
                    {' — '}
                    {p.label}
                  </label>
                </li>
              ))}
            </ul>
            <Button
              onClick={handleSave}
              disabled={updatePermissions.isPending}
            >
              {updatePermissions.isPending
                ? 'Enregistrement…'
                : 'Enregistrer les permissions'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
