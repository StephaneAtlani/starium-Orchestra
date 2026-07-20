import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MicrosoftTeamsCard } from './microsoft-teams-card';

describe('MicrosoftTeamsCard', () => {
  const baseProps = {
    teamName: null as string | null,
    channelName: null as string | null,
    canEdit: true,
    provisioningFeatureEnabled: true,
    connectionActive: true,
    configureDisabled: false,
    dissociateDisabled: true,
    provisionDisabled: false,
    onConfigure: vi.fn(),
    onDissociate: vi.fn(),
    onProvision: vi.fn(),
  };

  it('affiche créer et rattacher sans équipe', () => {
    render(<MicrosoftTeamsCard {...baseProps} />);
    expect(screen.getByRole('button', { name: 'Créer l’équipe Teams' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Rattacher une équipe existante' }),
    ).toBeInTheDocument();
  });

  it('badge in-progress', () => {
    render(
      <MicrosoftTeamsCard
        {...baseProps}
        provisioningInProgress
        provisioning={{ ...minimalProvisioning(), status: 'IN_PROGRESS' }}
      />,
    );
    expect(screen.getByText('Provisioning en cours')).toBeInTheDocument();
  });

  it('lien Teams uniquement si COMPLETED et URL', () => {
    render(
      <MicrosoftTeamsCard
        {...baseProps}
        teamName="Mon équipe"
        provisioning={{
          ...minimalProvisioning(),
          status: 'COMPLETED',
          teamWebUrl: 'https://teams.microsoft.com/l/team/abc',
        }}
      />,
    );
    expect(screen.getByRole('link', { name: /Ouvrir dans Teams/i })).toHaveAttribute(
      'href',
      'https://teams.microsoft.com/l/team/abc',
    );
  });

  it('pas de lien Teams si PARTIAL', () => {
    render(
      <MicrosoftTeamsCard
        {...baseProps}
        provisioning={{
          ...minimalProvisioning(),
          status: 'PARTIAL',
          teamWebUrl: 'https://teams.microsoft.com/l/team/abc',
        }}
      />,
    );
    expect(screen.queryByRole('link', { name: /Ouvrir dans Teams/i })).not.toBeInTheDocument();
  });
});

function minimalProvisioning() {
  return {
    id: 'p1',
    clientId: 'c1',
    projectId: 'proj-1',
    status: 'PENDING' as const,
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
    errorCode: null,
    errorMessage: null,
    resolvedAt: null,
    resolutionType: null,
    createdAt: '',
    updatedAt: '',
  };
}
