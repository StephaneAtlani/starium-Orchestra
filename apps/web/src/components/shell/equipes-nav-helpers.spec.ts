import { describe, expect, it } from 'vitest';
import { isEquipesDropdownChildActive } from './equipes-nav-helpers';

describe('isEquipesDropdownChildActive', () => {
  it('Collaborateurs: actif sur liste et détail', () => {
    expect(isEquipesDropdownChildActive('/teams/collaborators', '/teams/collaborators')).toBe(true);
    expect(
      isEquipesDropdownChildActive('/teams/collaborators/x1', '/teams/collaborators'),
    ).toBe(true);
    expect(isEquipesDropdownChildActive('/teams/structure/teams', '/teams/collaborators')).toBe(
      false,
    );
  });

  it('Compétences: actif sur catalogue', () => {
    expect(isEquipesDropdownChildActive('/teams/skills', '/teams/skills')).toBe(true);
    expect(isEquipesDropdownChildActive('/teams/structure/teams', '/teams/skills')).toBe(false);
  });

  it('Structure & équipes: actif sur /teams/structure sans empiéter sur collaborateurs/compétences', () => {
    expect(isEquipesDropdownChildActive('/teams/structure/teams', '/teams/structure/teams')).toBe(
      true,
    );
    expect(
      isEquipesDropdownChildActive('/teams/structure/manager-scopes', '/teams/structure/teams'),
    ).toBe(true);
    expect(
      isEquipesDropdownChildActive('/teams/collaborators', '/teams/structure/teams'),
    ).toBe(false);
    expect(isEquipesDropdownChildActive('/teams/skills', '/teams/structure/teams')).toBe(false);
  });
});
