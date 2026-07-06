'use client';

import { cn } from '@/lib/utils';

/** Palette refonte portail (av-1 … av-6). */
const AVATAR_THEME_CLASSES = [
  'starium-avatar-chip--1',
  'starium-avatar-chip--2',
  'starium-avatar-chip--3',
  'starium-avatar-chip--4',
  'starium-avatar-chip--5',
  'starium-avatar-chip--6',
] as const;

const SIZE_CLASSES = {
  sm: 'size-8 text-[10px] border-2 border-[color:var(--neutral-0,#fff)]',
  md: 'size-10 text-[11px] border-2 border-[color:var(--neutral-0,#fff)]',
  lg: 'starium-avatar-chip text-[15px] font-bold',
} as const;

export function formatDisplayNameInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
}

function themeIndexFromSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash + seed.charCodeAt(i) * (i + 1)) % AVATAR_THEME_CLASSES.length;
  }
  return hash;
}

export type UserInitialsAvatarProps = {
  displayName: string;
  seed?: string;
  themeIndex?: number;
  imageUrl?: string | null;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
  title?: string;
};

export function UserInitialsAvatar({
  displayName,
  seed,
  themeIndex,
  imageUrl,
  size = 'md',
  className,
  title,
}: UserInitialsAvatarProps) {
  const initials = formatDisplayNameInitials(displayName);
  const theme =
    AVATAR_THEME_CLASSES[
      themeIndex ?? themeIndexFromSeed(seed ?? displayName)
    ] ?? AVATAR_THEME_CLASSES[0];
  const label = title ?? displayName;

  if (imageUrl) {
    return (
      <span
        className={cn(
          'inline-flex shrink-0 overflow-hidden rounded-full border-card bg-card',
          SIZE_CLASSES[size],
          className,
        )}
        title={label}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- avatar URL externe ou blob */}
        <img src={imageUrl} alt="" className="size-full object-cover" />
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-bold tracking-tight',
        size !== 'lg' && SIZE_CLASSES[size],
        size === 'lg' && SIZE_CLASSES.lg,
        theme,
        className,
      )}
      title={label}
    >
      {initials}
    </span>
  );
}

export type UserInitialsAvatarStackMember = {
  id: string;
  displayName: string;
  seed?: string;
  themeIndex?: number;
  imageUrl?: string | null;
};

export function UserInitialsAvatarStack({
  members,
  max = 4,
  size = 'md',
  className,
  listLabel,
}: {
  members: UserInitialsAvatarStackMember[];
  max?: number;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
  listLabel?: string;
}) {
  const visible = members.slice(0, max);

  if (visible.length === 0) return null;

  return (
    <ul
      className={cn('flex items-center justify-center', className)}
      aria-label={listLabel ?? `${members.length} personnes`}
    >
      {visible.map((member, index) => (
        <li key={member.id} className="relative">
          <UserInitialsAvatar
            displayName={member.displayName}
            seed={member.seed ?? member.id}
            themeIndex={member.themeIndex ?? index}
            imageUrl={member.imageUrl}
            size={size}
            title={member.displayName}
          />
        </li>
      ))}
    </ul>
  );
}
