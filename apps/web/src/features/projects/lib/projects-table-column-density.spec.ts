import { describe, expect, it } from 'vitest';
import {
  persistProjectsTableColumnDensity,
  readProjectsTableColumnDensity,
  PROJECTS_TABLE_COLUMN_DENSITY_STORAGE_KEY,
} from './projects-table-column-density';

describe('projects-table-column-density', () => {
  it('lit et persiste basic | extended', () => {
    persistProjectsTableColumnDensity('extended');
    expect(readProjectsTableColumnDensity()).toBe('extended');
    expect(window.localStorage.getItem(PROJECTS_TABLE_COLUMN_DENSITY_STORAGE_KEY)).toBe(
      'extended',
    );

    persistProjectsTableColumnDensity('basic');
    expect(readProjectsTableColumnDensity()).toBe('basic');
  });
});
