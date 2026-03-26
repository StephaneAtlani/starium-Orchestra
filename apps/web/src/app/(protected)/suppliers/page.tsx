'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Search } from 'lucide-react';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useActiveClient } from '@/hooks/use-active-client';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { usePermissions } from '@/hooks/use-permissions';
import { listSuppliers } from '@/features/procurement/api/procurement.api';

export default function SuppliersPage() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const { has, isLoading: permsLoading, isSuccess: permsSuccess, isError: permsError } =
    usePermissions();
  const [search, setSearch] = useState('');
  const canReadSuppliers = has('procurement.read');
  const clientId = activeClient?.id ?? '';
  const normalizedSearch = useMemo(() => search.trim(), [search]);

  const suppliersQuery = useQuery({
    queryKey: ['procurement', clientId, 'suppliers-page', normalizedSearch],
    queryFn: () =>
      listSuppliers(authFetch, {
        search: normalizedSearch || undefined,
        limit: 50,
        offset: 0,
      }),
    enabled: !!clientId && permsSuccess && canReadSuppliers,
  });

  return (
    <RequireActiveClient>
      <PageContainer>
        <PageHeader
          title="Fournisseurs"
          description="Référentiel fournisseurs du client actif."
        />

        {permsLoading && (
          <Alert>
            <AlertTitle>Chargement des permissions</AlertTitle>
            <AlertDescription>
              Vérification des droits d&apos;accès au référentiel fournisseurs.
            </AlertDescription>
          </Alert>
        )}

        {permsError && !permsLoading && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle>Permissions indisponibles</AlertTitle>
            <AlertDescription>
              Impossible de charger vos permissions pour ce client.
            </AlertDescription>
          </Alert>
        )}

        {permsSuccess && !canReadSuppliers && (
          <Alert className="border-amber-500/35 bg-amber-500/5 dark:bg-amber-500/10">
            <AlertTitle>Accès au module Fournisseurs</AlertTitle>
            <AlertDescription>
              Votre rôle n&apos;inclut pas la permission <code>procurement.read</code>.
            </AlertDescription>
          </Alert>
        )}

        {permsSuccess && canReadSuppliers && (
          <Card size="sm">
            <CardContent className="space-y-4 pt-6">
              <div className="relative max-w-md">
                <Search className="text-muted-foreground pointer-events-none absolute top-2.5 left-2.5 size-4" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher un fournisseur"
                  className="pl-8"
                />
              </div>

              {suppliersQuery.isError ? (
                <Alert variant="destructive">
                  <AlertCircle className="size-4" />
                  <AlertTitle>Chargement impossible</AlertTitle>
                  <AlertDescription>
                    Impossible de charger les fournisseurs.
                  </AlertDescription>
                </Alert>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>TVA</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(suppliersQuery.data?.items ?? []).map((supplier) => (
                      <TableRow key={supplier.id}>
                        <TableCell>{supplier.name}</TableCell>
                        <TableCell>{supplier.code ?? '—'}</TableCell>
                        <TableCell>{supplier.vatNumber ?? '—'}</TableCell>
                        <TableCell>{supplier.status}</TableCell>
                      </TableRow>
                    ))}
                    {!suppliersQuery.isLoading && (suppliersQuery.data?.items.length ?? 0) === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-muted-foreground py-8 text-center">
                          Aucun fournisseur.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}
      </PageContainer>
    </RequireActiveClient>
  );
}
