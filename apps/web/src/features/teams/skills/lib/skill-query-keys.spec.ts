import { describe, expect, it } from 'vitest';
import { skillQueryKeys } from './skill-query-keys';

describe('skillQueryKeys', () => {
  const clientId = 'client-1';

  it('inclut clientId dans les racines', () => {
    expect(skillQueryKeys.root(clientId)).toEqual(['teams', clientId, 'skills']);
    expect(skillQueryKeys.categoriesRoot(clientId)).toEqual([
      'teams',
      clientId,
      'skill-categories',
    ]);
  });

  it('liste skills paramétrée est stable pour les mêmes params', () => {
    const params = { offset: 0, limit: 20, sortBy: 'name' as const, sortOrder: 'asc' as const };
    const a = skillQueryKeys.list(clientId, params);
    const b = skillQueryKeys.list(clientId, params);
    expect(a).toEqual(b);
    expect(a).toContain(clientId);
  });

  it('skillCollaborators inclut skillId et params', () => {
    const k = skillQueryKeys.skillCollaborators(clientId, 'sk-1', { offset: 0, limit: 20 });
    expect(k).toContain('sk-1');
    expect(k).toContain(clientId);
  });
});
