'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingState } from '@/components/feedback/loading-state';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import {
  parseApiFormError,
  type AuthFetch,
} from '@/features/budgets/api/budget-management.api';

async function getRequirement(authFetch: AuthFetch, id: string) {
  const res = await authFetch(`/api/compliance/requirements/${id}`);
  if (!res.ok) throw await parseApiFormError(res);
  return res.json() as Promise<{
    requirement: { code: string; title: string; description: string | null };
    status: { status: string; comment: string | null } | null;
    evidences: Array<{ id: string; name: string; url: string | null }>;
    linkedRisks: Array<{ code: string; title: string; criticalityLevel: string }>;
    linkedRiskCount: number;
  }>;
}

export default function ComplianceRequirementDetailPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();

  const q = useQuery({
    queryKey: ['compliance', 'requirement', activeClient?.id, id],
    queryFn: () => getRequirement(authFetch, id),
    enabled: !!activeClient?.id && !!id,
  });

  return (
    <RequireActiveClient>
      <PageContainer className="flex flex-col gap-6">
        <Link href="/compliance/requirements" className="text-sm text-muted-foreground hover:text-foreground">
          ← Exigences
        </Link>
        {q.isLoading ? (
          <LoadingState rows={4} />
        ) : q.data ? (
          <>
            <PageHeader title={`${q.data.requirement.code} — ${q.data.requirement.title}`} />
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Statut</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {q.data.status ? (
                    <>
                      <Badge>{q.data.status.status}</Badge>
                      {q.data.status.comment ? (
                        <p className="text-sm text-muted-foreground">{q.data.status.comment}</p>
                      ) : null}
                    </>
                  ) : (
                    <Badge variant="secondary">Jamais évalué</Badge>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Preuves</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-inside list-disc text-sm">
                    {q.data.evidences.map((e) => (
                      <li key={e.id}>
                        {e.name}
                        {e.url ? (
                          <>
                            {' '}
                            <a
                              href={e.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary underline"
                            >
                              Lien
                            </a>
                          </>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                  {q.data.evidences.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucune preuve.</p>
                  ) : null}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Risques projet liés ({q.data.linkedRiskCount})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1 text-sm">
                    {q.data.linkedRisks.map((r) => (
                      <li key={r.code}>
                        <span className="font-mono text-xs">{r.code}</span> {r.title}{' '}
                        <Badge variant="outline" className="ml-1">
                          {r.criticalityLevel}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                  {q.data.linkedRisks.length === 0 ? (
                    <p className="text-muted-foreground">Aucun risque lié.</p>
                  ) : null}
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <p className="text-destructive">Exigence introuvable.</p>
        )}
      </PageContainer>
    </RequireActiveClient>
  );
}
