'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/feedback/empty-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PermissionGate } from '@/components/PermissionGate';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { usePermissions } from '@/hooks/use-permissions';
import {
  RESOURCE_AFFILIATION_LABEL,
  RESOURCE_TYPE_LABEL,
  formatResourceDisplayName,
} from '@/lib/resource-labels';
import { listResources } from '@/services/resources';
import type { ResourceType } from '@/services/resources';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EditResourceForm } from './_components/edit-resource-form';
import { NewResourceForm } from './_components/new-resource-form';
import { AlertCircle, ChevronLeft, ChevronRight, Plus } from 'lucide-react';

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

export default function ResourcesListPage() {
  const [newResourceModalOpen, setNewResourceModalOpen] = useState(false);
  const [editResourceId, setEditResourceId] = useState<string | null>(null);
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const { has, isLoading: permsLoading, isSuccess: permsSuccess, isError: permsError } =
    usePermissions();
  const canRead = has('resources.read');
  const canUpdateResource = permsSuccess && has('resources.update');
  const enabled = !!clientId && permsSuccess && canRead;

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState<number>(20);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | ResourceType>('all');

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPageIndex(0);
  }, [debouncedSearch, filterType, pageSize]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [
      'resources',
      'list',
      clientId,
      pageIndex,
      pageSize,
      filterType,
      debouncedSearch,
    ],
    queryFn: () =>
      listResources(authFetch, {
        offset: pageIndex * pageSize,
        limit: pageSize,
        type: filterType === 'all' ? undefined : filterType,
        search: debouncedSearch || undefined,
      }),
    enabled,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const errMsg = error ? (error as Error).message : null;

  useEffect(() => {
    if (total === 0) {
      setPageIndex(0);
      return;
    }
    const tp = Math.ceil(total / pageSize);
    if (pageIndex >= tp) {
      setPageIndex(Math.max(0, tp - 1));
    }
  }, [total, pageSize, pageIndex]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : pageIndex * pageSize + 1;
  const to = Math.min(pageIndex * pageSize + pageSize, total);
  const canPrev = pageIndex > 0;
  const canNext = pageIndex + 1 < totalPages;

  const hasFilters = debouncedSearch.length > 0 || filterType !== 'all';

  return (
    <RequireActiveClient>
      <PageContainer>
        <PageHeader
          title="Ressources"
          description="Catalogue ressources humaines et matériel (client actif)."
          actions={
            <div className="flex flex-wrap gap-2">
              <PermissionGate permission="resources.create">
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={() => setNewResourceModalOpen(true)}
                >
                  <Plus className="size-4" />
                  Nouvelle ressource
                </Button>
              </PermissionGate>
            </div>
          }
        />

        <Dialog open={newResourceModalOpen} onOpenChange={setNewResourceModalOpen}>
          <DialogContent
            className="flex max-h-[90vh] w-[90vw] max-w-[90vw] flex-col gap-4 overflow-y-auto p-6 sm:max-w-[90vw]"
            showCloseButton
          >
            <DialogHeader>
              <DialogTitle>Nouvelle ressource</DialogTitle>
              <DialogDescription>Création dans le client actif.</DialogDescription>
            </DialogHeader>
            {newResourceModalOpen ? (
              <NewResourceForm
                formIdPrefix="modal-new-resource"
                className="w-full max-w-full space-y-4"
                onSuccess={() => {
                  void refetch();
                  setNewResourceModalOpen(false);
                }}
              />
            ) : null}
          </DialogContent>
        </Dialog>

        <Dialog
          open={editResourceId !== null}
          onOpenChange={(open) => {
            if (!open) setEditResourceId(null);
          }}
        >
          <DialogContent
            className="flex max-h-[90vh] w-[90vw] max-w-[90vw] flex-col gap-4 overflow-y-auto p-6 sm:max-w-[90vw]"
            showCloseButton
          >
            <DialogHeader>
              <DialogTitle>Modifier la ressource</DialogTitle>
              <DialogDescription>Édition dans le client actif.</DialogDescription>
            </DialogHeader>
            {editResourceId ? (
              <EditResourceForm
                key={editResourceId}
                resourceId={editResourceId}
                formIdPrefix={`modal-edit-resource-${editResourceId}`}
                className="w-full max-w-full"
                onSaved={() => {
                  void refetch();
                  setEditResourceId(null);
                }}
              />
            ) : null}
          </DialogContent>
        </Dialog>

        {clientId && permsLoading && <LoadingState rows={3} />}
        {permsError && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle>Permissions</AlertTitle>
            <AlertDescription>Impossible de charger les droits.</AlertDescription>
          </Alert>
        )}

        {enabled && (
          <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-card/30 p-4 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="min-w-[12rem] flex-1 space-y-2">
              <Label htmlFor="resources-search">Recherche</Label>
              <Input
                id="resources-search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Nom, prénom, email, société…"
                autoComplete="off"
              />
            </div>
            <div className="w-full space-y-2 sm:w-44">
              <Label>Type</Label>
              <Select
                value={filterType}
                onValueChange={(v) => setFilterType(v as 'all' | ResourceType)}
              >
                <SelectTrigger>
                  <SelectValue>
                    {filterType === 'all'
                      ? 'Tous'
                      : RESOURCE_TYPE_LABEL[filterType as ResourceType]}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="HUMAN">{RESOURCE_TYPE_LABEL.HUMAN}</SelectItem>
                  <SelectItem value="MATERIAL">{RESOURCE_TYPE_LABEL.MATERIAL}</SelectItem>
                  <SelectItem value="LICENSE">{RESOURCE_TYPE_LABEL.LICENSE}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full space-y-2 sm:w-28">
              <Label>Par page</Label>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => setPageSize(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue>{pageSize}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {enabled && isLoading && <LoadingState rows={5} />}
        {enabled && errMsg && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>{errMsg}</AlertDescription>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()}>
              Réessayer
            </Button>
          </Alert>
        )}
        {enabled && !isLoading && !error && total === 0 && (
          <EmptyState
            title={hasFilters ? 'Aucun résultat' : 'Aucune ressource disponible'}
            description={
              hasFilters
                ? 'Ajustez les filtres ou la recherche.'
                : 'Créez une première ressource ou complétez le catalogue depuis ce module.'
            }
          />
        )}
        {enabled && !isLoading && !error && total > 0 && (
          <>
            <div className="overflow-x-auto rounded-md border border-white/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left">
                    <th className="p-3 font-medium">Nom</th>
                    <th className="p-3 font-medium">Type</th>
                    <th className="p-3 font-medium">Portée</th>
                    <th className="p-3 font-medium">Société</th>
                    <th className="p-3 font-medium">Rôle métier</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((r) => (
                    <tr key={r.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="p-3">
                        {canUpdateResource ? (
                          <button
                            type="button"
                            className="cursor-pointer text-left text-primary hover:underline"
                            title="Modifier la ressource"
                            aria-label={`Modifier ${formatResourceDisplayName(r)}`}
                            onClick={() => setEditResourceId(r.id)}
                          >
                            {formatResourceDisplayName(r)}
                          </button>
                        ) : (
                          <span className="text-foreground">
                            {formatResourceDisplayName(r)}
                          </span>
                        )}
                      </td>
                      <td className="p-3">{RESOURCE_TYPE_LABEL[r.type]}</td>
                      <td className="p-3">
                        {r.type === 'HUMAN' && r.affiliation
                          ? RESOURCE_AFFILIATION_LABEL[r.affiliation]
                          : '—'}
                      </td>
                      <td className="p-3">
                        {r.type === 'HUMAN' && r.affiliation === 'EXTERNAL' && r.companyName
                          ? r.companyName
                          : '—'}
                      </td>
                      <td className="p-3">{r.role?.name ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col items-stretch justify-between gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center">
              <p className="text-sm text-muted-foreground">
                {from}–{to} sur {total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!canPrev}
                  onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                  aria-label="Page précédente"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="min-w-[5rem] text-center text-sm tabular-nums">
                  {pageIndex + 1} / {totalPages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!canNext}
                  onClick={() => setPageIndex((p) => p + 1)}
                  aria-label="Page suivante"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </PageContainer>
    </RequireActiveClient>
  );
}
