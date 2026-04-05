import { describe, expect, it } from 'vitest';
import { isEquipesDropdownChildActive } from './equipes-nav-helpers';

describe('isEquipesDropdownChildActive', () => {
  it('Compétences: actif sur catalogue', () => {
    expect(isEquipesDropdownChildActive('/teams/skills', '/teams/skills')).toBe(true);
    expect(isEquipesDropdownChildActive('/teams/structure/teams', '/teams/skills')).toBe(false);
  });

  it('Temps réalisé: actif sur /teams/time-entries', () => {
    expect(isEquipesDropdownChildActive('/teams/time-entries', '/teams/time-entries')).toBe(true);
    expect(isEquipesDropdownChildActive('/teams/skills', '/teams/time-entries')).toBe(false);
  });

  it('Options temps: actif sur /teams/time-entries/options ; pas sur la grille seule', () => {
    expect(
      isEquipesDropdownChildActive('/teams/time-entries/options', '/teams/time-entries/options'),
    ).toBe(true);
    expect(isEquipesDropdownChildActive('/teams/time-entries', '/teams/time-entries/options')).toBe(
      false,
    );
    expect(isEquipesDropdownChildActive('/teams/time-entries/options', '/teams/time-entries')).toBe(
      false,
    );
  });

  it('Structure & équipes: actif sur /teams/structure sans empiéter sur compétences', () => {
    expect(isEquipesDropdownChildActive('/teams/structure/teams', '/teams/structure/teams')).toBe(
      true,
    );
    expect(
      isEquipesDropdownChildActive('/teams/structure/manager-scopes', '/teams/structure/teams'),
    ).toBe(true);
    expect(isEquipesDropdownChildActive('/teams/skills', '/teams/structure/teams')).toBe(false);
    expect(isEquipesDropdownChildActive('/teams/time-entries', '/teams/structure/teams')).toBe(
      false,
    );
  });
});
