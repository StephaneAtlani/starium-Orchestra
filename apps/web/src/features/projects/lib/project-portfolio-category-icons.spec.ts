import { describe, expect, it } from 'vitest';
import { KeyRound, Monitor, Server, Shield } from 'lucide-react';
import {
  resolvePortfolioCategoryColor,
  resolvePortfolioCategoryLucideIcon,
} from './project-portfolio-category-icons';

describe('resolvePortfolioCategoryLucideIcon', () => {
  it('utilise la clé configurée en priorité', () => {
    const icon = resolvePortfolioCategoryLucideIcon({
      icon: 'shield',
      categoryName: 'Infrastructure & réseau',
      parentName: null,
      projectKind: 'PROJECT',
    });
    expect(icon).toBe(Shield);
  });

  it('déduit une icône depuis le libellé de catégorie', () => {
    expect(
      resolvePortfolioCategoryLucideIcon({
        icon: null,
        categoryName: 'Identité & accès',
        parentName: 'Transformation & métier',
        projectKind: 'PROJECT',
      }),
    ).toBe(KeyRound);

    expect(
      resolvePortfolioCategoryLucideIcon({
        icon: null,
        categoryName: 'Infrastructure & réseau',
        parentName: 'Opérations & plateforme',
        projectKind: 'PROJECT',
      }),
    ).toBe(Server);

    expect(
      resolvePortfolioCategoryLucideIcon({
        icon: null,
        categoryName: 'Expérience client & canaux',
        parentName: null,
        projectKind: 'PROJECT',
      }),
    ).toBe(Monitor);
  });

  it('déduit une couleur depuis le libellé si aucune couleur admin', () => {
    expect(
      resolvePortfolioCategoryColor({
        color: null,
        icon: null,
        categoryName: 'Cyber & résilience',
        parentName: null,
        projectKind: 'PROJECT',
      }),
    ).toBe('var(--destructive)');

    expect(
      resolvePortfolioCategoryColor({
        color: '#112233',
        icon: null,
        categoryName: 'Cyber & résilience',
        parentName: null,
        projectKind: 'PROJECT',
      }),
    ).toBe('#112233');
  });
});
