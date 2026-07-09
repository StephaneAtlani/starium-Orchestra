import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProjectAuditHistorySection } from './project-audit-history-section';

const useProjectAuditHistoryMock = vi.fn();

vi.mock('../hooks/use-project-audit-history', () => ({
  useProjectAuditHistory: (...args: unknown[]) => useProjectAuditHistoryMock(...args),
}));

describe('ProjectAuditHistorySection', () => {
  beforeEach(() => {
    useProjectAuditHistoryMock.mockReset();
  });

  it('affiche le loading', () => {
    useProjectAuditHistoryMock.mockReturnValue({
      isLoading: true,
      isError: false,
      data: undefined,
    });

    render(<ProjectAuditHistorySection projectId="proj-1" />);

    expect(screen.getByText(/Historique des modifications/i)).toBeTruthy();
  });

  it('affiche l’état vide', () => {
    useProjectAuditHistoryMock.mockReturnValue({
      isLoading: false,
      isError: false,
      data: { items: [], total: 0, limit: 20, offset: 0 },
    });

    render(<ProjectAuditHistorySection projectId="proj-1" />);

    expect(screen.getByText('Aucune modification')).toBeTruthy();
  });

  it('affiche l’erreur', () => {
    useProjectAuditHistoryMock.mockReturnValue({
      isLoading: false,
      isError: true,
      data: undefined,
    });

    render(<ProjectAuditHistorySection projectId="proj-1" />);

    expect(screen.getByText('Historique indisponible')).toBeTruthy();
  });

  it('affiche une action connue avec résumé métier et sans ID brut', () => {
    useProjectAuditHistoryMock.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        items: [
          {
            id: 'hist-1',
            action: 'project.parent.changed',
            createdAt: '2026-01-10T10:00:00.000Z',
            actorUserId: 'user-1',
            actorDisplayName: 'Alice Martin',
            summary: 'Projet parent modifié : PRJ-A — Alpha -> PRJ-B — Beta',
            oldValue: null,
            newValue: null,
          },
        ],
        total: 1,
        limit: 20,
        offset: 0,
      },
    });

    const { container } = render(<ProjectAuditHistorySection projectId="proj-1" />);

    expect(screen.getByText('Projet parent modifié')).toBeTruthy();
    expect(screen.getByText(/PRJ-A — Alpha/)).toBeTruthy();
    expect(screen.getByText(/Par Alice Martin/)).toBeTruthy();
    expect(container.textContent).not.toContain('hist-1');
    expect(container.textContent).not.toContain('user-1');
  });

  it('utilise le fallback sobre pour une action inconnue avec rendu simple', () => {
    useProjectAuditHistoryMock.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        items: [
          {
            id: 'hist-2',
            action: 'project.unknown',
            createdAt: '2026-01-10T10:00:00.000Z',
            actorUserId: null,
            actorDisplayName: null,
            summary: 'Modification enregistrée sur le projet',
            oldValue: null,
            newValue: null,
          },
        ],
        total: 1,
        limit: 20,
        offset: 0,
      },
    });

    const { container } = render(<ProjectAuditHistorySection projectId="proj-1" />);

    expect(screen.getByText('Modification du projet')).toBeTruthy();
    expect(screen.getByText('Modification enregistrée sur le projet')).toBeTruthy();
    expect(screen.getByText('Auteur inconnu')).toBeTruthy();
    expect(container.querySelector('ul')).toBeTruthy();
  });
});
