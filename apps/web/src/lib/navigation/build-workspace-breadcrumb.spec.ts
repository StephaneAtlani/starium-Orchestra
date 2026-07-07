import { describe, expect, it } from 'vitest';
import {
  buildWorkspaceBreadcrumb,
  resolveWorkspaceBreadcrumb,
} from './build-workspace-breadcrumb';

describe('buildWorkspaceBreadcrumb', () => {
  it('construit le fil dashboard', () => {
    expect(buildWorkspaceBreadcrumb('/dashboard')).toEqual([
      { label: 'Accueil', href: '/dashboard' },
      { label: 'Dashboard' },
    ]);
  });

  it('construit le fil liste projets', () => {
    expect(buildWorkspaceBreadcrumb('/projects')).toEqual([
      { label: 'Exécution', href: '/projects' },
      { label: 'Projets' },
    ]);
  });

  it('construit le fil détail projet avec placeholder (cuid Prisma)', () => {
    const id = 'cmna35frw015qit6gdndu7d57';
    expect(buildWorkspaceBreadcrumb(`/projects/${id}/sheet`)).toEqual([
      { label: 'Exécution', href: '/projects' },
      { label: 'Projets', href: '/projects' },
      { label: '…', href: `/projects/${id}` },
      { label: 'Fiche projet' },
    ]);
  });

  it('construit le fil détail projet avec placeholder', () => {
    const id = 'a1b2c3d4-e5f6-4789-a012-3456789abcde';
    expect(buildWorkspaceBreadcrumb(`/projects/${id}`)).toEqual([
      { label: 'Exécution', href: '/projects' },
      { label: 'Projets', href: '/projects' },
      { label: '…' },
    ]);
  });

  it('construit le fil sous-route projet', () => {
    const id = 'a1b2c3d4-e5f6-4789-a012-3456789abcde';
    expect(buildWorkspaceBreadcrumb(`/projects/${id}/tasks`)).toEqual([
      { label: 'Exécution', href: '/projects' },
      { label: 'Projets', href: '/projects' },
      { label: '…', href: `/projects/${id}` },
      { label: 'Tâches' },
    ]);
  });

  it('construit le fil budgets dashboard', () => {
    expect(buildWorkspaceBreadcrumb('/budgets/dashboard')).toEqual([
      { label: 'Contrôle', href: '/budgets' },
      { label: 'Budgets', href: '/budgets' },
      { label: 'Dashboard' },
    ]);
  });
});

describe('resolveWorkspaceBreadcrumb', () => {
  it('remplace le placeholder par le libellé entité (cuid)', () => {
    const id = 'cmna35frw015qit6gdndu7d57';
    expect(
      resolveWorkspaceBreadcrumb(`/projects/${id}/sheet`, {
        entityLabel: 'Refonte Portail Client',
        entityHref: `/projects/${id}`,
      }),
    ).toEqual([
      { label: 'Exécution', href: '/projects' },
      { label: 'Projets', href: '/projects' },
      { label: 'Refonte Portail Client', href: `/projects/${id}` },
      { label: 'Fiche projet' },
    ]);
  });

  it('remplace le placeholder par le libellé entité', () => {
    const id = 'a1b2c3d4-e5f6-4789-a012-3456789abcde';
    expect(
      resolveWorkspaceBreadcrumb(`/projects/${id}`, {
        entityLabel: 'Refonte Portail Client',
        entityHref: `/projects/${id}`,
      }),
    ).toEqual([
      { label: 'Exécution', href: '/projects' },
      { label: 'Projets', href: '/projects' },
      { label: 'Refonte Portail Client', href: `/projects/${id}` },
    ]);
  });
});
