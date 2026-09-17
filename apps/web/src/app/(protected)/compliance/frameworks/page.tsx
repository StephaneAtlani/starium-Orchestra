'use client';

import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import {
  listComplianceFrameworkCatalog,
  listComplianceFrameworks,
  type ComplianceCatalogItemApi,
} from '@/features/compliance/api/compliance.api';
import { ComplianceCatalogCard } from '@/features/compliance/components/compliance-catalog-card';
import { toast } from '@/lib/toast';

function groupByFamily(
  items: ComplianceCatalogItemApi[],
): Array<{ family: string; items: ComplianceCatalogItemApi[] }> {
  const map = new Map<string, ComplianceCatalogItemApi[]>();
  for (const item of items) {
    const family = item.familyLabel || 'Référentiel';
    const list = map.get(family) ?? [];
    list.push(item);
    map.set(family, list);
  }
  return [...map.entries()]
    .map(([family, groupItems]) => ({
      family,
      items: groupItems.sort((a, b) =>
        a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }),
      ),
    }))
    .sort((a, b) => a.family.localeCompare(b.family, 'fr'));
}

export default function ComplianceFrameworksPage() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const queryClient = useQueryClient();
  const clientId = activeClient?.id;

  const q = useQuery({
    queryKey: ['compliance', 'frameworks', clientId],
    queryFn: () => listComplianceFrameworks(authFetch),
    enabled: !!clientId,
  });

  const catalogQuery = useQuery({
    queryKey: ['compliance', 'frameworks-catalog', clientId],
    queryFn: () => listComplianceFrameworkCatalog(authFetch),
    enabled: !!clientId,
  });

  const catalogGroups = useMemo(
    () => groupByFamily(catalogQuery.data ?? []),
    [catalogQuery.data],
  );

  const invalidateFrameworkQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ['compliance', 'frameworks', clientId],
      }),
      queryClient.invalidateQueries({
        queryKey: ['compliance', 'frameworks-catalog', clientId],
      }),
      queryClient.invalidateQueries({
        queryKey: ['compliance', clientId, 'frameworks-summary'],
      }),
      queryClient.invalidateQueries({
        queryKey: ['compliance', 'dashboard', clientId],
      }),
    ]);
  };

  const activateMut = useMutation({
    mutationFn: async (platformFrameworkId: string) => {
      const res = await authFetch('/api/compliance/frameworks/activate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ platformFrameworkId }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          message?: string | string[];
        };
        const msg = Array.isArray(body.message)
          ? body.message.join(', ')
          : body.message;
        throw new Error(msg || `Erreur ${res.status}`);
      }
      return res.json();
    },
    onSuccess: async () => {
      toast.success('Référentiel activé pour le client');
      await invalidateFrameworkQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setActiveMut = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await authFetch(`/api/compliance/frameworks/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          message?: string | string[];
        };
        const msg = Array.isArray(body.message)
          ? body.message.join(', ')
          : body.message;
        throw new Error(msg || `Erreur ${res.status}`);
      }
      return res.json() as Promise<{ isActive: boolean }>;
    },
    onSuccess: async (_data, vars) => {
      toast.success(
        vars.isActive ? 'Référentiel réactivé' : 'Référentiel désactivé',
      );
      await invalidateFrameworkQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const activatedKeys = new Set(
    (q.data ?? [])
      .filter((f) => f.isActive)
      .map((f) => `${f.name}::${f.version}`),
  );
  const inactiveByKey = new Map(
    (q.data ?? [])
      .filter((f) => !f.isActive)
      .map((f) => [`${f.name}::${f.version}`, f]),
  );

  return (
    <RequireActiveClient>
      <PageContainer className="flex flex-col gap-6">
        <PageHeader
          title="Référentiels"
          description="Comparez périmètre et volume avant d’activer un cadre pour le client courant."
        />

        <section aria-labelledby="catalog-title" className="space-y-3">
          <h2 id="catalog-title" className="text-base font-semibold">
            Proposés par la plateforme
          </h2>
          {catalogQuery.isLoading ? (
            <LoadingState rows={3} />
          ) : catalogQuery.isError ? (
            <ErrorState
              message={
                catalogQuery.error instanceof Error
                  ? catalogQuery.error.message
                  : 'Impossible de charger le catalogue.'
              }
              onRetry={() => void catalogQuery.refetch()}
            />
          ) : (catalogQuery.data ?? []).length === 0 ? (
            <EmptyState
              title="Aucun référentiel proposé"
              description="Le catalogue plateforme est vide. Un administrateur doit importer des cadres CISO."
            />
          ) : (
            <div className="space-y-6">
              {catalogGroups.map((group) => (
                <div key={group.family} className="space-y-2">
                  <h3 className="starium-overline text-muted-foreground">
                    {group.family}
                  </h3>
                  <div className="space-y-2">
                    {group.items.map((item) => {
                      const key = `${item.name}::${item.version}`;
                      const already = activatedKeys.has(key);
                      const inactive = inactiveByKey.get(key);
                      return (
                        <ComplianceCatalogCard
                          key={item.id}
                          item={item}
                          catalogAction={
                            already
                              ? { kind: 'activated' }
                              : {
                                  kind: inactive ? 'reactivate' : 'activate',
                                  pending:
                                    activateMut.isPending ||
                                    setActiveMut.isPending,
                                  onActivate: () =>
                                    inactive
                                      ? setActiveMut.mutate({
                                          id: inactive.id,
                                          isActive: true,
                                        })
                                      : activateMut.mutate(item.id),
                                }
                          }
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section aria-labelledby="active-title" className="space-y-3">
          <h2 id="active-title" className="text-base font-semibold">
            Activés pour ce client
          </h2>
          {q.isLoading ? (
            <LoadingState rows={4} />
          ) : q.isError ? (
            <ErrorState
              message={
                q.error instanceof Error
                  ? q.error.message
                  : 'Impossible de charger les référentiels actifs.'
              }
              onRetry={() => void q.refetch()}
            />
          ) : (q.data ?? []).length === 0 ? (
            <EmptyState
              title="Aucun référentiel activé"
              description="Activez un cadre depuis le catalogue ci-dessus pour démarrer le suivi."
            />
          ) : (
            <div className="space-y-2">
              {(q.data ?? []).map((f) => (
                <ComplianceCatalogCard
                  key={f.id}
                  item={f}
                  clientActions={{
                    pending: setActiveMut.isPending,
                    onToggleActive: () =>
                      setActiveMut.mutate({
                        id: f.id,
                        isActive: !f.isActive,
                      }),
                  }}
                />
              ))}
            </div>
          )}
        </section>
      </PageContainer>
    </RequireActiveClient>
  );
}
