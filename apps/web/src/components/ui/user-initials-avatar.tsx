'use client';

import { cn } from '@/lib/utils';

/** Pastel + texte foncé (mockup portefeuille / fiche projet). */
const INITIALS_AVATAR_THEMES = [
  'bg-orange-100 text-orange-900 dark:bg-orange-950/45 dark:text-orange-200',
  'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/45 dark:text-emerald-200',
  'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/45 dark:text-indigo-200',
  'bg-rose-100 text-rose-900 dark:bg-rose-950/45 dark:text-rose-200',
  'bg-amber-100 text-amber-900 dark:bg-amber-950/45 dark:text-amber-200',
  'bg-sky-100 text-sky-800 dark:bg-sky-950/45 dark:text-sky-200',
] as const;

const SIZE_CLASSES = {
  sm: 'size-8 text-[10px]',
  md: 'size-10 text-[11px]',
  lg: 'size-12 text-sm',
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
    hash = (hash + seed.charCodeAt(i) * (i + 1)) % INITIALS_AVATAR_THEMES.length;
  }
  return hash;
}

export type UserInitialsAvatarProps = {
  displayName: string;
  /** Couleur stable (ex. userId) — sinon dérivée du nom. */
  seed?: string;
  imageUrl?: string | null;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
  title?: string;
};

export function UserInitialsAvatar({
  displayName,
  seed,
  imageUrl,
  size = 'md',
  className,
  title,
}: UserInitialsAvatarProps) {
  const initials = formatDisplayNameInitials(displayName);
  const theme = INITIALS_AVATAR_THEMES[themeIndexFromSeed(seed ?? displayName)];
  const label = title ?? displayName;

  if (imageUrl) {
    return (
      <span
        className={cn(
          'inline-flex shrink-0 overflow-hidden rounded-full border-2 border-card bg-card',
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
        'inline-flex shrink-0 items-center justify-center rounded-full border-2 border-card font-bold tracking-tight',
        SIZE_CLASSES[size],
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
      className={cn('flex items-center justify-center -space-x-3', className)}
      aria-label={listLabel ?? `${members.length} personnes`}
    >
      {visible.map((member) => (
        <li key={member.id} className="relative">
          <UserInitialsAvatar
            displayName={member.displayName}
            seed={member.seed ?? member.id}
            imageUrl={member.imageUrl}
            size={size}
            title={member.displayName}
          />
        </li>
      ))}
    </ul>
  );
}
