import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { parseProjectOptionsTab, ProjectOptionsTabs } from './project-options-tabs';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('tab=microsoft'),
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => '/projects/proj-1/options',
}));

vi.mock('./project-planning-buckets-settings', () => ({
  ProjectPlanningBucketsSettings: () => <div>Planning</div>,
}));
vi.mock('./project-governance-circles-settings', () => ({
  ProjectGovernanceCirclesSettings: () => <div>Team</div>,
}));
vi.mock('./project-microsoft-settings', () => ({
  ProjectMicrosoftSettings: () => <div>Microsoft settings</div>,
}));
vi.mock('./project-sync-settings', () => ({
  ProjectSyncSettings: () => <div>Sync</div>,
}));
vi.mock('./project-danger-zone-settings', () => ({
  ProjectDangerZoneSettings: () => null,
}));

describe('ProjectOptionsTabs', () => {
  it('parseProjectOptionsTab fallback planning', () => {
    expect(parseProjectOptionsTab(null)).toBe('planning');
    expect(parseProjectOptionsTab('unknown')).toBe('planning');
    expect(parseProjectOptionsTab('microsoft')).toBe('microsoft');
  });

  it('ouvre onglet Microsoft depuis search param', () => {
    render(
      <ProjectOptionsTabs projectId="proj-1" projectName="P" projectCode="PRJ" />,
    );
    expect(screen.getByText('Microsoft settings')).toBeVisible();
  });
});
