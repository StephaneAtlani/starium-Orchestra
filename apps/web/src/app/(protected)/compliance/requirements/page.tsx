'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { LoadingState } from '@/components/feedback/loading-state';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import {
  parseApiFormError,
  type AuthFetch,
} from '@/features/budgets/api/budget-management.api';

type ReqRow = {
  id: string;
  code: string;
  title: string;
  framework: { name: string; version: string };
  statuses: Array<{ status: string }>;
};

async function listRequirements(authFetch: AuthFetch, _clientId: string) {
  const res = await authFetch('/api/compliance/requirements');
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<ReqRow[]>;
}

export default function ComplianceRequirementsPage() {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();

  const q = useQuery({
    queryKey: ['compliance', 'requirements', activeClient?.id],
    queryFn: () => listRequirements(authFetch, activeClient!.id),
    enabled: !!activeClient?.id,
  });

  return (
    <RequireActiveClient>
      <PageContainer className="flex flex-col gap-6">
        <PageHeader title="Exigences" description="Contrôles par référentiel — statut courant du client" />
        {q.isLoading ? (
          <LoadingState rows={6} />
        ) : (
          <div className="space-y-2">
            {(q.data ?? []).map((r) => {
              const st = r.statuses[0]?.status;
              return (
                <Card key={r.id}>
                  <CardContent className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-mono text-xs text-muted-foreground">{r.code}</p>
                      <p className="font-medium">{r.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.framework.name} {r.framework.version}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {st ? (
                        <Badge variant="outline">{st}</Badge>
                      ) : (
                        <Badge variant="secondary">Jamais évalué</Badge>
                      )}
                      <Link
                        href={`/compliance/requirements/${r.id}`}
                        className="text-sm text-primary underline-offset-4 hover:underline"
                      >
                        Détail
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </PageContainer>
    </RequireActiveClient>
  );
}
