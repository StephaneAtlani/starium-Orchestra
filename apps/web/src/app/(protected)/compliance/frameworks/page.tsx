'use client';

import { useQuery } from '@tanstack/react-query';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { LoadingState } from '@/components/feedback/loading-state';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { listComplianceFrameworks } from '@/features/compliance/api/compliance.api';

export default function ComplianceFrameworksPage() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();

  const q = useQuery({
    queryKey: ['compliance', 'frameworks', activeClient?.id],
    queryFn: () => listComplianceFrameworks(authFetch),
    enabled: !!activeClient?.id,
  });

  return (
    <RequireActiveClient>
      <PageContainer className="flex flex-col gap-6">
        <PageHeader title="Référentiels" description="Cadres activés pour le client courant" />
        {q.isLoading ? (
          <LoadingState rows={4} />
        ) : (
          <div className="space-y-2">
            {(q.data ?? []).map((f) => (
              <Card key={f.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-2 py-4">
                  <div>
                    <p className="font-medium">
                      {f.name} <span className="text-muted-foreground">({f.version})</span>
                    </p>
                  </div>
                  <Badge variant={f.isActive ? 'default' : 'secondary'}>
                    {f.isActive ? 'Actif' : 'Inactif'}
                  </Badge>
                </CardContent>
              </Card>
            ))}
            {q.data?.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun référentiel. Lancez le seed démo ou créez-en via l’API.</p>
            ) : null}
          </div>
        )}
      </PageContainer>
    </RequireActiveClient>
  );
}
