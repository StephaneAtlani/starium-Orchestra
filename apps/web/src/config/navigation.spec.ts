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
    const moyensSection = navigation.find((section) => section.section === 'MOYENS');
    expect(moyensSection).toBeDefined();

    const suppliersParent = moyensSection?.items.find((item) => item.label === 'Fournisseurs');
    expect(suppliersParent).toBeDefined();
    expect(suppliersParent?.moduleCode).toBe('procurement');
    expect(suppliersParent?.requiredPermissions).toEqual(['procurement.read']);
    expect(suppliersParent?.scope).toBe('client');

    const childHrefs = (suppliersParent?.children ?? []).map((c) => c.href);
    expect(childHrefs).toContain('/suppliers/purchase-orders');
    expect(childHrefs).toContain('/suppliers/invoices');
    expect(childHrefs).not.toContain('/contracts');
  });

  it('expose Contrats au niveau Pilotage financier (menu principal) avec registre et types', () => {
    const moyensSection = navigation.find((section) => section.section === 'MOYENS');
    expect(moyensSection).toBeDefined();

    const contractsParent = moyensSection?.items.find((item) => item.label === 'Contrats');
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

  it('expose une entrée Équipes (dropdown) avec any(skills.read, teams.read, resources.read)', () => {
    const moyensSection = navigation.find((section) => section.section === 'MOYENS');
    expect(moyensSection).toBeDefined();

    const teamsItem = moyensSection?.items.find((item) => item.label === 'Équipes');
    expect(teamsItem).toBeDefined();
    expect(teamsItem?.href).toBeUndefined();
    expect(teamsItem?.moduleCode).toBeUndefined();
    expect(teamsItem?.requiredPermissions).toEqual(['skills.read', 'teams.read', 'resources.read']);
    expect(teamsItem?.requiredPermissionsMatch).toBe('any');
    expect(teamsItem?.scope).toBe('client');
  });

  it('expose Vision stratégique en menu parent (Vision stratégique, Stratégie)', () => {
    const orientationSection = navigation.find((section) => section.section === 'ORIENTATION');
    expect(orientationSection).toBeDefined();

    const strategicVisionParent = orientationSection?.items.find((item) => item.label === 'Vision stratégique');
    expect(strategicVisionParent).toBeDefined();
    expect(strategicVisionParent?.href).toBeUndefined();
    expect(strategicVisionParent?.requiredPermissionsMatch).toBe('any');
    expect(strategicVisionParent?.requiredPermissions).toEqual(
      expect.arrayContaining(['strategic_vision.read', 'strategic_direction_strategy.read']),
    );
    expect(strategicVisionParent?.scope).toBe('client');

    const childHrefs = (strategicVisionParent?.children ?? []).map((c) => c.href);
    expect(childHrefs).toContain('/strategic-vision');
    expect(childHrefs).toContain('/strategic-direction-strategy');
    expect(childHrefs).toContain('/strategic-direction-strategy/options');

    const enterprise = strategicVisionParent?.children?.find(
      (c) => c.href === '/strategic-vision',
    );
    expect(enterprise?.requiredPermissions).toEqual(['strategic_vision.read']);

    const strategy = strategicVisionParent?.children?.find(
      (c) => c.href === '/strategic-direction-strategy',
    );
    expect(strategy?.requiredPermissions).toEqual(['strategic_direction_strategy.read']);

    expect(orientationSection?.items.some((item) => item.href === '/strategic-direction-strategy')).toBe(
      false,
    );
  });

  it('expose Cycles de pilotage avec governance_cycles.read et moduleCode', () => {
    const controleSection = navigation.find((section) => section.section === 'CONTRÔLE');
    expect(controleSection).toBeDefined();

    const cyclesItem = controleSection?.items.find((item) => item.href === '/cycles');
    expect(cyclesItem).toBeDefined();
    expect(cyclesItem?.label).toBe('Cycles de pilotage');
    expect(cyclesItem?.moduleCode).toBe('governance_cycles');
    expect(cyclesItem?.requiredPermissions).toEqual(['governance_cycles.read']);
    expect(cyclesItem?.scope).toBe('client');
  });

  it("réserve Modèle d'accès aux administrateurs plateforme", () => {
    const adminSection = navigation.find((section) => section.section === 'ADMINISTRATION');
    const accessModelItem = adminSection?.items.find(
      (item) => item.href === '/client/administration/access-model',
    );
    expect(accessModelItem?.platformOnly).toBe(true);
    expect(accessModelItem?.clientAdminOnly).toBeUndefined();
    expect(accessModelItem?.requiredPermissions).toBeUndefined();
  });
});
