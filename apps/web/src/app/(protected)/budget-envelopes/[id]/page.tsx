'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { RequireActiveClient } from '@/components/RequireActiveClient';
import { PageContainer } from '@/components/layout/page-container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useBudgetEnvelope, useBudgetEnvelopeLines } from '@/features/budgets/hooks/use-budget-envelope';
import { BudgetEnvelopeHeader } from '@/features/budgets/components/budget-envelope-header';
import { BudgetEnvelopeIdentityCard } from '@/features/budgets/components/budget-envelope-identity-card';
import { BudgetEnvelopeContextCard } from '@/features/budgets/components/budget-envelope-context-card';
import { BudgetEnvelopeSummaryCards } from '@/features/budgets/components/budget-envelope-summary-cards';
import { BudgetEnvelopeLinesTable } from '@/features/budgets/components/budget-envelope-lines-table';

const DEFAULT_LIMIT = 20;

export default function BudgetEnvelopeDetailPage() {
  const params = useParams();
  const envelopeId = typeof params.id === 'string' ? params.id : null;

  const [offset, setOffset] = React.useState(0);

  const envelopeQuery = useBudgetEnvelope(envelopeId);
  const linesQuery = useBudgetEnvelopeLines(envelopeId, {
    offset,
    limit: DEFAULT_LIMIT,
  });

  const isLoading = envelopeQuery.isLoading || linesQuery.isLoading;
  const error = envelopeQuery.error ?? linesQuery.error;

  const envelope = envelopeQuery.data ?? null;

  return (
    <RequireActiveClient>
      <PageContainer>
        {isLoading && !envelope && (
          <>
            <div className="mb-4 h-10 w-1/2 animate-pulse rounded bg-muted" />
            <div className="grid gap-4 md:grid-cols-2 mb-6">
              <div className="h-40 rounded bg-muted animate-pulse" />
              <div className="h-40 rounded bg-muted animate-pulse" />
            </div>
            <div className="h-24 rounded bg-muted animate-pulse" />
          </>
        )}

        {!isLoading && (error || !envelope) && (
          <>
            <h1 className="text-2xl font-semibold tracking-tight mb-2">
              Enveloppe budgétaire
            </h1>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Aucune enveloppe à afficher</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  L’enveloppe demandée est introuvable ou vous n’y avez pas accès.
                </p>
              </CardContent>
            </Card>
          </>
        )}

        {envelope && (
          <>
            <div className="mb-4">
              <BudgetEnvelopeHeader envelope={envelope} />
            </div>

            <div className="grid gap-4 md:grid-cols-2 mb-6">
              <BudgetEnvelopeIdentityCard envelope={envelope} />
              <BudgetEnvelopeContextCard envelope={envelope} />
            </div>

            <BudgetEnvelopeSummaryCards envelope={envelope} />

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Lignes budgétaires de l’enveloppe
                </CardTitle>
              </CardHeader>
              <CardContent>
                <BudgetEnvelopeLinesTable
                  lines={linesQuery.data?.items ?? []}
                  isLoading={linesQuery.isLoading}
                  error={linesQuery.error}
                  total={linesQuery.data?.total ?? 0}
                  offset={offset}
                  limit={DEFAULT_LIMIT}
                  onPageChange={setOffset}
                />
              </CardContent>
            </Card>
          </>
        )}
      </PageContainer>
    </RequireActiveClient>
  );
}

