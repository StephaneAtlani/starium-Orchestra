import { describe, expect, it } from 'vitest';
import { isProjectSheetEditingLocked } from './project-sheet-editing-locked';

describe('isProjectSheetEditingLocked', () => {
  it('verrouille les statuts terminaux', () => {
    expect(isProjectSheetEditingLocked('COMPLETED')).toBe(true);
    expect(isProjectSheetEditingLocked('CANCELLED')).toBe(true);
    expect(isProjectSheetEditingLocked('ARCHIVED')).toBe(true);
  });

  it('laisse éditable un projet actif', () => {
    expect(isProjectSheetEditingLocked('DRAFT')).toBe(false);
    expect(isProjectSheetEditingLocked('IN_PROGRESS')).toBe(false);
    expect(isProjectSheetEditingLocked('ON_HOLD')).toBe(false);
  });
});
