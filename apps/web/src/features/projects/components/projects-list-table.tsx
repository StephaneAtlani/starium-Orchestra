'use client';

import { useQuery } from '@tanstack/react-query';
import type { ProjectsListFilters } from '../hooks/use-projects-list-filters';
import type { ProjectListItem } from '../types/project.types';
import { useAuthenticatedFetch } from '@/hooks/use-authenticated-fetch';
import { useActiveClient } from '@/hooks/use-active-client';
import { useClientUiBadgeConfig } from '@/features/ui/hooks/use-client-ui-badge-config';
import { listAssignableUsers } from '../api/projects.api';
import { projectQueryKeys } from '../lib/project-query-keys';
import type { ProjectsTableColumnDensity } from '../lib/projects-table-column-density';
import { ProjectsListMobileView } from './projects-list-mobile-view';
import { ProjectsListTableDesktop } from './projects-list-table-desktop';

/**
 * Liste projets portefeuille — table desktop (colonnes basiques / complètes) ; cartes mobile (< md).
 */
export function ProjectsListTable({
  items,
  filters,
  setFilters,
  onReset,
  columnDensity = 'basic',
}: {
  items: ProjectListItem[];
  filters: ProjectsListFilters;
  setFilters: (updates: Partial<ProjectsListFilters>) => void;
  onReset?: () => void;
  columnDensity?: ProjectsTableColumnDensity;
}) {
  const authFetch = useAuthenticatedFetch();
  const { activeClient } = useActiveClient();
  const clientId = activeClient?.id ?? '';
  const assignableUsersQuery = useQuery({
    queryKey: projectQueryKeys.assignableUsers(clientId),
    queryFn: () => listAssignableUsers(authFetch),
    enabled: Boolean(clientId),
  });
  const { merged: badgeMerged } = useClientUiBadgeConfig();
  const ownerOptions = (assignableUsersQuery.data?.users ?? [])
    .map((user) => {
      const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
      return { id: user.id, label: name || user.email };
    })
    .sort((a, b) => a.label.localeCompare(b.label, 'fr-FR'));
  const myRoleOptions = Array.from(
    new Set(
      items
        .flatMap((item) => item.myRoles ?? (item.myRole ? [item.myRole] : []))
        .map((role) => role.trim())
        .filter((value): value is string => Boolean(value && value.length > 0)),
    ),
  ).sort((a, b) => a.localeCompare(b, 'fr'));

  return (
    <>
      <ProjectsListMobileView
        items={items}
        filters={filters}
        setFilters={setFilters}
        onReset={onReset ?? (() => setFilters({}))}
        myRoleOptions={myRoleOptions}
        ownerOptions={ownerOptions}
        badgeMerged={badgeMerged}
      />
      <div className="hidden md:block">
        <ProjectsListTableDesktop
          items={items}
          filters={filters}
          setFilters={setFilters}
          columnDensity={columnDensity}
        />
      </div>
    </>
  );
}
