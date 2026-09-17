'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LoadingState } from '@/components/feedback/loading-state';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { listComplianceFrameworks } from '@/features/compliance/api/compliance.api';
import { toast } from '@/lib/toast';

type CatalogItem = {
  id: string;
  name: string;
  version: string;
  requirementCount: number;
};

export default function ComplianceFrameworksPage() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const queryClient = useQueryClient();

  const q = useQuery({
    queryKey: ['compliance', 'frameworks', activeClient?.id],
    queryFn: () => listComplianceFrameworks(authFetch),
    enabled: !!activeClient?.id,
  });

  const catalogQuery = useQuery({
    queryKey: ['compliance', 'frameworks-catalog', activeClient?.id],
    queryFn: async () => {
      const res = await authFetch('/api/compliance/frameworks/catalog');
      if (!res.ok) throw new Error('Catalogue indisponible');
      return res.json() as Promise<CatalogItem[]>;
    },
    enabled: !!activeClient?.id,
  });

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
      await queryClient.invalidateQueries({
        queryKey: ['compliance', 'frameworks', activeClient?.id],
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const activatedKeys = new Set(
    (q.data ?? []).map((f) => `${f.name}::${f.version}`),
  );

  return (
    <RequireActiveClient>
      <PageContainer className="flex flex-col gap-6">
        <PageHeader
          title="Référentiels"
          description="Cadres activés pour le client courant — proposés depuis le catalogue plateforme."
        />

        <section aria-labelledby="catalog-title" className="space-y-3">
          <h2 id="catalog-title" className="text-base font-semibold">
            Proposés par la plateforme
          </h2>
          {catalogQuery.isLoading ? (
            <LoadingState rows={2} />
          ) : (
            <div className="space-y-2">
              {(catalogQuery.data ?? []).map((item) => {
                const key = `${item.name}::${item.version}`;
                const already = activatedKeys.has(key);
                return (
                  <Card key={item.id}>
                    <CardContent className="flex flex-wrap items-center justify-between gap-2 py-4">
                      <div>
                        <p className="font-medium">
                          {item.name}{' '}
                          <span className="text-muted-foreground">
                            ({item.version})
                          </span>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {item.requirementCount} exigence
                          {item.requirementCount > 1 ? 's' : ''}
                        </p>
                      </div>
                      {already ? (
                        <Badge variant="secondary">Déjà activé</Badge>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          className="min-h-11 sm:min-h-9"
                          disabled={activateMut.isPending}
                          onClick={() => activateMut.mutate(item.id)}
                        >
                          Activer
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
              {(catalogQuery.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucun référentiel proposé pour le moment.
                </p>
              ) : null}
            </div>
          )}
        </section>

        <section aria-labelledby="active-title" className="space-y-3">
          <h2 id="active-title" className="text-base font-semibold">
            Activés pour ce client
          </h2>
          {q.isLoading ? (
            <LoadingState rows={4} />
          ) : (
            <div className="space-y-2">
              {(q.data ?? []).map((f) => (
                <Card key={f.id}>
                  <CardContent className="flex flex-wrap items-center justify-between gap-2 py-4">
                    <div>
                      <p className="font-medium">
                        {f.name}{' '}
                        <span className="text-muted-foreground">({f.version})</span>
                      </p>
                    </div>
                    <Badge variant={f.isActive ? 'default' : 'secondary'}>
                      {f.isActive ? 'Actif' : 'Inactif'}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
              {q.data?.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucun référentiel activé — utilisez le catalogue ci-dessus.
                </p>
              ) : null}
            </div>
          )}
        </section>
      </PageContainer>
    </RequireActiveClient>
  );
}
