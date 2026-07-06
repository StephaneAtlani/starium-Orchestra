export type ProjectsTableColumnDensity = 'basic' | 'extended';

export const PROJECTS_TABLE_COLUMN_DENSITY_STORAGE_KEY =
  'starium.projects.tableColumnDensity';

export function readProjectsTableColumnDensity(): ProjectsTableColumnDensity {
  if (typeof window === 'undefined') return 'basic';
  try {
    const stored = window.localStorage.getItem(PROJECTS_TABLE_COLUMN_DENSITY_STORAGE_KEY);
    if (stored === 'basic' || stored === 'extended') return stored;
  } catch {
    // ignore localStorage failures
  }
  return 'basic';
}

export function persistProjectsTableColumnDensity(value: ProjectsTableColumnDensity) {
  try {
    window.localStorage.setItem(PROJECTS_TABLE_COLUMN_DENSITY_STORAGE_KEY, value);
  } catch {
    // ignore localStorage failures
  }
}
