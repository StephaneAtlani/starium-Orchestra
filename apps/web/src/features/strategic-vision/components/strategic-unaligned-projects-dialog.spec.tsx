import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StrategicUnalignedProjectsDialog } from '../components/strategic-unaligned-projects-dialog';
import type { StrategicObjectiveDto } from '../types/strategic-vision.types';

const mutateAsync = vi.fn();

vi.mock('../hooks/use-strategic-vision-queries', () => ({
  useAddStrategicObjectiveLinkMutation: () => ({
    mutateAsync,
    isPending: false,
  }),
}));

vi.mock('@/lib/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const objectives: StrategicObjectiveDto[] = [
  {
    id: 'obj-1',
    clientId: 'c1',
    axisId: 'axis-1',
    title: 'Objectif Cybersécurité',
    description: null,
    ownerLabel: 'DSI',
    directionId: null,
    direction: null,
    status: 'ON_TRACK',
    deadline: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    links: [],
  },
];

describe('StrategicUnalignedProjectsDialog — Aligner', () => {
  beforeEach(() => {
    mutateAsync.mockReset();
    mutateAsync.mockResolvedValue({});
  });

  it('Aligner + objectif envoie un payload PROJECT avec libellé métier', async () => {
    render(
      <StrategicUnalignedProjectsDialog
        open
        onOpenChange={() => {}}
        alerts={[
          {
            id: 'strategic-project-unaligned:proj-cuid-hidden',
            type: 'PROJECT_UNALIGNED',
            severity: 'MEDIUM',
            message: 'x',
            targetType: 'PROJECT',
            directionId: null,
            directionName: '—',
            targetLabel: 'Migration ERP',
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ]}
        isLoading={false}
        isError={false}
        expectedCount={1}
        objectives={objectives}
        canManageLinks
      />,
    );

    expect(screen.queryByText('proj-cuid-hidden')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Aligner' }));

    // Select objectif via combobox trigger then option
    const objectiveTrigger = screen.getByLabelText(/Choisir un objectif pour l'alignement/i);
    fireEvent.click(objectiveTrigger);
    fireEvent.click(await screen.findByRole('option', { name: 'Objectif Cybersécurité' }));

    fireEvent.click(screen.getByRole('button', { name: /Confirmer l'alignement/i }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        objectiveId: 'obj-1',
        body: {
          linkType: 'PROJECT',
          targetId: 'proj-cuid-hidden',
          targetLabelSnapshot: 'Migration ERP',
        },
      });
    });
  });
});
