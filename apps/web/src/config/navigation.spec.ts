import { describe, expect, it } from 'vitest';
import { navigation } from './navigation';

describe('platform navigation', () => {
  it('expose une entrée rôles système platformOnly', () => {
    const platformSection = navigation.find((section) => section.section === 'Platform');
    expect(platformSection).toBeDefined();

    const systemRolesItem = platformSection?.items.find(
      (item) => item.href === '/admin/system-roles',
    );

    expect(systemRolesItem).toBeDefined();
    expect(systemRolesItem?.platformOnly).toBe(true);
    expect(systemRolesItem?.scope).toBe('platform');
  });

  it('expose une entrée fournisseurs côté client avec procurement.read', () => {
    const pilotagesSection = navigation.find((section) => section.section === 'Pilotages');
    expect(pilotagesSection).toBeDefined();

    const suppliersParent = pilotagesSection?.items.find((item) => item.label === 'Fournisseurs');
    expect(suppliersParent).toBeDefined();
    expect(suppliersParent?.moduleCode).toBe('procurement');
    expect(suppliersParent?.requiredPermissions).toEqual(['procurement.read']);
    expect(suppliersParent?.scope).toBe('client');
  });

  it('expose une entrée Equipes (dropdown) avec any(skills.read, teams.read, resources.read)', () => {
    const orgSection = navigation.find((section) => section.section === 'Organisation');
    expect(orgSection).toBeDefined();

    const teamsItem = orgSection?.items.find((item) => item.label === 'Equipes');
    expect(teamsItem).toBeDefined();
    expect(teamsItem?.href).toBeUndefined();
    expect(teamsItem?.moduleCode).toBeUndefined();
    expect(teamsItem?.requiredPermissions).toEqual(['skills.read', 'teams.read', 'resources.read']);
    expect(teamsItem?.requiredPermissionsMatch).toBe('any');
    expect(teamsItem?.scope).toBe('client');
  });
});
