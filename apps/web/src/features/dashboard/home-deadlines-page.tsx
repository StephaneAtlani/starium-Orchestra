'use client';

import { useMemo } from 'react';
import { Calendar } from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { useProjectsListQuery } from '@/features/projects/hooks/use-projects-list-query';
import { HomeDashboardDeadlineRow } from './components/home-dashboard-deadlines';
import { selectUpcomingDeadlines } from './lib/home-dashboard-metrics';

const WITHIN_DAYS = 90;
const LIST_LIMIT = 100;

export function HomeDeadlinesPage() {
  const projectsQuery = useProjectsListQuery({
    page: 1,
    limit: 100,
    sortBy: 'targetEndDate',
    sortOrder: 'asc',
    myProjectsOnly: true,
  });

  const items = useMemo(
    () =>
      selectUpcomingDeadlines(projectsQuery.data?.items ?? [], {
        withinDays: WITHIN_DAYS,
        limit: LIST_LIMIT,
      }),
    [projectsQuery.data?.items],
  );

  const loading = projectsQuery.isLoading && projectsQuery.data == null;
  const errored = projectsQuery.isError && projectsQuery.data == null;

  return (
    <PageContainer>
      <div className="starium-stack">
        <PageHeader
          title="Prochaines échéances"
          description="Jalons à venir sur les projets où vous intervenez (90 jours)."
          backHref="/dashboard"
          eyebrow="Tableau de bord"
        />

        <section
          className="starium-section"
          aria-labelledby="my-deadlines-heading"
        >
          <div className="mb-4 flex items-center gap-2">
            <Calendar
              className="size-4 text-[color:var(--brand-gold)]"
              aria-hidden
            />
            <h2 id="my-deadlines-heading" className="starium-section-title text-base">
              {loading
                ? 'Chargement…'
                : `${items.length} échéance${items.length > 1 ? 's' : ''}`}
            </h2>
          </div>

          {loading ? (
            <LoadingState rows={6} />
          ) : errored ? (
            <ErrorState
              message="Impossible de charger les échéances. Réessayez dans un instant."
              onRetry={() => void projectsQuery.refetch()}
            />
          ) : items.length === 0 ? (
            <EmptyState
              title="Aucune échéance à venir"
              description="Aucun jalon prochain sur vos projets dans les 90 jours."
              className="py-10"
            />
          ) : (
            <ul className="divide-y divide-border/70" aria-live="polite">
              {items.map((item) => (
                <li key={item.id}>
                  <HomeDashboardDeadlineRow item={item} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </PageContainer>
  );
}
