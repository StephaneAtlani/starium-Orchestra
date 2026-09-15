'use client';

import type { ReactNode } from 'react';
import { displayLabel } from '@/lib/display-label';
import { cn } from '@/lib/utils';
import { splitAxisLogoAndTitle } from '../lib/strategic-vision-tabs-view';
import {
  STRATEGIC_AXIS_ICONS,
  isStrategicAxisIconColor,
  isStrategicAxisIconKey,
  strategicAxisIconColorClass,
  type StrategicAxisIconColor,
} from './strategic-axis-icons';

/** Token `[icon:rocket;color:amber]` (éventuellement en milieu de chaîne). */
export const STRATEGIC_AXIS_ICON_TOKEN_RE =
  /\[icon:([a-z0-9_-]+)(?:;color:([a-z0-9_-]+))?\]\s*/gi;

/** Libellé métier sans token icon — aria-label, title, toasts, selects texte. */
export function axisDisplayTitle(
  name: string | null | undefined,
  fallback = 'Axe',
): string {
  const raw = displayLabel(name, fallback);
  const stripped = raw.replace(STRATEGIC_AXIS_ICON_TOKEN_RE, '').replace(/\s+/g, ' ').trim();
  if (stripped) return stripped;
  return splitAxisLogoAndTitle(raw).title || fallback;
}

function parseAxisIconMarkup(text: string, iconClassName: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = new RegExp(STRATEGIC_AXIS_ICON_TOKEN_RE.source, 'gi');
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const iconKey = match[1];
    const colorRaw = match[2] ?? 'auto';
    if (isStrategicAxisIconKey(iconKey)) {
      const Icon = STRATEGIC_AXIS_ICONS[iconKey];
      const color: StrategicAxisIconColor = isStrategicAxisIconColor(colorRaw)
        ? colorRaw
        : 'auto';
      nodes.push(
        <Icon
          key={`axis-ico-${key++}`}
          className={cn(iconClassName, strategicAxisIconColorClass(color))}
          aria-hidden
        />,
      );
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }
  if (nodes.length === 0) {
    nodes.push(text);
  }
  return nodes;
}

/** Affiche un nom d’axe (ou texte contenant un token) avec icône Lucide + couleur. */
export function StrategicAxisNameLabel({
  name,
  fallback = 'Axe',
  className,
  iconClassName = 'size-3.5 shrink-0',
}: {
  name: string | null | undefined;
  fallback?: string;
  className?: string;
  iconClassName?: string;
}) {
  const raw = displayLabel(name, fallback);
  return (
    <span className={cn('inline-flex max-w-full items-center gap-1.5 min-w-0', className)}>
      <span className="inline-flex min-w-0 flex-wrap items-center gap-1.5">
        {parseAxisIconMarkup(raw, iconClassName)}
      </span>
    </span>
  );
}
