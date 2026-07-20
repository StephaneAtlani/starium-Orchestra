import type {
  ProjectMicrosoftLinkDto,
  ProjectMicrosoftTeamsProvisioningDto,
} from '../types/project-options.types';

export const ERROR_CODE_TEAM_CREATION_OUTCOME_UNKNOWN = 'TEAM_CREATION_OUTCOME_UNKNOWN';
export const ERROR_CODE_TEAM_CREATION_CONFIRMED_NOT_CREATED =
  'TEAM_CREATION_CONFIRMED_NOT_CREATED';

export const RETRYABLE_PROVISIONING_ERROR_CODES = new Set<string>([
  'GRAPH_TRANSIENT_RETRIES_EXHAUSTED',
  'RECOVERY_REQUIRED',
  'QUEUE_RETRY_NOT_DISPATCHED',
  'QUEUE_JOB_MISSING',
  'QUEUE_JOB_COMPLETED_WITHOUT_RUN_UPDATE',
  'QUEUE_JOB_FAILED_ORPHAN',
  'QUEUE_JOB_STATE_UNKNOWN',
  'QUEUE_RETRY_FAILED',
  'QUEUE_UNAVAILABLE',
  'MICROSOFT_GRAPH_REAUTH_REQUIRED',
  'MICROSOFT_TEAM_CREATE_FORBIDDEN',
  'PROVISIONED_TEAM_PENDING_RECOVERY',
]);

export type ProvisioningGatingDeps = {
  link: ProjectMicrosoftLinkDto | null;
  settingsEnabled: boolean;
  connectionActive: boolean;
  /** Équipe en cours de sélection dans le dialogue INT-007 — absent tant que le dialogue n’est pas soumis. */
  requestedTeamId?: string;
};

export function isRetryableError(errorCode: string | null | undefined): boolean {
  if (!errorCode) return false;
  return RETRYABLE_PROVISIONING_ERROR_CODES.has(errorCode);
}

export function isUnknownUnresolved(
  provisioning: ProjectMicrosoftTeamsProvisioningDto | null,
): boolean {
  if (!provisioning) return false;
  return (
    provisioning.status === 'FAILED' &&
    provisioning.errorCode === ERROR_CODE_TEAM_CREATION_OUTCOME_UNKNOWN &&
    !provisioning.resolvedAt
  );
}

export function isConfirmedNotCreated(
  provisioning: ProjectMicrosoftTeamsProvisioningDto | null,
): boolean {
  if (!provisioning) return false;
  return (
    provisioning.errorCode === ERROR_CODE_TEAM_CREATION_CONFIRMED_NOT_CREATED ||
    provisioning.resolutionType === 'CONFIRMED_NOT_CREATED'
  );
}

function isBlockingRun(provisioning: ProjectMicrosoftTeamsProvisioningDto): boolean {
  if (provisioning.status === 'PENDING' || provisioning.status === 'IN_PROGRESS') {
    return true;
  }
  if (provisioning.status === 'PARTIAL' && provisioning.microsoftTeamId) {
    return true;
  }
  if (
    provisioning.status === 'FAILED' &&
    provisioning.errorCode === ERROR_CODE_TEAM_CREATION_OUTCOME_UNKNOWN &&
    !provisioning.resolvedAt
  ) {
    return true;
  }
  return false;
}

export function canStartNewProvisioning(
  provisioning: ProjectMicrosoftTeamsProvisioningDto | null,
  deps: ProvisioningGatingDeps,
): boolean {
  if (!deps.settingsEnabled || !deps.connectionActive) return false;
  if (deps.link?.teamId) return false;
  if (provisioning && isBlockingRun(provisioning)) return false;
  return true;
}

export function canConfigureExistingTeam(
  provisioning: ProjectMicrosoftTeamsProvisioningDto | null,
  deps: ProvisioningGatingDeps,
): boolean {
  if (!deps.connectionActive) return false;

  if (provisioning?.status === 'PENDING' || provisioning?.status === 'IN_PROGRESS') {
    return false;
  }

  const lockedTeamId = provisioning?.microsoftTeamId?.trim();
  if (provisioning?.status === 'PARTIAL' && lockedTeamId) {
    const requested = deps.requestedTeamId?.trim();
    if (!requested) {
      return true;
    }
    return requested === lockedTeamId;
  }

  return true;
}

export function isTeamSelectionAllowedForLockedTeam(
  lockedTeamId: string | null | undefined,
  selectedTeamId: string,
): boolean {
  const locked = lockedTeamId?.trim();
  if (!locked) return true;
  return selectedTeamId.trim() === locked;
}
