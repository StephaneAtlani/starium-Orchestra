import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MicrosoftTeamsChannelTemplatesTable } from './microsoft-teams-channel-templates-table';
import type { ProjectMicrosoftTeamsChannelTemplateDto } from '../types/project-options.types';

const sampleTemplate = (
  overrides: Partial<ProjectMicrosoftTeamsChannelTemplateDto> = {},
): ProjectMicrosoftTeamsChannelTemplateDto => ({
  id: 'tpl-hidden-id',
  clientId: 'client-1',
  settingsId: 'settings-1',
  displayName: 'Pilotage',
  description: 'Canal de pilotage',
  sortOrder: 0,
  isPrimary: true,
  createdAt: '2026-07-17T08:00:00.000Z',
  updatedAt: '2026-07-17T08:00:00.000Z',
  ...overrides,
});

describe('MicrosoftTeamsChannelTemplatesTable', () => {
  const noop = vi.fn();

  it('affiche l’empty state avec exemples suggérés', () => {
    render(
      <MicrosoftTeamsChannelTemplatesTable
        templates={[]}
        canEdit={false}
        isReordering={false}
        onEdit={noop}
        onDelete={noop}
        onMoveUp={noop}
        onMoveDown={noop}
      />,
    );

    expect(screen.getByText(/Pilotage, Exécution, Documentation/i)).toBeTruthy();
  });

  it('affiche le libellé displayName et pas l’id seul', () => {
    render(
      <MicrosoftTeamsChannelTemplatesTable
        templates={[sampleTemplate()]}
        canEdit={false}
        isReordering={false}
        onEdit={noop}
        onDelete={noop}
        onMoveUp={noop}
        onMoveDown={noop}
      />,
    );

    expect(screen.getByText('Pilotage')).toBeTruthy();
    expect(screen.queryByText('tpl-hidden-id')).toBeNull();
  });

  it('masque Modifier, Monter, Descendre et Supprimer en lecture seule', () => {
    render(
      <MicrosoftTeamsChannelTemplatesTable
        templates={[sampleTemplate(), sampleTemplate({ id: 'tpl-2', displayName: 'Exécution', sortOrder: 1, isPrimary: false })]}
        canEdit={false}
        isReordering={false}
        onEdit={noop}
        onDelete={noop}
        onMoveUp={noop}
        onMoveDown={noop}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Modifier' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Monter' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Descendre' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Supprimer' })).toBeNull();
  });

  it('affiche les actions d’édition quand canEdit est true', () => {
    render(
      <MicrosoftTeamsChannelTemplatesTable
        templates={[sampleTemplate()]}
        canEdit
        isReordering={false}
        onEdit={noop}
        onDelete={noop}
        onMoveUp={noop}
        onMoveDown={noop}
      />,
    );

    expect(screen.getByRole('button', { name: 'Modifier' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Supprimer' })).toBeTruthy();
  });
});
