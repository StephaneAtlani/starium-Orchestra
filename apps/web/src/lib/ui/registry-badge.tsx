'use client';

import type { ComponentProps } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/**
 * Pastille normalisée : pas de chrome `outline`/`secondary` qui entre en conflit avec
 * les classes du registre (`badgeClassForStyle`, `*.className` fusionné).
 */
export function RegistryBadge({
  className,
  ...props
}: ComponentProps<typeof Badge>) {
  return (
    <Badge variant="registry" className={cn('font-normal', className)} {...props} />
  );
}
