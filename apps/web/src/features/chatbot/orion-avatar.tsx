'use client';

import Image from 'next/image';
import {
  orionPersonalitySrcAtSize,
  type OrionPersonalityId,
} from '@/lib/orion-assets';
import { cn } from '@/lib/utils';

const ORION_AVATAR_SIZES = {
  xs: { px: 28, className: 'h-7 w-7' },
  sm: { px: 40, className: 'h-10 w-10' },
  md: { px: 48, className: 'h-12 w-12' },
  lg: { px: 80, className: 'h-20 w-20' },
  launch: { px: 56, className: 'h-14 w-14' },
} as const;

export type OrionAvatarSize = keyof typeof ORION_AVATAR_SIZES;

type OrionAvatarProps = {
  personality: OrionPersonalityId;
  size?: OrionAvatarSize;
  className?: string;
  priority?: boolean;
  /** Hero drawer / header ink — force l’asset RGBA transparent. */
  onDark?: boolean;
};

export function OrionAvatar({
  personality,
  size = 'md',
  className,
  priority,
  onDark = false,
}: OrionAvatarProps) {
  const dim = ORION_AVATAR_SIZES[size];
  const sticker = !onDark && personality !== 'normal';
  const src = orionPersonalitySrcAtSize(personality, dim.px);

  const image = (
    <Image
      src={src}
      alt=""
      width={dim.px}
      height={dim.px}
      priority={priority}
      unoptimized
      className={cn(
        'h-full w-full',
        sticker ? 'object-cover scale-[1.08]' : 'object-contain',
        !sticker && dim.className,
        !sticker && className,
      )}
      aria-hidden
    />
  );

  if (sticker) {
    return (
      <span
        className={cn(
          'inline-flex shrink-0 overflow-hidden rounded-full',
          dim.className,
          className,
        )}
      >
        {image}
      </span>
    );
  }

  return image;
}
