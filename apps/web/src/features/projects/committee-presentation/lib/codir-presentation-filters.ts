import type { CodirPageSettings } from '../hooks/use-codir-page-settings';
import {
  groupPortfolioGanttByTag,
} from '../../lib/portfolio-gantt-group';
import type { PortfolioGanttRow, ProjectListItem } from '../../types/project.types';

/** Statuts sélectionnables dans le lancement présentation CODIR. */
export const CODIR_PRESENTATION_STATUSES = [
  'DRAFT',
  'PLANNED',
  'IN_PROGRESS',
  'ON_HOLD',
  'COMPLETED',
  'CANCELLED',
  'ARCHIVED',
] as const;

export const DEFAULT_CODIR_PRESENTATION_STATUSES: string[] = [
  'DRAFT',
  'PLANNED',
  'IN_PROGRESS',
  'ON_HOLD',
  'COMPLETED',
];

export function filterProjectsForPresentation(
  projects: ProjectListItem[],
  settings: CodirPageSettings,
): ProjectListItem[] {
  const statuses = settings.presentationIncludedStatuses;
  if (statuses.length === 0) return [];

  const statusSet = new Set(statuses);
  let filtered = projects.filter((p) => statusSet.has(p.status));

  const tagIds = settings.presentationIncludedTagIds;
  if (tagIds.length > 0) {
    const tagSet = new Set(tagIds);
    filtered = filtered.filter((p) => p.tags.some((t) => tagSet.has(t.id)));
  }

  return filtered;
}

export function filterPortfolioGanttForPresentation(
  items: PortfolioGanttRow[],
  settings: CodirPageSettings,
): PortfolioGanttRow[] {
  const statuses = settings.presentationIncludedStatuses;
  if (statuses.length === 0) return [];

  const statusSet = new Set(statuses);
  return items.filter((row) => statusSet.has(row.status));
}

/** Groupement Gantt : par étiquette si filtre actif, sinon par catégorie portefeuille. */
export function codirPresentationGanttUsesTagGrouping(settings: CodirPageSettings): boolean {
  return settings.presentationIncludedTagIds.length > 0;
}

export function codirPortfolioGanttQueryParams(
  settings: CodirPageSettings,
): Record<string, string> {
  const params: Record<string, string> = {};
  if (settings.presentationIncludedTagIds.length > 0) {
    params.tagIds = settings.presentationIncludedTagIds.join(',');
    params.tagIdsMatch = 'any';
  }
  return params;
}

export type PresentationGanttSectionRef = {
  key: string;
  label: string;
};

/** Sections Gantt du diaporama — une entrée par étiquette filtrée, sinon une slide consolidée. */
export function resolvePresentationGanttSections(
  items: PortfolioGanttRow[],
  settings: CodirPageSettings,
): PresentationGanttSectionRef[] {
  if (!settings.includeGanttSlide) return [];

  const filtered = filterPortfolioGanttForPresentation(items, settings);
  if (codirPresentationGanttUsesTagGrouping(settings)) {
    const grouped = groupPortfolioGanttByTag(filtered, {
      visibleTagIds: settings.presentationIncludedTagIds,
    });
    const byKey = new Map(grouped.map((section) => [section.key, section]));

    return settings.presentationIncludedTagIds.map((tagId) => {
      const key = `tag:${tagId}`;
      const match = byKey.get(key);
      return {
        key,
        label: match?.label ?? 'Étiquette',
      };
    });
  }

  if (filtered.length === 0) return [];
  return [{ key: 'gantt:all', label: 'Portefeuille' }];
}

export function countPresentationGanttSlides(
  settings: CodirPageSettings,
  ganttSections?: PresentationGanttSectionRef[],
): number {
  if (!settings.includeGanttSlide) return 0;
  if (ganttSections != null) return ganttSections.length;
  if (codirPresentationGanttUsesTagGrouping(settings)) {
    return settings.presentationIncludedTagIds.length;
  }
  return 1;
}
