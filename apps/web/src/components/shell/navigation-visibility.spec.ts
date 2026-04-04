import { describe, expect, it } from 'vitest';
import { navigationItemVisible } from './navigation-visibility';
import type { NavigationItem } from '@/config/navigation';

function hasFactory(codes: string[]) {
  return (code: string) => codes.includes(code);
}

describe('navigationItemVisible', () => {
  const baseCtx = {
    platformRole: null as string | null,
    clientRole: 'CLIENT_USER' as string | null,
    permsSuccess: true,
  };

  it('requiredPermissionsMatch all: exige toutes les permissions (défaut)', () => {
    const item: NavigationItem = {
      label: 'Test',
      href: '/x',
      scope: 'client',
      requiredPermissions: ['a.read', 'b.read'],
    };
    expect(
      navigationItemVisible(item, {
        ...baseCtx,
        has: hasFactory(['a.read']),
      }),
    ).toBe(false);
    expect(
      navigationItemVisible(item, {
        ...baseCtx,
        has: hasFactory(['a.read', 'b.read']),
      }),
    ).toBe(true);
  });

  it('requiredPermissionsMatch any: parent Équipes — visible si une des permissions', () => {
    const equipes: NavigationItem = {
      label: 'Equipes',
      scope: 'client',
      requiredPermissions: ['skills.read', 'teams.read', 'resources.read'],
      requiredPermissionsMatch: 'any',
      allowedClientRoles: ['CLIENT_ADMIN', 'CLIENT_USER'],
    };
    expect(
      navigationItemVisible(equipes, {
        ...baseCtx,
        has: hasFactory(['skills.read']),
      }),
    ).toBe(true);
    expect(
      navigationItemVisible(equipes, {
        ...baseCtx,
        has: hasFactory(['collaborators.read']),
      }),
    ).toBe(false);
    expect(
      navigationItemVisible(equipes, {
        ...baseCtx,
        has: hasFactory(['teams.read']),
      }),
    ).toBe(true);
    expect(
      navigationItemVisible(equipes, {
        ...baseCtx,
        has: hasFactory(['resources.read']),
      }),
    ).toBe(true);
    expect(
      navigationItemVisible(equipes, {
        ...baseCtx,
        has: hasFactory([]),
      }),
    ).toBe(false);
  });

  it('non-régression: entrée avec moduleCode budgets inchangée (all + module read)', () => {
    const budgets: NavigationItem = {
      label: 'Budgets',
      href: '/budgets',
      scope: 'client',
      moduleCode: 'budgets',
      requiredPermissions: ['budgets.read'],
    };
    expect(
      navigationItemVisible(budgets, {
        ...baseCtx,
        has: hasFactory(['budgets.read']),
      }),
    ).toBe(true);
    expect(
      navigationItemVisible(budgets, {
        ...baseCtx,
        has: hasFactory(['projects.read']),
      }),
    ).toBe(false);
  });

  it('non-régression: Projets avec projects.read', () => {
    const projets: NavigationItem = {
      label: 'Projets',
      href: '/projects',
      scope: 'client',
      moduleCode: 'projects',
      requiredPermissions: ['projects.read'],
    };
    expect(
      navigationItemVisible(projets, {
        ...baseCtx,
        has: hasFactory(['projects.read']),
      }),
    ).toBe(true);
  });
});
