import { describe, expect, it } from 'vitest';
import { isScenarioWorkspaceReadOnly } from './scenario-workspace-readonly';

describe('isScenarioWorkspaceReadOnly', () => {
  it('retourne true pour ARCHIVED', () => {
    expect(isScenarioWorkspaceReadOnly({ status: 'ARCHIVED' })).toBe(true);
  });

  it('retourne false pour DRAFT ou SELECTED', () => {
    expect(isScenarioWorkspaceReadOnly({ status: 'DRAFT' })).toBe(false);
    expect(isScenarioWorkspaceReadOnly({ status: 'SELECTED' })).toBe(false);
  });
});
