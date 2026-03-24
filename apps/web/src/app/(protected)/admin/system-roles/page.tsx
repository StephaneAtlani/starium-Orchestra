'use client';

import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import type { CreateRoleDto, PermissionListItem, RoleDetail } from '@/features/client-rbac/types';
import {
  createPlatformRole,
  deletePlatformRole,
  getPlatformRole,
  getPlatformRoles,
  updatePlatformRole,
  updatePlatformRolePermissions,
} from '@/features/client-rbac/api/platform-roles';

function groupByModule(permissions: PermissionListItem[]) {
  const groups = new Map<string, PermissionListItem[]>();
  for (const permission of permissions) {
    const key = `${permission.moduleCode}::${permission.moduleName}`;
    const current = groups.get(key) ?? [];
    current.push(permission);
    groups.set(key, current);
  }
  return Array.from(groups.entries())
    .map(([key, items]) => {
      const [moduleCode, moduleName] = key.split('::');
      return { moduleCode, moduleName, items: items.sort((a, b) => a.code.localeCompare(b.code)) };
    })
    .sort((a, b) => a.moduleCode.localeCompare(b.moduleCode));
}

export default function AdminSystemRolesPage() {
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();
  const [selectedRoleId, setSelectedRoleId] = React.useState<string | null>(null);
  const [createName, setCreateName] = React.useState('');
  const [createDescription, setCreateDescription] = React.useState('');
  const [editingName, setEditingName] = React.useState('');
  const [editingDescription, setEditingDescription] = React.useState('');
  const [selectedPermissions, setSelectedPermissions] = React.useState<Set<string>>(new Set());

  const rolesQuery = useQuery({
    queryKey: ['platform-roles'],
    queryFn: () => getPlatformRoles(authFetch),
  });

  const permissionsQuery = useQuery({
    queryKey: ['platform-roles-permissions'],
    queryFn: async (): Promise<PermissionListItem[]> => {
      const res = await authFetch('/api/platform/roles/permissions');
      if (!res.ok) throw new Error('Impossible de charger les permissions globales');
      return res.json() as Promise<PermissionListItem[]>;
    },
  });

  React.useEffect(() => {
    if (!rolesQuery.data?.length) {
      setSelectedRoleId(null);
      return;
    }
    if (!selectedRoleId || !rolesQuery.data.find((r) => r.id === selectedRoleId)) {
      setSelectedRoleId(rolesQuery.data[0].id);
    }
  }, [rolesQuery.data, selectedRoleId]);

  const roleDetailQuery = useQuery({
    queryKey: ['platform-role', selectedRoleId],
    queryFn: () => getPlatformRole(authFetch, selectedRoleId!),
    enabled: !!selectedRoleId,
  });

  React.useEffect(() => {
    if (!roleDetailQuery.data) return;
    setEditingName(roleDetailQuery.data.name);
    setEditingDescription(roleDetailQuery.data.description ?? '');
    setSelectedPermissions(new Set(roleDetailQuery.data.permissionIds));
  }, [roleDetailQuery.data]);

  const refreshRoles = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['platform-roles'] }),
      queryClient.invalidateQueries({ queryKey: ['platform-role', selectedRoleId] }),
    ]);

  const createMutation = useMutation({
    mutationFn: (dto: CreateRoleDto) => createPlatformRole(authFetch, dto),
    onSuccess: async (created) => {
      setCreateName('');
      setCreateDescription('');
      await refreshRoles();
      setSelectedRoleId(created.id);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { id: string; name: string; description: string | null }) =>
      updatePlatformRole(authFetch, payload.id, {
        name: payload.name,
        description: payload.description,
      }),
    onSuccess: async () => {
      await refreshRoles();
    },
  });

  const updatePermissionsMutation = useMutation({
    mutationFn: (payload: { id: string; permissionIds: string[] }) =>
      updatePlatformRolePermissions(authFetch, payload.id, {
        permissionIds: payload.permissionIds,
      }),
    onSuccess: async () => {
      await refreshRoles();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePlatformRole(authFetch, id),
    onSuccess: async () => {
      await refreshRoles();
    },
  });

  const selectedRole = roleDetailQuery.data as RoleDetail | undefined;
  const readOnly = !!selectedRole?.isReadOnly;
  const groupedPermissions = groupByModule(permissionsQuery.data ?? []);

  return (
    <PageContainer>
      <PageHeader
        title="Rôles système"
        description="Définissez les rôles globaux appliqués en lecture seule dans tous les clients."
      />

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Créer un rôle global</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Nom du rôle"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
            />
            <Input
              placeholder="Description (optionnel)"
              value={createDescription}
              onChange={(e) => setCreateDescription(e.target.value)}
            />
            <Button
              disabled={!createName.trim() || createMutation.isPending}
              onClick={() =>
                createMutation.mutate({
                  name: createName.trim(),
                  description: createDescription.trim() || null,
                })
              }
            >
              {createMutation.isPending ? 'Création…' : 'Créer'}
            </Button>
            {createMutation.error && (
              <p className="text-sm text-destructive">
                {(createMutation.error as Error).message}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Liste des rôles globaux</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {rolesQuery.isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
            {rolesQuery.error && (
              <p className="text-sm text-destructive">
                {(rolesQuery.error as Error).message}
              </p>
            )}
            {!rolesQuery.isLoading && (rolesQuery.data ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">Aucun rôle global.</p>
            )}
            {(rolesQuery.data ?? []).map((role) => (
              <button
                key={role.id}
                type="button"
                onClick={() => setSelectedRoleId(role.id)}
                className={`w-full rounded-md border px-3 py-2 text-left ${
                  selectedRoleId === role.id ? 'border-primary bg-muted/50' : 'border-border'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{role.name}</span>
                  <div className="flex items-center gap-1">
                    <Badge variant="secondary">GLOBAL</Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {role.description ?? '—'}
                </p>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      {selectedRole && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Détail du rôle global</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                disabled={!!readOnly}
              />
              <Input
                value={editingDescription}
                onChange={(e) => setEditingDescription(e.target.value)}
                disabled={!!readOnly}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                disabled={!!readOnly || updateMutation.isPending}
                onClick={() =>
                  updateMutation.mutate({
                    id: selectedRole.id,
                    name: editingName.trim(),
                    description: editingDescription.trim() || null,
                  })
                }
              >
                Enregistrer le rôle
              </Button>
              <Button
                variant="destructive"
                disabled={!!readOnly || deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(selectedRole.id)}
              >
                Supprimer
              </Button>
            </div>
            {(updateMutation.error || deleteMutation.error) && (
              <p className="text-sm text-destructive">
                {((updateMutation.error ?? deleteMutation.error) as Error).message}
              </p>
            )}

            <div className="space-y-3">
              <p className="text-sm font-medium">Permissions</p>
              {permissionsQuery.isLoading && (
                <p className="text-sm text-muted-foreground">Chargement des permissions…</p>
              )}
              <div className="space-y-4 max-h-[28rem] overflow-y-auto pr-1">
                {groupedPermissions.map((group) => (
                  <div key={group.moduleCode} className="rounded-md border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{group.moduleName}</p>
                        <p className="text-xs text-muted-foreground font-mono">{group.moduleCode}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!!readOnly}
                        onClick={() => {
                          const modulePermissionIds = group.items.map((item) => item.id);
                          const allSelected = modulePermissionIds.every((id) =>
                            selectedPermissions.has(id),
                          );

                          setSelectedPermissions((prev) => {
                            const next = new Set(prev);
                            if (allSelected) {
                              modulePermissionIds.forEach((id) => next.delete(id));
                            } else {
                              modulePermissionIds.forEach((id) => next.add(id));
                            }
                            return next;
                          });
                        }}
                      >
                        {group.items.every((item) => selectedPermissions.has(item.id))
                          ? 'Tout désélectionner'
                          : 'Tout sélectionner'}
                      </Button>
                    </div>
                    <div className="mt-2 space-y-1">
                      {group.items.map((permission) => (
                        <label key={permission.id} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            disabled={!!readOnly}
                            checked={selectedPermissions.has(permission.id)}
                            onChange={(e) => {
                              setSelectedPermissions((prev) => {
                                const next = new Set(prev);
                                if (e.target.checked) next.add(permission.id);
                                else next.delete(permission.id);
                                return next;
                              });
                            }}
                          />
                          <span className="font-mono text-muted-foreground">{permission.code}</span>
                          <span>{permission.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <Button
                disabled={!!readOnly || updatePermissionsMutation.isPending}
                onClick={() =>
                  updatePermissionsMutation.mutate({
                    id: selectedRole.id,
                    permissionIds: Array.from(selectedPermissions),
                  })
                }
              >
                {updatePermissionsMutation.isPending
                  ? 'Enregistrement…'
                  : 'Enregistrer les permissions'}
              </Button>
              {updatePermissionsMutation.error && (
                <p className="text-sm text-destructive">
                  {(updatePermissionsMutation.error as Error).message}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </PageContainer>
  );
}
