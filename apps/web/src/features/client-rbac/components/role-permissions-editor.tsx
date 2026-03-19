'use client';

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePermissions } from '../hooks/use-permissions';
import { useUpdateRolePermissions } from '../hooks/use-update-role-permissions';
import type { PermissionListItem } from '../types';
import { cn } from '@/lib/utils';

function normalizeText(value: string) {
  return (value ?? '').trim().toLowerCase();
}

function sortPermissions(list: PermissionListItem[], moduleCode?: string) {
  return [...list].sort((a, b) => {
    const m = (moduleCode ?? a.moduleCode ?? '').localeCompare(moduleCode ?? b.moduleCode ?? '');
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
  const [filter, setFilter] = useState('');

  const filteredPermissions = useMemo(() => {
    const q = normalizeText(filter);
    if (!q) return permissions;
    return permissions.filter((p) => {
      const haystack = [p.moduleCode, p.moduleName, p.code, p.label, p.description ?? '']
        .map(normalizeText)
        .join(' ');
      return haystack.includes(q);
    });
  }, [permissions, filter]);

  const groupedPermissions = useMemo(() => {
    const groups = new Map<
      string,
      { moduleCode: string; moduleName: string; items: PermissionListItem[] }
    >();
    for (const permission of filteredPermissions) {
      const key = permission.moduleCode;
      const current = groups.get(key);
      if (!current) {
        groups.set(key, {
          moduleCode: permission.moduleCode,
          moduleName: permission.moduleName,
          items: [permission],
        });
      } else {
        current.items.push(permission);
      }
    }
    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        items: sortPermissions(group.items, group.moduleCode),
      }))
      .sort((a, b) => a.moduleCode.localeCompare(b.moduleCode));
  }, [filteredPermissions]);

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

  const toggleModule = (ids: string[], checked: boolean) => {
    if (isSystem) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        ids.forEach((id) => next.add(id));
      } else {
        ids.forEach((id) => next.delete(id));
      }
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
        {!isSystem && (
          <div className="grid gap-2">
            <Input
              placeholder="Filtrer les permissions (module, code, label)"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {selectedIds.size} permission(s) sélectionnée(s)
            </p>
          </div>
        )}
        {isSystem ? (
          <ul className="space-y-1 text-sm text-muted-foreground">
            {sortPermissions(permissions)
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
            {groupedPermissions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune permission ne correspond au filtre.</p>
            ) : (
              <div className="space-y-4 max-h-[28rem] overflow-y-auto pr-1">
                {groupedPermissions.map((group) => {
                  const ids = group.items.map((item) => item.id);
                  const selectedInGroup = ids.filter((id) => selectedIds.has(id)).length;
                  const allChecked = ids.length > 0 && selectedInGroup === ids.length;

                  return (
                    <div key={group.moduleCode} className="rounded-md border p-3 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">{group.moduleName}</p>
                          <p className="text-xs text-muted-foreground font-mono">{group.moduleCode}</p>
                        </div>
                        <label className="flex items-center gap-2 text-xs text-muted-foreground">
                          <input
                            type="checkbox"
                            className="rounded border-input"
                            checked={allChecked}
                            onChange={(event) => toggleModule(ids, event.target.checked)}
                          />
                          Tout cocher ({selectedInGroup}/{ids.length})
                        </label>
                      </div>

                      <ul className="space-y-2">
                        {group.items.map((p) => (
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
                              <span className="font-mono text-muted-foreground">{p.code}</span>
                              {' — '}
                              {p.label}
                            </label>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}
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
