'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { LoadingState } from '@/components/feedback/loading-state';
import { RegistryBadge } from '@/lib/ui/registry-badge';
import { useActiveClient } from '@/hooks/use-active-client';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { listProjectChildren } from '../api/projects.api';
import { projectQueryKeys } from '../lib/project-query-keys';
import { projectDetail } from '../constants/project-routes';
import { PROJECT_STATUS_LABEL } from '../constants/project-enum-labels';

export function ProjectChildrenSection({ projectId }: { projectId: string }) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';

  const childrenQuery = useQuery({
    queryKey: projectQueryKeys.projectChildren(clientId, projectId, { limit: 20 }),
    queryFn: () =>
      listProjectChildren(authFetch, projectId, { page: 1, limit: 20, sortBy: 'name', sortOrder: 'asc' }),
    enabled: Boolean(clientId && projectId),
  });

  return (
    <section aria-labelledby="project-children-heading" className="starium-ov-card">
      <div className="starium-ov-card__head">
        <h2 id="project-children-heading" className="starium-ov-card__title">
          Sous-projets
        </h2>
      </div>
      {childrenQuery.isLoading ? (
        <LoadingState rows={2} />
      ) : childrenQuery.isError ? (
        <Alert variant="destructive" className="border-destructive/40">
          <AlertCircle aria-hidden />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>
            Impossible de charger les sous-projets pour le moment.
          </AlertDescription>
        </Alert>
      ) : (childrenQuery.data?.items.length ?? 0) === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun sous-projet rattaché.</p>
      ) : (
        <ul className="divide-y divide-border">
          {childrenQuery.data!.items.map((child) => (
            <li key={child.id}>
              <Link
                href={projectDetail(child.id)}
                className="flex min-h-11 flex-col justify-center gap-1 py-2 sm:flex-row sm:items-center sm:justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="font-medium text-foreground">
                  {child.code} — {child.name}
                </span>
                <RegistryBadge className="rounded-full border-0 bg-muted px-2 py-px text-[11px] font-semibold text-muted-foreground">
                  {PROJECT_STATUS_LABEL[child.status] ?? child.status}
                </RegistryBadge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
