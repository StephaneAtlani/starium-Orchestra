import { cn } from '@/lib/utils';
import type { PlatformUserLinkStatus } from '../types/collaborator.types';
import { platformUserLinkStatusLabel } from '../lib/collaborator-label-mappers';

export function PlatformUserLinkBadge({
  status,
  linkedUserEmail,
  linkedUserDisplayName,
  className,
}: {
  status: PlatformUserLinkStatus | undefined;
  linkedUserEmail?: string | null;
  linkedUserDisplayName?: string | null;
  className?: string;
}) {
  if (!status) return null;

  const label = platformUserLinkStatusLabel(status, {
    email: linkedUserEmail,
    displayName: linkedUserDisplayName,
  });

  const isRequired = status === 'LINK_REQUIRED';

  return (
    <span
      className={cn(
        'starium-ds-badge max-w-[14rem]',
        isRequired ? 'starium-ds-badge--warn' : 'starium-ds-badge--success',
        className,
      )}
      title={
        isRequired
          ? 'Compte Starium à rattacher pour le SSO'
          : linkedUserEmail
            ? `Compte Starium lié : ${linkedUserEmail}`
            : 'Compte Starium lié'
      }
    >
      <span className="truncate">{label}</span>
    </span>
  );
}
