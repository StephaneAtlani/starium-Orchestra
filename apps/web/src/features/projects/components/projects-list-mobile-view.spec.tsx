import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProjectsListProjectCard } from './projects-list-project-card';
import { mergeUiBadgeConfig } from '@/lib/ui/badge-registry';
import type { ProjectListItem } from '../types/project.types';

const item: ProjectListItem = {
  id: 'p1',
  code: 'PRJ-01',
  name: 'Projet Alpha',
  kind: 'PROJECT',
  type: 'IT',
  status: 'IN_PROGRESS',
  myRole: 'Chef de projet',
  priority: 'MEDIUM',
  criticality: 'MEDIUM',
  progressPercent: 40,
  derivedProgressPercent: 35,
  computedHealth: 'GREEN',
  targetEndDate: '2026-12-31',
  ownerUserId: 'u1',
  ownerDisplayName: 'Alice Martin',
  openTasksCount: 2,
  openRisksCount: 0,
  delayedMilestonesCount: 1,
  signals: {
    isLate: false,
    isBlocked: false,
    hasNoOwner: false,
    hasNoTasks: false,
    hasNoRisks: true,
    hasNoMilestones: false,
    hasPlanningDrift: false,
    isCritical: false,
  },
  warnings: [],
  tags: [],
  portfolioCategory: null,
  targetBudgetAmount: '120000',
  consumedBudgetAmount: '45000',
};

describe('ProjectsListProjectCard', () => {
  it('rend li > article avec libellé métier', () => {
    const { container } = render(
      <ul>
        <ProjectsListProjectCard
          project={item}
          badgeMerged={mergeUiBadgeConfig(null, null)}
        />
      </ul>,
    );

    const li = container.querySelector('li');
    expect(li?.querySelector('article')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Projet Alpha' })).toBeTruthy();
    expect(screen.getByLabelText('Actions pour Projet Alpha')).toBeTruthy();
    expect(screen.getByText('Projet')).toBeTruthy();
    expect(screen.getByText('En cours')).toBeTruthy();
    expect(screen.getByText('Budget')).toBeTruthy();
    expect(screen.getByText('Consommé')).toBeTruthy();
    expect(container.textContent).toMatch(/120\s*000/);
    expect(container.textContent).toMatch(/45\s*000/);
    expect(container.textContent).not.toContain('p1');
  });
});
