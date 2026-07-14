import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectTagsFilter } from './project-tags-filter';

const listProjectTags = vi.fn();

vi.mock('@/hooks/use-authenticated-fetch', () => ({
  useAuthenticatedFetch: () => vi.fn(),
}));

vi.mock('@/hooks/use-active-client', () => ({
  useActiveClient: () => ({ activeClient: { id: 'client-1' } }),
}));

vi.mock('../api/projects.api', () => ({
  listProjectTags: (...args: unknown[]) => listProjectTags(...args),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({
    data: [
      { id: 'tag-a', name: 'Priorité', color: '#c4a35a' },
      { id: 'tag-b', name: 'Infra', color: '#4a6fa5' },
    ],
    isLoading: false,
  }),
}));

describe('ProjectTagsFilter', () => {
  beforeEach(() => {
    listProjectTags.mockReset();
  });

  it('ouvre un panneau multi-sélection et notifie les changements', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<ProjectTagsFilter value={[]} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: /Filtrer par étiquettes/i }));

    expect(screen.getByRole('listbox', { name: /Étiquettes du portefeuille/i })).toBeTruthy();

    await user.click(screen.getByRole('checkbox', { name: 'Priorité' }));
    expect(onChange).toHaveBeenCalledWith(['tag-a']);
  });

  it('affiche le mode OU / ET à partir de 2 étiquettes', () => {
    render(
      <ProjectTagsFilter
        value={['tag-a', 'tag-b']}
        onChange={vi.fn()}
        matchMode="any"
        onMatchModeChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('group', { name: /Mode de combinaison des étiquettes/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'OU' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'ET' })).toBeTruthy();
  });

  it('ferme le panneau inline au clic extérieur', async () => {
    const user = userEvent.setup();

    render(
      <div>
        <ProjectTagsFilter value={[]} onChange={vi.fn()} panelLayout="inline" />
        <button type="button">Hors filtre</button>
      </div>,
    );

    await user.click(screen.getByRole('button', { name: /Filtrer par étiquettes/i }));
    expect(screen.getByRole('listbox', { name: /Étiquettes du portefeuille/i })).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Hors filtre' }));
    expect(screen.queryByRole('listbox', { name: /Étiquettes du portefeuille/i })).toBeNull();
  });
});
