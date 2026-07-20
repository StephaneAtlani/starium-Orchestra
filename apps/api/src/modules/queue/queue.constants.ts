export const EMAIL_QUEUE_NAME = 'email';
export const LICENSE_EXPIRATION_QUEUE_NAME = 'license-expiration';
export const LICENSE_EXPIRATION_SCAN_JOB = 'license_expiration_scan';
export const PROJECT_MICROSOFT_TEAMS_PROVISIONING_QUEUE_NAME =
  'project-microsoft-teams-provisioning';
export const PROJECT_MICROSOFT_TEAMS_PROVISIONING_JOB =
  'project_microsoft_teams_provisioning';
export const PROJECT_MICROSOFT_TEAMS_PROVISIONING_STALE_MAINTENANCE_JOB =
  'project_microsoft_teams_provisioning_stale_maintenance';
export const PROJECT_MICROSOFT_TEAMS_PROVISIONING_STALE_MAINTENANCE_SCHEDULER_ID =
  'project_ms_teams_provisioning_stale_maintenance_v1';

export const QUEUE_CONNECTION = Symbol('QUEUE_CONNECTION');
export const EMAIL_QUEUE = Symbol('EMAIL_QUEUE');
export const LICENSE_EXPIRATION_QUEUE = Symbol('LICENSE_EXPIRATION_QUEUE');
export const PROJECT_MICROSOFT_TEAMS_PROVISIONING_QUEUE = Symbol(
  'PROJECT_MICROSOFT_TEAMS_PROVISIONING_QUEUE',
);
