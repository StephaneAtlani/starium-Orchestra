import { describe, expect, it } from 'vitest';
import {
  canConfigureExistingTeam,
  canStartNewProvisioning,
  isConfirmedNotCreated,
  isRetryableError,
  isUnknownUnresolved,
} from './microsoft-teams-provisioning.constants';
import type { ProjectMicrosoftTeamsProvisioningDto } from '../types/project-options.types';

const baseDeps = {
  link: null,
  settingsEnabled: true,
  connectionActive: true,
};

function run(partial: Partial<ProjectMicrosoftTeamsProvisioningDto>): ProjectMicrosoftTeamsProvisioningDto {
  return {
    id: 'prov-1',
    clientId: 'c1',
    projectId: 'p1',
    status: 'FAILED',
    teamDisplayName: 'Team',
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
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...partial,
  };
}

describe('microsoft-teams-provisioning.constants', () => {
  it('isRetryableError allowlist', () => {
    expect(isRetryableError('RECOVERY_REQUIRED')).toBe(true);
    expect(isRetryableError('TEAM_CREATION_OUTCOME_UNKNOWN')).toBe(false);
  });

  it('isUnknownUnresolved', () => {
    expect(
      isUnknownUnresolved(
        run({
          status: 'FAILED',
          errorCode: 'TEAM_CREATION_OUTCOME_UNKNOWN',
          resolvedAt: null,
        }),
      ),
    ).toBe(true);
    expect(isUnknownUnresolved(run({ status: 'FAILED', resolvedAt: '2026-01-01' }))).toBe(false);
  });

  it('isConfirmedNotCreated', () => {
    expect(
      isConfirmedNotCreated(
        run({ errorCode: 'TEAM_CREATION_CONFIRMED_NOT_CREATED' }),
      ),
    ).toBe(true);
  });

  it('canStartNewProvisioning bloque run actif et UNKNOWN', () => {
    expect(canStartNewProvisioning(run({ status: 'IN_PROGRESS' }), baseDeps)).toBe(false);
    expect(
      canStartNewProvisioning(
        run({
          status: 'FAILED',
          errorCode: 'TEAM_CREATION_OUTCOME_UNKNOWN',
          resolvedAt: null,
        }),
        baseDeps,
      ),
    ).toBe(false);
    expect(
      canStartNewProvisioning(
        run({
          status: 'FAILED',
          errorCode: 'TEAM_CREATION_CONFIRMED_NOT_CREATED',
        }),
        baseDeps,
      ),
    ).toBe(true);
  });

  it('canConfigureExistingTeam PARTIAL sans requestedTeamId autorise ouverture', () => {
    const partial = run({
      status: 'PARTIAL',
      microsoftTeamId: 'team-locked',
    });
    expect(canConfigureExistingTeam(partial, baseDeps)).toBe(true);
  });

  it('canConfigureExistingTeam PARTIAL refuse autre équipe après sélection', () => {
    const partial = run({
      status: 'PARTIAL',
      microsoftTeamId: 'team-locked',
    });
    expect(
      canConfigureExistingTeam(partial, {
        ...baseDeps,
        requestedTeamId: 'other-team',
      }),
    ).toBe(false);
    expect(
      canConfigureExistingTeam(partial, {
        ...baseDeps,
        requestedTeamId: 'team-locked',
      }),
    ).toBe(true);
  });

  it('canConfigureExistingTeam bloque PENDING', () => {
    expect(canConfigureExistingTeam(run({ status: 'PENDING' }), baseDeps)).toBe(false);
  });
});
