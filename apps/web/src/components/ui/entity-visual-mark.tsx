'use client';

import type { CSSProperties } from 'react';
import type { EntityVisual } from '@starium-orchestra/types';
import { cn } from '@/lib/utils';
import { iconForVisual } from '@/lib/visual-library/visual-icon-registry';
import { colorsForVisual } from '@/lib/visual-library/visual-token-registry';

type EntityVisualMarkProps = {
  visual: EntityVisual | null | undefined;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const SIZE_CLASS: Record<NonNullable<EntityVisualMarkProps['size']>, string> = {
  sm: 'size-8 rounded-md',
  md: 'size-9 rounded-lg',
  lg: 'size-11 rounded-xl',
};

const ICON_SIZE_CLASS: Record<NonNullable<EntityVisualMarkProps['size']>, string> = {
  sm: 'size-4',
  md: 'size-4',
  lg: 'size-5',
};

export function entityVisualMarkStyle(visual: EntityVisual | null | undefined): CSSProperties {
  const { accentColor, surfaceColor } = colorsForVisual(visual);
  return {
    backgroundColor: surfaceColor,
    color: accentColor,
  };
}

export function EntityVisualMark({
  visual,
  label,
  size = 'md',
  className,
}: EntityVisualMarkProps) {
  const Icon = iconForVisual(visual);

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center border border-border/70',
        SIZE_CLASS[size],
        className,
      )}
      style={entityVisualMarkStyle(visual)}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      title={label}
    >
      <Icon className={ICON_SIZE_CLASS[size]} strokeWidth={1.75} />
    </span>
  );
}
