'use client';

import React, { useId, useMemo, useState } from 'react';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAccessGroups } from '@/features/access-groups/hooks/use-access-groups';
import { useClientMembers } from '@/features/client-rbac/hooks/use-client-members';
import { useActiveClient } from '@/hooks/use-active-client';
import { useModuleVisibilityMatrix } from '../hooks/use-module-visibility-matrix';
import { useRemoveModuleVisibility } from '../hooks/use-remove-module-visibility';
import { useSetModuleVisibility } from '../hooks/use-set-module-visibility';
import type {
  ModuleVisibilityMatrixRow,
  ModuleVisibilityScopeType,
  ModuleVisibilityState,
} from '../api/module-visibility';

function memberLabel(m: {
  email: string;
  firstName: string | null;
  lastName: string | null;
}): string {
  const n = [m.firstName, m.lastName].filter(Boolean).join(' ').trim();
  return n || m.email;
}

export function ModuleVisibilityAdminPage() {
  const formId = useId();
  const { data: matrix, isLoading, isError, error } = useModuleVisibilityMatrix();
  const { activeClient } = useActiveClient();
  const { data: groups } = useAccessGroups();
  const { data: members } = useClientMembers();
  const setVis = useSetModuleVisibility();
  const removeVis = useRemoveModuleVisibility();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [moduleCode, setModuleCode] = useState<string>('');
  const [scopeType, setScopeType] = useState<ModuleVisibilityScopeType>('CLIENT');
  const [scopeGroupId, setScopeGroupId] = useState<string>('');
  const [scopeUserId, setScopeUserId] = useState<string>('');
  const [visibility, setVisibility] = useState<ModuleVisibilityState>('HIDDEN');
  const canWrite = activeClient?.role === 'CLIENT_ADMIN';

  const activeMembers = useMemo(
    () => (members ?? []).filter((m) => m.status === 'ACTIVE'),
    [members],
  );

  function resetDialog() {
    setModuleCode('');
    setScopeType('CLIENT');
    setScopeGroupId('');
    setScopeUserId('');
    setVisibility('HIDDEN');
  }

  function openDialog() {
    resetDialog();
    const first = matrix?.[0]?.moduleCode;
    if (first) setModuleCode(first);
    setDialogOpen(true);
  }

  function submitOverride(e: React.FormEvent) {
    e.preventDefault();
    if (!moduleCode.trim()) return;
    const payload: {
      moduleCode: string;
      scopeType: ModuleVisibilityScopeType;
      scopeId?: string;
      visibility: ModuleVisibilityState;
    } = {
      moduleCode: moduleCode.trim(),
      scopeType,
      visibility,
    };
    if (scopeType === 'GROUP') {
      if (!scopeGroupId) return;
      payload.scopeId = scopeGroupId;
    } else if (scopeType === 'USER') {
      if (!scopeUserId) return;
      payload.scopeId = scopeUserId;
    }
    setVis.mutate(payload, {
      onSuccess: () => {
        setDialogOpen(false);
        resetDialog();
      },
    });
  }

  return (
    <PageContainer>
      <PageHeader
        title="Visibilité des modules"
        description="Masquer ou afficher des modules activés par la plateforme, par défaut client, groupe ou utilisateur (RFC-ACL-004)."
      />
      <p className="mb-3 text-xs text-muted-foreground">
        Dépendance RBAC : aucun code permission dédié `module-visibility` exposé côté
        API ; l&apos;UI applique donc un verrouillage en écriture basé sur le rôle
        `CLIENT_ADMIN`, le backend restant source de vérité.
      </p>
      <div className="mb-4 flex justify-end">
        <Button type="button" onClick={openDialog} disabled={!canWrite}>
          Ajouter une règle
        </Button>
      </div>

      {isLoading && (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      )}
      {isError && (
        <p className="text-sm text-destructive">
          {(error as Error)?.message ?? 'Erreur de chargement'}
        </p>
      )}

      {!isLoading && matrix && matrix.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Module</TableHead>
              <TableHead>Règles</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {matrix.map((row: ModuleVisibilityMatrixRow) => (
              <TableRow key={row.moduleCode}>
                <TableCell>
                  <div className="font-medium">{row.moduleName}</div>
                  <div className="text-xs text-muted-foreground">{row.moduleCode}</div>
                </TableCell>
                <TableCell>
                  {row.overrides.length === 0 ? (
                    <span className="text-sm text-muted-foreground">Aucune règle (visible par défaut)</span>
                  ) : (
                    <ul className="space-y-1 text-sm">
                      {row.overrides.map((o) => (
                        <li
                          key={o.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 px-2 py-1"
                        >
                          <span>
                            <span className="font-medium">{o.scopeLabel}</span>
                            <span className="text-muted-foreground">
                              {' '}
                              · {o.scopeType}
                              {o.scopeType !== 'CLIENT' && o.scopeId ? (
                                <span className="sr-only"> ({o.scopeId})</span>
                              ) : null}
                              {' · '}
                              {o.visibility === 'HIDDEN' ? 'Masqué' : 'Visible'}
                            </span>
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="shrink-0 text-destructive"
                            disabled={removeVis.isPending || !canWrite}
                            onClick={() =>
                              removeVis.mutate({
                                moduleCode: row.moduleCode,
                                scopeType: o.scopeType,
                                scopeId:
                                  o.scopeType === 'CLIENT'
                                    ? undefined
                                    : o.scopeId ?? undefined,
                              })
                            }
                          >
                            Supprimer
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {!isLoading && matrix && matrix.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Aucun module activé pour ce client.
        </p>
      )}

      <Dialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) resetDialog();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nouvelle règle de visibilité</DialogTitle>
            <DialogDescription>
              La combinaison module + portée doit être unique. Priorité effective : utilisateur &gt; groupe &gt; client.
            </DialogDescription>
          </DialogHeader>
          <form id={formId} onSubmit={submitOverride} className="space-y-4">
            <div className="space-y-2">
              <Label>Module</Label>
              <Select
                value={moduleCode}
                onValueChange={(v) => v != null && setModuleCode(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un module" />
                </SelectTrigger>
                <SelectContent>
                  {(matrix ?? []).map((m) => (
                    <SelectItem key={m.moduleCode} value={m.moduleCode}>
                      {m.moduleName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Portée</Label>
              <Select
                value={scopeType}
                onValueChange={(v) =>
                  v != null && setScopeType(v as ModuleVisibilityScopeType)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CLIENT">Tout le client</SelectItem>
                  <SelectItem value="GROUP">Groupe d&apos;accès</SelectItem>
                  <SelectItem value="USER">Utilisateur</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {scopeType === 'GROUP' && (
              <div className="space-y-2">
                <Label>Groupe</Label>
                <Select
                  value={scopeGroupId}
                  onValueChange={(v) => v != null && setScopeGroupId(v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un groupe" />
                  </SelectTrigger>
                  <SelectContent>
                    {(groups ?? []).map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {scopeType === 'USER' && (
              <div className="space-y-2">
                <Label>Utilisateur</Label>
                <Select
                  value={scopeUserId}
                  onValueChange={(v) => v != null && setScopeUserId(v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un membre actif" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeMembers.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {memberLabel(m)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Visibilité</Label>
              <Select
                value={visibility}
                onValueChange={(v) =>
                  v != null && setVisibility(v as ModuleVisibilityState)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HIDDEN">Masqué</SelectItem>
                  <SelectItem value="VISIBLE">Visible</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </form>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button type="submit" form={formId} disabled={setVis.isPending || !canWrite}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
