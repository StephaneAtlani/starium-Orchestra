'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { usePermissions } from '@/hooks/use-permissions';
import {
  createRiskTaxonomyDomain,
  createRiskTaxonomyType,
  listRiskTaxonomyAdminDomains,
  updateRiskTaxonomyDomain,
  updateRiskTaxonomyType,
} from '../../api/projects.api';

export function RiskTaxonomyAdminPanel() {
  const { has } = usePermissions();
  const authFetch = useAuthenticatedFetch();
  const { activeClient, initialized } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const qc = useQueryClient();

  const canManage = has('risks.taxonomy.manage');

  const q = useQuery({
    queryKey: ['risk-taxonomy', 'admin', clientId],
    queryFn: () => listRiskTaxonomyAdminDomains(authFetch),
    enabled: initialized && !!clientId && canManage,
  });

  const [newDomain, setNewDomain] = useState({ code: '', name: '' });
  const [newTypeByDomain, setNewTypeByDomain] = useState<Record<string, { code: string; name: string }>>({});

  const mDomain = useMutation({
    mutationFn: () =>
      createRiskTaxonomyDomain(authFetch, {
        code: newDomain.code,
        name: newDomain.name,
        isActive: true,
      }),
    onSuccess: async () => {
      setNewDomain({ code: '', name: '' });
      await qc.invalidateQueries({ queryKey: ['risk-taxonomy'] });
    },
  });

  const mType = useMutation({
    mutationFn: (vars: { domainId: string; code: string; name: string }) =>
      createRiskTaxonomyType(authFetch, vars.domainId, {
        code: vars.code,
        name: vars.name,
        isActive: true,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['risk-taxonomy'] });
    },
  });

  const mPatchDomain = useMutation({
    mutationFn: (vars: { id: string; isActive: boolean }) =>
      updateRiskTaxonomyDomain(authFetch, vars.id, { isActive: vars.isActive }),
    onSuccess: async () => qc.invalidateQueries({ queryKey: ['risk-taxonomy'] }),
  });

  const mPatchType = useMutation({
    mutationFn: (vars: { id: string; isActive: boolean }) =>
      updateRiskTaxonomyType(authFetch, vars.id, { isActive: vars.isActive }),
    onSuccess: async () => qc.invalidateQueries({ queryKey: ['risk-taxonomy'] }),
  });

  if (!initialized) return null;

  if (!canManage) {
    return (
      <Alert>
        <AlertTitle>Accès réservé</AlertTitle>
        <AlertDescription>
          La configuration des domaines et types de risque est réservée aux administrateurs du client disposant de la
          permission « Risques — administration taxonomie ».
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Nouveau domaine</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="rd-code">Code</Label>
            <Input
              id="rd-code"
              value={newDomain.code}
              onChange={(e) => setNewDomain((o) => ({ ...o, code: e.target.value }))}
              placeholder="ex. SUPPLY_CHAIN"
              className="font-mono uppercase"
            />
          </div>
          <div className="min-w-[200px] flex-1 space-y-1.5">
            <Label htmlFor="rd-name">Nom affiché</Label>
            <Input
              id="rd-name"
              value={newDomain.name}
              onChange={(e) => setNewDomain((o) => ({ ...o, name: e.target.value }))}
              placeholder="Chaîne d’approvisionnement"
            />
          </div>
          <Button
            type="button"
            disabled={mDomain.isPending || !newDomain.code.trim() || !newDomain.name.trim()}
            onClick={() => void mDomain.mutateAsync()}
          >
            Créer le domaine
          </Button>
        </CardContent>
      </Card>

      {q.isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
      {q.isError && (
        <Alert variant="destructive">
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>Impossible de charger la taxonomie.</AlertDescription>
        </Alert>
      )}

      {q.data?.map((d) => (
        <Card key={d.id}>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-lg">{d.name}</CardTitle>
              <p className="font-mono text-xs text-muted-foreground">{d.code}</p>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border border-input"
                checked={d.isActive}
                onChange={(e) => void mPatchDomain.mutateAsync({ id: d.id, isActive: e.target.checked })}
              />
              Actif
            </label>
          </CardHeader>
          <CardContent className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead className="w-[100px]">Actif</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {d.types.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-xs">{t.code}</TableCell>
                    <TableCell>{t.name}</TableCell>
                    <TableCell>
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border border-input"
                        checked={t.isActive}
                        onChange={(e) => void mPatchType.mutateAsync({ id: t.id, isActive: e.target.checked })}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-end">
              <div className="space-y-1.5">
                <Label>Code type</Label>
                <Input
                  value={newTypeByDomain[d.id]?.code ?? ''}
                  onChange={(e) =>
                    setNewTypeByDomain((o) => ({
                      ...o,
                      [d.id]: { code: e.target.value, name: o[d.id]?.name ?? '' },
                    }))
                  }
                  className="font-mono uppercase"
                  placeholder="CODE_TYPE"
                />
              </div>
              <div className="min-w-[180px] flex-1 space-y-1.5">
                <Label>Nom</Label>
                <Input
                  value={newTypeByDomain[d.id]?.name ?? ''}
                  onChange={(e) =>
                    setNewTypeByDomain((o) => ({
                      ...o,
                      [d.id]: { code: o[d.id]?.code ?? '', name: e.target.value },
                    }))
                  }
                  placeholder="Libellé"
                />
              </div>
              <Button
                type="button"
                size="sm"
                disabled={
                  mType.isPending ||
                  !(newTypeByDomain[d.id]?.code ?? '').trim() ||
                  !(newTypeByDomain[d.id]?.name ?? '').trim()
                }
                onClick={() => {
                  const nt = newTypeByDomain[d.id];
                  if (!nt?.code.trim() || !nt.name.trim()) return;
                  void mType
                    .mutateAsync({
                      domainId: d.id,
                      code: nt.code.trim(),
                      name: nt.name.trim(),
                    })
                    .then(() =>
                      setNewTypeByDomain((o) => ({
                        ...o,
                        [d.id]: { code: '', name: '' },
                      })),
                    );
                }}
              >
                Ajouter un type
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
