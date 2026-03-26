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
    const financeSection = navigation.find((section) => section.section === 'Finance');
    expect(financeSection).toBeDefined();

    const suppliersItem = financeSection?.items.find((item) => item.href === '/suppliers');
    expect(suppliersItem).toBeDefined();
    expect(suppliersItem?.requiredPermissions).toEqual(['procurement.read']);
    expect(suppliersItem?.scope).toBe('client');
  });
});
