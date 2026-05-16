'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { AccessModelIssueCategory } from '../api/access-model.api';
import { categoryLabel } from '../lib/labels';
import { useAccessModelHealth } from '../hooks/use-access-model-health';
import { useAccessModelIssues } from '../hooks/use-access-model-issues';
import { AccessModelIssueFilters } from './access-model-issue-filters';
import { AccessModelIssuesTable } from './access-model-issues-table';
import { AccessModelKpiCards } from './access-model-kpi-cards';
import { AccessModelRolloutBanner } from './access-model-rollout-banner';

export function AccessModelPage() {
  const [category, setCategory] =
    useState<AccessModelIssueCategory>('missing_owner');
  const [page, setPage] = useState(1);
  const [moduleFilter, setModuleFilter] = useState('');
  const [search, setSearch] = useState('');

  const healthQ = useAccessModelHealth();
  const issuesQ = useAccessModelIssues({
    category,
    page,
    module: moduleFilter || undefined,
    search: search || undefined,
  });

  const total = issuesQ.data?.total ?? 0;
  const limit = issuesQ.data?.limit ?? 25;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <PageContainer>
      <PageHeader
        title="Modèle d'accès"
        description="Pilotage de la santé organisationnelle, des liens HUMAN et des partages ACL pour le client actif."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/client/help/access-model">Aide modèle d&apos;accès</Link>
          </Button>
        }
      />

      {healthQ.isError && (
        <p className="mb-4 text-sm text-destructive">
          Impossible de charger la synthèse. Vérifiez vos droits (
          <code className="text-xs">access_model.read</code>).
        </p>
      )}

      {healthQ.data && (
        <>
          <AccessModelRolloutBanner rollout={healthQ.data.rollout} />
          <AccessModelKpiCards
            health={healthQ.data}
            activeCategory={category}
            onCategoryChange={(c) => {
              setCategory(c);
              setPage(1);
            }}
          />
        </>
      )}

      <Card className="p-4">
        <h3 className="mb-3 text-sm font-medium">{categoryLabel(category)}</h3>
        <AccessModelIssueFilters
          moduleFilter={moduleFilter}
          search={search}
          onModuleChange={(v) => {
            setModuleFilter(v);
            setPage(1);
          }}
          onSearchChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
        />
        <AccessModelIssuesTable
          items={issuesQ.data?.items ?? []}
          truncated={issuesQ.data?.truncated ?? false}
          isLoading={issuesQ.isLoading}
        />
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Page {page} / {totalPages} ({total} alerte{total > 1 ? 's' : ''})
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Précédent
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Suivant
              </Button>
            </div>
          </div>
        )}
      </Card>
    </PageContainer>
  );
}
