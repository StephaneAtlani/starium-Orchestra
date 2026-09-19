'use client';

import { UserInitialsAvatar } from '@/components/ui/user-initials-avatar';
import { cn } from '@/lib/utils';
import { useMemberAvatarUrl } from '../hooks/use-member-avatar-url';

export function MemberAvatar({
  userId,
  displayName,
  hasAvatar,
  size = 'md',
  className,
}: {
  userId: string;
  displayName: string;
  hasAvatar?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const imageUrl = useMemberAvatarUrl(userId, Boolean(hasAvatar));

  return (
    <UserInitialsAvatar
      displayName={displayName}
      seed={userId}
      imageUrl={imageUrl}
      size={size}
      title={displayName}
      className={cn('shadow-sm ring-1 ring-border/40', className)}
    />
  );
}
