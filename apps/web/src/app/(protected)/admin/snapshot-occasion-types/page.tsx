'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/auth-context';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { LoadingState } from '@/components/feedback/loading-state';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  createPlatformBudgetSnapshotOccasionType,
  deletePlatformBudgetSnapshotOccasionType,
  listPlatformBudgetSnapshotOccasionTypes,
} from '@/features/budgets/api/platform-budget-snapshot-occasion-types.api';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';

const QK = ['platform', 'budget-snapshot-occasion-types'] as const;

export default function AdminSnapshotOccasionTypesPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const authFetch = useAuthenticatedFetch();
  const queryClient = useQueryClient();

  const [code, setCode] = useState('');
  const [label, setLabel] = useState('');
  const [sortOrder, setSortOrder] = useState('0');

  useEffect(() => {
    if (authLoading) return;
    if (user?.platformRole !== 'PLATFORM_ADMIN') {
      router.replace('/dashboard');
    }
  }, [authLoading, user, router]);

  const listQuery = useQuery({
    queryKey: QK,
    queryFn: () => listPlatformBudgetSnapshotOccasionTypes(authFetch),
    enabled: user?.platformRole === 'PLATFORM_ADMIN',
  });

  const createMut = useMutation({
    mutationFn: () =>
      createPlatformBudgetSnapshotOccasionType(authFetch, {
        code: code.trim().toUpperCase(),
        label: label.trim(),
        sortOrder: Number.parseInt(sortOrder, 10) || 0,
      }),
    onSuccess: async () => {
      setCode('');
      setLabel('');
      setSortOrder('0');
      toast.success('Type créé');
      await queryClient.invalidateQueries({ queryKey: QK });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deactivateMut = useMutation({
    mutationFn: (id: string) => deletePlatformBudgetSnapshotOccasionType(authFetch, id),
    onSuccess: async () => {
      toast.success('Type désactivé');
      await queryClient.invalidateQueries({ queryKey: QK });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (authLoading || user?.platformRole !== 'PLATFORM_ADMIN') {
    return authLoading ? (
      <PageContainer>
        <LoadingState rows={4} />
      </PageContainer>
    ) : null;
  }

  return (
    <PageContainer>
      <PageHeader
        title="Types d’occasion — versions figées (plateforme)"
        description="Catalogue global proposé à tous les clients pour qualifier une version figée (RFC-033)."
        actions={
          <Link href="/admin/dashboard" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
            Retour admin
          </Link>
        }
      />

      <div className="mb-8 max-w-xl space-y-4 rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Ajouter un type global</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="adm-code">Code (MAJUSCULES)</Label>
            <Input
              id="adm-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="EXAMPLE_CODE"
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="adm-sort">Ordre d’affichage</Label>
            <Input
              id="adm-sort"
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="adm-label">Libellé</Label>
          <Input
            id="adm-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Libellé affiché dans les listes"
          />
        </div>
        <Button
          type="button"
          onClick={() => createMut.mutate()}
          disabled={createMut.isPending || !code.trim() || !label.trim()}
        >
          Créer
        </Button>
      </div>

      {listQuery.isError ? (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>{(listQuery.error as Error).message}</AlertDescription>
        </Alert>
      ) : null}

      {listQuery.isLoading ? <LoadingState rows={3} /> : null}

      {!listQuery.isLoading && listQuery.data ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Libellé</TableHead>
              <TableHead className="text-right">Ordre</TableHead>
              <TableHead>Actif</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {listQuery.data.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-mono text-xs">{row.code}</TableCell>
                <TableCell>{row.label}</TableCell>
                <TableCell className="text-right">{row.sortOrder}</TableCell>
                <TableCell>{row.isActive ? 'oui' : 'non'}</TableCell>
                <TableCell className="text-right">
                  {row.isActive ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={deactivateMut.isPending}
                      onClick={() => deactivateMut.mutate(row.id)}
                    >
                      Désactiver
                    </Button>
                  ) : (
                    <span className="text-muted-foreground text-sm">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}
    </PageContainer>
  );
}
