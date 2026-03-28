import type { AuthFetch } from '@/features/budgets/api/budget-management.api';
import { listProjects } from '../../api/projects.api';
import type { ProjectListItem } from '../../types/project.types';

const PAGE_LIMIT = 100;

/**
 * Pagination complète `listProjects` jusqu’à épuisement (MVP registre transverse).
 * Borne sécurité : 200 pages max (~20k projets) — au-delà, dépendance backend prioritaire.
 */
export async function fetchAllProjectsForRegistry(authFetch: AuthFetch): Promise<ProjectListItem[]> {
  const all: ProjectListItem[] = [];
  let page = 1;
  const maxPages = 200;

  for (;;) {
    const res = await listProjects(authFetch, { page, limit: PAGE_LIMIT });
    all.push(...res.items);
    if (res.items.length === 0 || all.length >= res.total) break;
    page += 1;
    if (page > maxPages) break;
  }

  return all;
}
