'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, GitBranch } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { LoadingState } from '@/components/feedback/loading-state';
import { RegistryBadge } from '@/lib/ui/registry-badge';
import { usePermissions } from '@/hooks/use-permissions';
import { useActiveClient } from '@/hooks/use-active-client';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { listProjectChildren } from '../api/projects.api';
import { projectQueryKeys } from '../lib/project-query-keys';
import { projectDetail } from '../constants/project-routes';
import { PROJECT_STATUS_LABEL } from '../constants/project-enum-labels';
import type { ProjectDetail, ProjectParentSummary } from '../types/project.types';
import { PROJECT_PARENT_NONE_LABEL } from './project-parent-combobox';

function formatEntityLabel(item: Pick<ProjectParentSummary, 'code' | 'name'>) {
  return `${item.code} — ${item.name}`;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h3 className="starium-hierarchy-simple__label">{children}</h3>;
}

export function ProjectChildrenSection({ project }: { project: ProjectDetail }) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const { has } = usePermissions();
  const projectId = project.id;
  const childrenQuery = useQuery({
    queryKey: projectQueryKeys.projectChildren(clientId, projectId, { limit: 20 }),
    queryFn: () =>
      listProjectChildren(authFetch, projectId, {
        page: 1,
        limit: 20,
        sortBy: 'name',
        sortOrder: 'asc',
      }),
    enabled: Boolean(clientId && projectId),
  });

  return (
    <article aria-labelledby="project-hierarchy-heading" className="starium-ov-card">
      <div className="starium-ov-card__head">
        <h2 id="project-hierarchy-heading" className="starium-ov-card__title">
          Hiérarchie
        </h2>
        <span className="starium-ov-card__head-ico" aria-hidden>
          <GitBranch strokeWidth={1.75} />
        </span>
      </div>

      <div className="starium-hierarchy-simple">
        <section className="starium-hierarchy-simple__section" aria-label="Projet parent">
          <SectionLabel>Projet parent</SectionLabel>

          {project.parentProject ? (
            <div
              className="starium-hierarchy-simple__item starium-hierarchy-simple__item--static"
              role="group"
              aria-label="Projet parent"
            >
              <span className="starium-hierarchy-simple__item-text">
                {formatEntityLabel(project.parentProject)}
              </span>
              <RegistryBadge className="rounded-full border-0 bg-muted px-2 py-px text-[11px] font-semibold text-muted-foreground">
                {PROJECT_STATUS_LABEL[project.parentProject.status] ?? project.parentProject.status}
              </RegistryBadge>
            </div>
          ) : (
            <p className="starium-hierarchy-simple__empty">{PROJECT_PARENT_NONE_LABEL}</p>
          )}
        </section>

        <section className="starium-hierarchy-simple__section" aria-label="Sous-projets">
          <div className="starium-hierarchy-simple__head">
            <SectionLabel>Sous-projets</SectionLabel>
            {!childrenQuery.isLoading && !childrenQuery.isError ? (
              <span className="starium-hierarchy-simple__count">{childrenQuery.data?.items.length ?? 0}</span>
            ) : null}
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
          ) : (childrenQuery.data?.items.length ?? 0) == 0 ? (
            <p className="starium-hierarchy-simple__empty">Aucun sous-projet rattaché.</p>
          ) : (
            <ul className="starium-hierarchy-simple__list">
              {(childrenQuery.data?.items ?? []).map((child) => (
                <li key={child.id}>
                  <Link href={projectDetail(child.id)} className="starium-hierarchy-simple__item">
                    <span className="starium-hierarchy-simple__item-text">{formatEntityLabel(child)}</span>
                    <RegistryBadge className="rounded-full border-0 bg-muted px-2 py-px text-[11px] font-semibold text-muted-foreground">
                      {PROJECT_STATUS_LABEL[child.status] ?? child.status}
                    </RegistryBadge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </article>
  );
}
