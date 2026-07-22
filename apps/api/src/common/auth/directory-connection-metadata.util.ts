import { Prisma } from '@prisma/client';

type ConnectionLike = { metadata: Prisma.JsonValue | null };

export function readConnectionMetadata(
  connection: ConnectionLike,
): Record<string, unknown> {
  const raw = connection.metadata;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return { ...(raw as Record<string, unknown>) };
}

export function isAutoProvisionUsersEnabled(connection: ConnectionLike): boolean {
  const metadata = readConnectionMetadata(connection);
  return metadata.autoProvisionUsers === true;
}

export function mergeAutoProvisionUsersMetadata(
  existing: Prisma.JsonValue | null,
  autoProvisionUsers: boolean,
): Prisma.InputJsonValue {
  const base = readConnectionMetadata({ metadata: existing });
  return { ...base, autoProvisionUsers } as Prisma.InputJsonValue;
}

export type DirectoryProvisioningThresholds = {
  maxUsersCreatedPerRun: number;
  allowedEmailDomains: string[] | null;
  stopOnThresholdExceeded: boolean;
};

const DEFAULT_MAX_USERS_CREATED_PER_RUN = 50;

export function readDirectoryProvisioningThresholds(
  connection: ConnectionLike,
): DirectoryProvisioningThresholds {
  const metadata = readConnectionMetadata(connection);
  const maxRaw = metadata.maxUsersCreatedPerRun;
  const maxUsersCreatedPerRun =
    typeof maxRaw === 'number' && Number.isFinite(maxRaw) && maxRaw > 0
      ? Math.floor(maxRaw)
      : DEFAULT_MAX_USERS_CREATED_PER_RUN;
  const domainsRaw = metadata.allowedEmailDomains;
  const allowedEmailDomains = Array.isArray(domainsRaw)
    ? domainsRaw
        .filter((d): d is string => typeof d === 'string')
        .map((d) => d.trim().toLowerCase())
        .filter(Boolean)
    : null;
  return {
    maxUsersCreatedPerRun,
    allowedEmailDomains: allowedEmailDomains?.length ? allowedEmailDomains : null,
    stopOnThresholdExceeded: metadata.stopOnThresholdExceeded !== false,
  };
}

export function isEmailDomainAllowedForProvisioning(
  email: string,
  allowedEmailDomains: string[] | null,
): boolean {
  if (!allowedEmailDomains || allowedEmailDomains.length === 0) return true;
  const domain = email.split('@')[1]?.trim().toLowerCase();
  if (!domain) return false;
  return allowedEmailDomains.includes(domain);
}
