'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Search } from 'lucide-react';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useActiveClient } from '@/hooks/use-active-client';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { usePermissions } from '@/hooks/use-permissions';
import {
  listSupplierCategories,
  listSuppliers,
  updateSupplierCategory,
} from '@/features/procurement/api/procurement.api';

export default function SuppliersPage() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const { has, isLoading: permsLoading, isSuccess: permsSuccess, isError: permsError } =
    usePermissions();
  const [search, setSearch] = useState('');
  const [supplierCategoryFilter, setSupplierCategoryFilter] = useState('all');
  const canReadSuppliers = has('procurement.read');
  const canUpdateSuppliers = has('procurement.update');
  const clientId = activeClient?.id ?? '';
  const normalizedSearch = useMemo(() => search.trim(), [search]);
  const queryClient = useQueryClient();

  const categoriesQuery = useQuery({
    queryKey: ['procurement', clientId, 'supplier-categories'],
    queryFn: () =>
      listSupplierCategories(authFetch, {
        includeInactive: false,
        limit: 200,
        offset: 0,
      }),
    enabled: !!clientId && permsSuccess && canReadSuppliers,
  });

  const suppliersQuery = useQuery({
    queryKey: [
      'procurement',
      clientId,
      'suppliers-page',
      normalizedSearch,
      supplierCategoryFilter,
    ],
    queryFn: () =>
      listSuppliers(authFetch, {
        search: normalizedSearch || undefined,
        supplierCategoryId:
          supplierCategoryFilter === 'all' ? undefined : supplierCategoryFilter,
        limit: 50,
        offset: 0,
      }),
    enabled: !!clientId && permsSuccess && canReadSuppliers,
  });

  const updateCategoryMutation = useMutation({
    mutationFn: (input: { supplierId: string; supplierCategoryId: string | null }) =>
      updateSupplierCategory(authFetch, input.supplierId, input.supplierCategoryId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['procurement', clientId, 'suppliers-page'],
      });
    },
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
              <div className="max-w-sm">
                <Select value={supplierCategoryFilter} onValueChange={setSupplierCategoryFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {supplierCategoryFilter === 'all'
                        ? 'Toutes les categories'
                        : categoriesQuery.data?.items.find(
                            (item) => item.id === supplierCategoryFilter,
                          )?.name ?? 'Categorie'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les categories</SelectItem>
                    {(categoriesQuery.data?.items ?? []).map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                      <TableHead>Categorie</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(suppliersQuery.data?.items ?? []).map((supplier) => (
                      <TableRow key={supplier.id}>
                        <TableCell>{supplier.name}</TableCell>
                        <TableCell>{supplier.code ?? '—'}</TableCell>
                        <TableCell>{supplier.vatNumber ?? '—'}</TableCell>
                        <TableCell>
                          {canUpdateSuppliers ? (
                            <Select
                              value={supplier.supplierCategoryId ?? '__none__'}
                              onValueChange={(value) => {
                                void updateCategoryMutation.mutateAsync({
                                  supplierId: supplier.id,
                                  supplierCategoryId: value === '__none__' ? null : value,
                                });
                              }}
                              disabled={updateCategoryMutation.isPending}
                            >
                              <SelectTrigger className="w-[220px]">
                                <SelectValue>
                                  {supplier.supplierCategory?.name ?? 'Aucune categorie'}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">Aucune categorie</SelectItem>
                                {(categoriesQuery.data?.items ?? []).map((category) => (
                                  <SelectItem key={category.id} value={category.id}>
                                    {category.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            supplier.supplierCategory?.name ?? '—'
                          )}
                        </TableCell>
                        <TableCell>{supplier.status}</TableCell>
                      </TableRow>
                    ))}
                    {!suppliersQuery.isLoading && (suppliersQuery.data?.items.length ?? 0) === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-muted-foreground py-8 text-center">
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
