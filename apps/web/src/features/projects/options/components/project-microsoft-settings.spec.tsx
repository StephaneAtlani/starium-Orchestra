import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectMicrosoftSettings } from './project-microsoft-settings';

const resolveProjectMicrosoftTeamsProvisioning = vi.fn();
const updateProjectMicrosoftLink = vi.fn();

vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({ has: () => true }),
}));

vi.mock('@/hooks/use-authenticated-fetch', () => ({
  useAuthenticatedFetch: () => vi.fn(),
}));

vi.mock('@/hooks/use-active-client', () => ({
  useActiveClient: () => ({ activeClient: { id: 'client-1' } }),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/projects/proj-1/options',
}));

vi.mock('@/lib/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const unknownRun = {
  id: 'run-unknown',
  clientId: 'client-1',
  projectId: 'proj-1',
  status: 'FAILED' as const,
  teamDisplayName: 'PRJ',
  teamDescription: null,
  microsoftTeamId: null,
  teamWebUrl: null,
  graphOperationUrl: null,
  graphContentLocation: null,
  graphCreateRequestedAt: null,
  retryCount: 0,
  retryRequestedAt: null,
  currentJobId: null,
  lastHeartbeatAt: null,
  errorCode: 'TEAM_CREATION_OUTCOME_UNKNOWN',
  errorMessage: 'Inconnu',
  resolvedAt: null,
  resolutionType: null,
  createdAt: '',
  updatedAt: '',
};

const partialRun = {
  ...unknownRun,
  id: 'run-partial',
  status: 'PARTIAL' as const,
  microsoftTeamId: 'team-locked-1',
  errorCode: 'PROVISIONED_TEAM_PENDING_RECOVERY',
};

let provisioningData: typeof unknownRun | typeof partialRun = unknownRun;

vi.mock('../hooks/use-project-microsoft-link-query', () => ({
  useProjectMicrosoftLinkQuery: () => ({
    data: null,
    isLoading: false,
    isError: false,
  }),
}));

vi.mock('../hooks/use-project-microsoft-teams-provisioning-query', () => ({
  useProjectMicrosoftTeamsProvisioningQuery: () => ({
    get data() {
      return provisioningData;
    },
    isLoading: false,
    isError: false,
  }),
}));

vi.mock('../hooks/use-project-microsoft-link-mutations', () => ({
  useUpdateProjectMicrosoftLinkMutation: () => ({
    mutate: updateProjectMicrosoftLink,
    isPending: false,
  }),
  useStartProjectMicrosoftTeamsProvisioningMutation: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useRetryProjectMicrosoftTeamsProvisioningMutation: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useResolveProjectMicrosoftTeamsProvisioningMutation: () => ({
    mutate: resolveProjectMicrosoftTeamsProvisioning,
    isPending: false,
  }),
}));

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-query')>(
    '@tanstack/react-query',
  );
  return {
    ...actual,
    useQueryClient: () => ({ invalidateQueries: vi.fn() }),
    useQuery: ({ queryKey }: { queryKey: unknown[] }) => {
      const key = JSON.stringify(queryKey);
      if (key.includes('microsoft-connection')) {
        return {
          data: { connection: { status: 'ACTIVE' } },
          isLoading: false,
          isError: false,
          refetch: vi.fn(),
        };
      }
      if (key.includes('microsoft-teams-provisioning-settings')) {
        return {
          data: { isEnabled: true, offerOnProjectCreate: true, teamNameTemplate: '{{code}}' },
          isLoading: false,
          isError: false,
        };
      }
      return { data: null, isLoading: false, isError: false };
    },
  };
});

vi.mock('@/features/microsoft-365/components/microsoft-team-picker', () => ({
  MicrosoftTeamPicker: ({ onValueChange }: { onValueChange: (id: string) => void }) => (
    <button type="button" onClick={() => onValueChange('team-selected-1')}>
      Choisir équipe test
    </button>
  ),
}));

vi.mock('./microsoft-connection-status-card', () => ({
  MicrosoftConnectionStatusCard: () => <div data-testid="connection-card" />,
}));

vi.mock('./microsoft-planner-card', () => ({
  MicrosoftPlannerCard: () => null,
}));

vi.mock('./microsoft-documents-card', () => ({
  MicrosoftDocumentsCard: () => null,
}));

vi.mock('./microsoft-link-configure-dialog', () => ({
  MicrosoftLinkConfigureDialog: ({
    lockedTeamId,
  }: {
    lockedTeamId?: string | null;
  }) => (
    <div data-testid="configure-dialog" data-locked-team-id={lockedTeamId ?? ''} />
  ),
}));

describe('ProjectMicrosoftSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    provisioningData = unknownRun;
  });

  it('UNKNOWN sans microsoftTeamId : resolve TEAM_FOUND sans upsert INT-007', async () => {
    const user = userEvent.setup();
    render(<ProjectMicrosoftSettings projectId="proj-1" />);

    await user.click(screen.getByRole('button', { name: /Team retrouvée : la rattacher/i }));
    await user.click(screen.getByRole('button', { name: 'Choisir équipe test' }));
    await user.click(screen.getByRole('button', { name: /Confirmer cette équipe/i }));

    await waitFor(() => {
      expect(resolveProjectMicrosoftTeamsProvisioning).toHaveBeenCalled();
    });
    expect(updateProjectMicrosoftLink).not.toHaveBeenCalled();
    expect(resolveProjectMicrosoftTeamsProvisioning.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        body: { resolutionType: 'TEAM_FOUND', teamId: 'team-selected-1' },
      }),
    );
  });

  it('CONFIRMED_NOT_CREATED envoie confirmation true', async () => {
    const user = userEvent.setup();
    render(<ProjectMicrosoftSettings projectId="proj-1" />);

    await user.click(
      screen.getByRole('button', { name: /Confirmer qu’aucune Team n’a été créée/i }),
    );
    await user.click(screen.getByRole('button', { name: /Confirmer l’absence de Team/i }));

    await waitFor(() => {
      expect(resolveProjectMicrosoftTeamsProvisioning).toHaveBeenCalledWith(
        expect.objectContaining({
          body: { resolutionType: 'CONFIRMED_NOT_CREATED', confirmation: true },
        }),
        expect.anything(),
      );
    });
  });

  it('PARTIAL transmet lockedTeamId au dialogue configure', () => {
    provisioningData = partialRun;
    render(<ProjectMicrosoftSettings projectId="proj-1" />);
    expect(screen.getByTestId('configure-dialog')).toHaveAttribute(
      'data-locked-team-id',
      'team-locked-1',
    );
  });
});
