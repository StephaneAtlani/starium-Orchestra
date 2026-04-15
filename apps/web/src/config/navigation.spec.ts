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

  it('expose une entrée fournisseurs côté client avec procurement.read (sans contrats)', () => {
    const pilotagesSection = navigation.find((section) => section.section === 'Pilotages');
    expect(pilotagesSection).toBeDefined();

    const suppliersParent = pilotagesSection?.items.find((item) => item.label === 'Fournisseurs');
    expect(suppliersParent).toBeDefined();
    expect(suppliersParent?.moduleCode).toBe('procurement');
    expect(suppliersParent?.requiredPermissions).toEqual(['procurement.read']);
    expect(suppliersParent?.scope).toBe('client');

    const childHrefs = (suppliersParent?.children ?? []).map((c) => c.href);
    expect(childHrefs).toContain('/suppliers/purchase-orders');
    expect(childHrefs).toContain('/suppliers/invoices');
    expect(childHrefs).not.toContain('/contracts');
  });

  it('expose Contrats au niveau Pilotages (menu principal) avec registre et types', () => {
    const pilotagesSection = navigation.find((section) => section.section === 'Pilotages');
    expect(pilotagesSection).toBeDefined();

    const contractsParent = pilotagesSection?.items.find((item) => item.label === 'Contrats');
    expect(contractsParent).toBeDefined();
    expect(contractsParent?.moduleCode).toBe('contracts');
    expect(contractsParent?.requiredPermissions).toEqual(['contracts.read']);
    expect(contractsParent?.href).toBeUndefined();
    expect(contractsParent?.children?.map((c) => c.href)).toEqual(
      expect.arrayContaining(['/contracts', '/contracts/kind-types']),
    );
    const contractsRegistre = contractsParent?.children?.find((c) => c.href === '/contracts');
    expect(contractsRegistre?.requiredPermissions).toEqual(['contracts.read']);
    expect(contractsRegistre?.moduleCode).toBe('contracts');
    const contractsKindTypes = contractsParent?.children?.find((c) => c.href === '/contracts/kind-types');
    expect(contractsKindTypes?.requiredPermissions).toEqual(['contracts.kind_types.manage']);
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
