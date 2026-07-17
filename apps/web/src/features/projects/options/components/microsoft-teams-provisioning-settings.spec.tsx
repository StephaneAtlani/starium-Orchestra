import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MicrosoftTeamsProvisioningSettings } from './microsoft-teams-provisioning-settings';

const updateMicrosoftTeamsProvisioningSettings = vi.fn();
const getMicrosoftTeamsProvisioningSettings = vi.fn();
const listMicrosoftTeamsChannelTemplates = vi.fn();

let canEdit = true;

const settingsData = {
  teamNameTemplate: '{{code}} - {{name}}',
  teamDescriptionTemplate: '',
  isEnabled: true,
  offerOnProjectCreate: true,
};

const channelTemplatesData = { items: [] as unknown[] };
const connectionData = { connection: { status: 'INACTIVE' } };

vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({ has: (perm: string) => perm === 'projects.update' && canEdit }),
}));

vi.mock('@/hooks/use-authenticated-fetch', () => ({
  useAuthenticatedFetch: () => vi.fn(),
}));

vi.mock('@/hooks/use-active-client', () => ({
  useActiveClient: () => ({ activeClient: { id: 'client-1' } }),
}));

vi.mock('@/lib/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('../api/microsoft-teams-provisioning-settings.api', () => ({
  getMicrosoftTeamsProvisioningSettings: (...args: unknown[]) =>
    getMicrosoftTeamsProvisioningSettings(...args),
  listMicrosoftTeamsChannelTemplates: (...args: unknown[]) =>
    listMicrosoftTeamsChannelTemplates(...args),
  updateMicrosoftTeamsProvisioningSettings: (...args: unknown[]) =>
    updateMicrosoftTeamsProvisioningSettings(...args),
  createMicrosoftTeamsChannelTemplate: vi.fn(),
  updateMicrosoftTeamsChannelTemplate: vi.fn(),
  deleteMicrosoftTeamsChannelTemplate: vi.fn(),
  reorderMicrosoftTeamsChannelTemplates: vi.fn(),
}));

vi.mock('./microsoft-teams-channel-templates-table', () => ({
  MicrosoftTeamsChannelTemplatesTable: () => <div data-testid="templates-table" />,
}));

vi.mock('./microsoft-teams-channel-template-form-dialog', () => ({
  EMPTY_TEAMS_CHANNEL_TEMPLATE_FORM: { displayName: '', description: '', isPrimary: false },
  MicrosoftTeamsChannelTemplateFormDialog: () => null,
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
      if (key.includes('microsoft-teams-provisioning-settings')) {
        return {
          data: settingsData,
          isLoading: false,
          isError: false,
        };
      }
      if (key.includes('microsoft-teams-channel-templates')) {
        return { data: channelTemplatesData, isLoading: false, isError: false };
      }
      if (key.includes('microsoft-connection')) {
        return {
          data: connectionData,
          isLoading: false,
          isError: false,
        };
      }
      return { data: undefined, isLoading: false, isError: false };
    },
    useMutation: (options: { mutationFn: (...args: unknown[]) => unknown }) => ({
      mutate: () => {
        void options.mutationFn();
      },
      isPending: false,
    }),
  };
});

describe('MicrosoftTeamsProvisioningSettings', () => {
  beforeEach(() => {
    canEdit = true;
    settingsData.isEnabled = true;
    settingsData.offerOnProjectCreate = true;
    updateMicrosoftTeamsProvisioningSettings.mockReset();
    updateMicrosoftTeamsProvisioningSettings.mockResolvedValue({
      teamNameTemplate: '{{code}} - {{name}}',
      teamDescriptionTemplate: '',
      isEnabled: false,
      offerOnProjectCreate: false,
    });
    getMicrosoftTeamsProvisioningSettings.mockResolvedValue({});
    listMicrosoftTeamsChannelTemplates.mockResolvedValue({ items: [] });
  });

  it('masque le bouton Ajouter en lecture seule', () => {
    canEdit = false;
    render(<MicrosoftTeamsProvisioningSettings />);

    expect(screen.queryByRole('button', { name: 'Ajouter' })).toBeNull();
  });

  it('affiche le bouton Ajouter quand canEdit est true', () => {
    render(<MicrosoftTeamsProvisioningSettings />);

    expect(screen.getByRole('button', { name: 'Ajouter' })).toBeTruthy();
  });

  it('force offerOnProjectCreate à false quand isEnabled passe à false', async () => {
    const user = userEvent.setup();
    render(<MicrosoftTeamsProvisioningSettings />);

    const offerCheckbox = screen.getByRole('checkbox', {
      name: /Proposer à la création projet/i,
    }) as HTMLInputElement;
    expect(offerCheckbox.checked).toBe(true);

    const enabledCheckbox = screen.getByRole('checkbox', {
      name: /Activer le provisioning Teams/i,
    });
    await user.click(enabledCheckbox);

    expect(offerCheckbox.checked).toBe(false);
    expect(offerCheckbox).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Enregistrer les paramètres' }));

    expect(updateMicrosoftTeamsProvisioningSettings).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        isEnabled: false,
        offerOnProjectCreate: false,
      }),
    );
  });

  it('affiche le lien vers l’administration Microsoft 365 si connexion inactive', () => {
    render(<MicrosoftTeamsProvisioningSettings />);

    expect(screen.getByRole('link', { name: 'Microsoft 365' })).toHaveAttribute(
      'href',
      '/client/administration/microsoft-365',
    );
  });
});
